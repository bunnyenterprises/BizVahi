"""
Business Vahi SQLite Database Layer
================================
Provides the same interface as MongoDB (motor) so all existing
routes work without changes. Data is stored in a local SQLite file.

Usage:
    from database_sqlite import SQLiteDB, init_db
    db = SQLiteDB()

    # Works exactly like MongoDB:
    await db.biz_sales.insert_one(doc)
    await db.biz_sales.find({"user_id": x}).sort("created_at", -1).to_list(100)
    await db.users.find_one({"email": email})
    await db.users.update_one({"id": uid}, {"$set": {"name": "New"}})
    await db.users.count_documents({"is_admin": True})
"""

import json
import os
import re
import logging
from typing import Optional, List, Dict, Any

import aiosqlite

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "bizvahi.db"))

# All collections used across the app
TABLES = [
    "users", "biz_sales", "biz_inventory", "biz_expenses", "biz_customers",
    "biz_invoices", "biz_invoice_counters", "biz_settings", "biz_purchases",
    "khata_entries", "cash_opening", "cash_entries", "login_attempts",
    "tutorials", "excel_functions", "reviews", "app_settings",
    "chat_sessions", "chat_messages", "formula_generations",
    "formula_generations", "bookmarks",
]

async def init_db():
    """Create all tables and indexes on first run."""
    async with aiosqlite.connect(DB_PATH) as db:
        for table in set(TABLES):
            await db.execute(f"""
                CREATE TABLE IF NOT EXISTS "{table}" (
                    id       TEXT,
                    user_id  TEXT,
                    email    TEXT,
                    date     TEXT,
                    created_at TEXT,
                    data     TEXT NOT NULL
                )
            """)
            await db.execute(f'CREATE UNIQUE INDEX IF NOT EXISTS "idx_{table}_id" ON "{table}"(id) WHERE id IS NOT NULL AND id != ""')
            await db.execute(f'CREATE INDEX IF NOT EXISTS "idx_{table}_user" ON "{table}"(user_id)')
            await db.execute(f'CREATE INDEX IF NOT EXISTS "idx_{table}_email" ON "{table}"(email)')
            await db.execute(f'CREATE INDEX IF NOT EXISTS "idx_{table}_date" ON "{table}"(date)')
            await db.execute(f'CREATE INDEX IF NOT EXISTS "idx_{table}_cat" ON "{table}"(created_at)')
        await db.commit()
    logger.info("SQLite database initialised at %s", DB_PATH)

# ─── Filter matching (Python-side) ────────────────────────────────────────────

def _matches(doc: dict, filt: dict) -> bool:
    """Return True if doc satisfies a MongoDB-style filter dict."""
    if not filt:
        return True
    for key, val in filt.items():
        if key == "$or":
            if not any(_matches(doc, sub) for sub in val):
                return False
        elif key == "$and":
            if not all(_matches(doc, sub) for sub in val):
                return False
        elif key == "$expr":
            pass  # Skip complex expressions
        elif isinstance(val, dict) and any(k.startswith("$") for k in val):
            dv = doc.get(key)
            for op, ov in val.items():
                if op == "$gte":
                    if dv is None or str(dv) < str(ov):
                        return False
                elif op == "$lte":
                    if dv is None or str(dv) > str(ov):
                        return False
                elif op == "$lt":
                    if dv is None or str(dv) >= str(ov):
                        return False
                elif op == "$gt":
                    if dv is None or str(dv) <= str(ov):
                        return False
                elif op == "$ne":
                    if dv == ov:
                        return False
                elif op == "$in":
                    if dv not in ov:
                        return False
                elif op == "$nin":
                    if dv in ov:
                        return False
                elif op == "$regex":
                    flags = val.get("$options", "")
                    rf = re.IGNORECASE if "i" in flags else 0
                    if not (dv and re.search(ov, str(dv), rf)):
                        return False
        else:
            if doc.get(key) != val:
                return False
    return True

def _apply_update(doc: dict, update: dict) -> dict:
    """Apply a MongoDB-style update operation to a doc."""
    doc = dict(doc)
    if "$set" in update:
        doc.update(update["$set"])
    if "$inc" in update:
        for k, v in update["$inc"].items():
            doc[k] = doc.get(k, 0) + v
    if "$push" in update:
        for k, v in update["$push"].items():
            if k not in doc or not isinstance(doc[k], list):
                doc[k] = []
            doc[k].append(v)
    if "$unset" in update:
        for k in update["$unset"]:
            doc.pop(k, None)
    return doc

# ─── Collection ───────────────────────────────────────────────────────────────

class Collection:
    def __init__(self, table: str):
        self.table = table

    # ── Internal helpers ──────────────────────────────────────────────────

    async def _rows(self, filt: Optional[dict]) -> List[dict]:
        """Load docs from SQLite, apply Python-side filter."""
        # Fast SQL pre-filter for indexed columns
        where_parts, params = [], []

        remaining = {}
        for key, val in (filt or {}).items():
            if key in ("id", "user_id", "email") and isinstance(val, str):
                where_parts.append(f'"{key}" = ?')
                params.append(val)
            else:
                remaining[key] = val

        sql = f'SELECT data FROM "{self.table}"'
        if where_parts:
            sql += " WHERE " + " AND ".join(where_parts)

        docs = []
        async with aiosqlite.connect(DB_PATH) as conn:
            conn.row_factory = aiosqlite.Row
            async with conn.execute(sql, params) as cur:
                rows = await cur.fetchall()
        for row in rows:
            try:
                doc = json.loads(row[0])
                if not remaining or _matches(doc, remaining):
                    docs.append(doc)
            except Exception as e:
                logger.debug("Row parse error in %s: %s", self.table, e)
        return docs

    async def _write(self, doc: dict, conn):
        doc_copy = {k: v for k, v in doc.items() if k != "_id"}
        data = json.dumps(doc_copy, default=str, ensure_ascii=False)
        await conn.execute(
            f'INSERT OR REPLACE INTO "{self.table}" (id, user_id, email, date, created_at, data) VALUES (?,?,?,?,?,?)',
            (
                doc_copy.get("id", ""),
                doc_copy.get("user_id", ""),
                doc_copy.get("email", ""),
                doc_copy.get("date", ""),
                doc_copy.get("created_at", ""),
                data,
            ),
        )

    # ── Public API ────────────────────────────────────────────────────────

    def find(self, filt=None, projection=None) -> _Cursor:
        import asyncio

        class LazyCursor:
            def __init__(self_, f, p):
                self_._f = f
                self_._p = p
                self_._sort_key = None
                self_._sort_dir = -1
                self_._limit_n = None
                self_._skip_n = 0

            def sort(self_, key, direction=-1):
                if isinstance(key, list):
                    self_._sort_key, self_._sort_dir = key[0]
                else:
                    self_._sort_key, self_._sort_dir = key, direction
                return self_

            def limit(self_, n):
                self_._limit_n = n
                return self_

            def skip(self_, n):
                self_._skip_n = n
                return self_

            async def to_list(self_, length=None):
                docs = await self._rows(self_._f)
                if self_._sort_key:
                    docs.sort(key=lambda d: str(d.get(self_._sort_key, "")), reverse=(self_._sort_dir == -1))
                if self_._skip_n:
                    docs = docs[self_._skip_n:]
                cap = self_._limit_n if self_._limit_n is not None else length
                return docs[:cap] if cap is not None else docs

        return LazyCursor(filt, projection)

    async def find_one(self, filt=None, projection=None):
        docs = await self._rows(filt)
        if not docs:
            return None
        doc = docs[0]
        if projection:
            doc = {k: v for k, v in doc.items() if projection.get(k, 1) and k != "_id"}
        return doc

    async def insert_one(self, doc: dict):
        async with aiosqlite.connect(DB_PATH) as conn:
            await self._write(doc, conn)
            await conn.commit()
        return type("R", (), {"inserted_id": doc.get("id")})()

    async def insert_many(self, docs: List[dict]):
        async with aiosqlite.connect(DB_PATH) as conn:
            for doc in docs:
                await self._write(doc, conn)
            await conn.commit()
        return type("R", (), {"inserted_count": len(docs)})()

    async def update_one(self, filt: dict, update: dict, upsert: bool = False):
        docs = await self._rows(filt)
        if not docs:
            if upsert:
                new_doc = {k: v for k, v in filt.items() if not k.startswith("$") and isinstance(v, str)}
                new_doc = _apply_update(new_doc, update)
                await self.insert_one(new_doc)
                return type("R", (), {"matched_count": 0, "upserted_id": new_doc.get("id")})()
            return type("R", (), {"matched_count": 0})()
        doc = _apply_update(docs[0], update)
        async with aiosqlite.connect(DB_PATH) as conn:
            await self._write(doc, conn)
            await conn.commit()
        return type("R", (), {"matched_count": 1})()

    async def update_many(self, filt: dict, update: dict):
        docs = await self._rows(filt)
        async with aiosqlite.connect(DB_PATH) as conn:
            for doc in docs:
                updated = _apply_update(doc, update)
                await self._write(updated, conn)
            await conn.commit()
        return type("R", (), {"matched_count": len(docs)})()

    async def replace_one(self, filt: dict, doc: dict, upsert: bool = False):
        existing = await self._rows(filt)
        if existing or upsert:
            async with aiosqlite.connect(DB_PATH) as conn:
                await self._write(doc, conn)
                await conn.commit()
        return type("R", (), {"matched_count": len(existing)})()

    async def find_one_and_update(self, filt: dict, update: dict, upsert: bool = False, return_document: bool = False):
        await self.update_one(filt, update, upsert=upsert)
        docs = await self._rows(filt)
        return docs[0] if docs else None

    async def delete_one(self, filt: dict):
        docs = await self._rows(filt)
        if not docs:
            return type("R", (), {"deleted_count": 0})()
        doc_id = docs[0].get("id", "")
        async with aiosqlite.connect(DB_PATH) as conn:
            await conn.execute(f'DELETE FROM "{self.table}" WHERE id = ?', (doc_id,))
            await conn.commit()
        return type("R", (), {"deleted_count": 1})()

    async def delete_many(self, filt: dict):
        docs = await self._rows(filt)
        if not docs:
            return type("R", (), {"deleted_count": 0})()
        ids = [d.get("id", "") for d in docs]
        async with aiosqlite.connect(DB_PATH) as conn:
            for doc_id in ids:
                await conn.execute(f'DELETE FROM "{self.table}" WHERE id = ?', (doc_id,))
            await conn.commit()
        return type("R", (), {"deleted_count": len(ids)})()

    async def count_documents(self, filt=None):
        docs = await self._rows(filt)
        return len(docs)

    async def create_index(self, *args, **kwargs):
        pass  # Basic indexes already created in init_db()

# ─── Database ─────────────────────────────────────────────────────────────────

class SQLiteDB:
    """
    Drop-in replacement for motor AsyncIOMotorDatabase.
    Access collections as attributes: db.users, db.biz_sales, etc.
    """

    def __init__(self):
        self._cols: Dict[str, Collection] = {}

    def __getattr__(self, name: str) -> Collection:
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._cols:
            self._cols[name] = Collection(name)
        return self._cols[name]

    def get_collection(self, name: str) -> Collection:
        return Collection(name)
