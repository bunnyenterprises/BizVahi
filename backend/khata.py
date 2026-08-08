"""
Business Vahi — Khata, Purchases, Cash Book Module

Khata  : Track credit given to customers (udhaar) and payments received.
         WhatsApp reminder URL generated per customer.
Purchases: Record supplier purchases, auto-update inventory stock.
Business Vahi : Daily cash-in / cash-out ledger with opening & closing balance.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from auth import get_current_user_id

logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ─── Models ───────────────────────────────────────────────────────────────────

class KhataEntry(BaseModel):
    customer_name: str
    customer_id: Optional[str] = None
    type: str                          # "credit" | "payment"
    amount: float = Field(..., gt=0)
    description: Optional[str] = ""
    date: Optional[str] = None

class PurchaseItem(BaseModel):
    name: str
    qty: float
    unit: Optional[str] = "pcs"
    cost_price: float

class PurchaseCreate(BaseModel):
    supplier_name: str
    items: List[PurchaseItem]
    date: Optional[str] = None
    payment_mode: Optional[str] = "Cash"   # Cash | UPI | Credit | Cheque
    notes: Optional[str] = ""
    paid: Optional[bool] = True            # False = supplier credit (you owe them)

class CashEntry(BaseModel):
    date: Optional[str] = None
    type: str                              # "in" | "out"
    amount: float = Field(..., gt=0)
    description: str
    category: Optional[str] = "Other"     # Sale | Purchase | Expense | Payment | Other

class OpeningBalance(BaseModel):
    date: Optional[str] = None
    amount: float = Field(..., ge=0)

# ─── Router Factory ────────────────────────────────────────────────────────────

def build_khata_router(db):
    router = APIRouter(prefix="/khata", tags=["khata"])

    # ── KHATA (UDHAAR) ────────────────────────────────────────────────────────

    @router.get("/entries")
    async def list_khata_entries(user_id: str = Depends(get_current_user_id)):
        entries = await db.khata_entries.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(2000)
        return entries

    @router.post("/entries")
    async def add_khata_entry(req: KhataEntry, user_id: str = Depends(get_current_user_id)):
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "customer_name": req.customer_name.strip(),
            "customer_id": req.customer_id,
            "type": req.type,
            "amount": round(req.amount, 2),
            "description": req.description or "",
            "date": req.date or today_str(),
            "created_at": now_iso(),
        }
        await db.khata_entries.insert_one(doc)
        doc.pop("_id", None)

        # Update customer outstanding if linked
        if req.customer_id:
            delta = req.amount if req.type == "credit" else -req.amount
            await db.biz_customers.update_one(
                {"id": req.customer_id, "user_id": user_id},
                {"$inc": {"outstanding": round(delta, 2)}}
            )

        return doc

    @router.delete("/entries/{entry_id}")
    async def delete_khata_entry(entry_id: str, user_id: str = Depends(get_current_user_id)):
        entry = await db.khata_entries.find_one({"id": entry_id, "user_id": user_id})
        if not entry:
            raise HTTPException(404, "Entry not found")

        # Reverse the customer outstanding update
        if entry.get("customer_id"):
            delta = -entry["amount"] if entry["type"] == "credit" else entry["amount"]
            await db.biz_customers.update_one(
                {"id": entry["customer_id"], "user_id": user_id},
                {"$inc": {"outstanding": round(delta, 2)}}
            )

        await db.khata_entries.delete_one({"id": entry_id, "user_id": user_id})
        return {"deleted": True}

    @router.get("/summary")
    async def khata_summary(user_id: str = Depends(get_current_user_id)):
        """Per-customer outstanding balances with overdue flag."""
        entries = await db.khata_entries.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(5000)

        # Group by customer name
        customers: dict = {}
        for e in entries:
            name = e["customer_name"]
            if name not in customers:
                customers[name] = {
                    "customer_name": name,
                    "customer_id": e.get("customer_id"),
                    "total_credit": 0.0,
                    "total_paid": 0.0,
                    "outstanding": 0.0,
                    "last_credit_date": None,
                    "entries": [],
                }
            if e["type"] == "credit":
                customers[name]["total_credit"] += e["amount"]
                d = e.get("date")
                if d and (not customers[name]["last_credit_date"] or d > customers[name]["last_credit_date"]):
                    customers[name]["last_credit_date"] = d
            else:
                customers[name]["total_paid"] += e["amount"]
            customers[name]["entries"].append(e)

        result = []
        today = today_str()
        for name, c in customers.items():
            c["outstanding"] = round(c["total_credit"] - c["total_paid"], 2)
            c["total_credit"] = round(c["total_credit"], 2)
            c["total_paid"] = round(c["total_paid"], 2)
            # Overdue = outstanding > 0 and last credit > 30 days ago
            if c["outstanding"] > 0 and c["last_credit_date"]:
                days = (
                    datetime.strptime(today, "%Y-%m-%d") -
                    datetime.strptime(c["last_credit_date"], "%Y-%m-%d")
                ).days
                c["overdue"] = days > 30
                c["days_since_credit"] = days
            else:
                c["overdue"] = False
                c["days_since_credit"] = 0
            result.append(c)

        result.sort(key=lambda x: -x["outstanding"])

        total_receivable = round(sum(c["outstanding"] for c in result if c["outstanding"] > 0), 2)
        overdue_count = sum(1 for c in result if c["overdue"])

        return {
            "customers": result,
            "total_receivable": total_receivable,
            "overdue_count": overdue_count,
        }

    # ── PURCHASES ─────────────────────────────────────────────────────────────

    @router.get("/purchases")
    async def list_purchases(user_id: str = Depends(get_current_user_id)):
        return await db.biz_purchases.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)

    @router.post("/purchases")
    async def add_purchase(req: PurchaseCreate, user_id: str = Depends(get_current_user_id)):
        total = round(sum(i.qty * i.cost_price for i in req.items), 2)
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "supplier_name": req.supplier_name.strip(),
            "items": [i.dict() for i in req.items],
            "total": total,
            "date": req.date or today_str(),
            "payment_mode": req.payment_mode or "Cash",
            "paid": req.paid if req.paid is not None else True,
            "notes": req.notes or "",
            "created_at": now_iso(),
        }
        await db.biz_purchases.insert_one(doc)

        # Auto-update inventory quantities
        for item in req.items:
            name_lower = item.name.strip().lower()
            inv_item = await db.biz_inventory.find_one({
                "user_id": user_id,
                "$or": [
                    {"product_name": {"$regex": f"^{item.name.strip()}$", "$options": "i"}},
                ]
            })
            if inv_item:
                # Update quantity and cost price
                await db.biz_inventory.update_one(
                    {"id": inv_item["id"]},
                    {
                        "$inc": {"quantity": item.qty},
                        "$set": {
                            "cost_price": item.cost_price,
                            "updated_at": now_iso(),
                        }
                    }
                )
            # If product not in inventory, create it
            else:
                new_item = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "product_name": item.name.strip(),
                    "category": "General",
                    "quantity": item.qty,
                    "unit": item.unit,
                    "cost_price": item.cost_price,
                    "selling_price": 0.0,
                    "low_stock_alert": 5.0,
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                }
                await db.biz_inventory.insert_one(new_item)

        doc.pop("_id", None)
        return doc

    @router.delete("/purchases/{purchase_id}")
    async def delete_purchase(purchase_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_purchases.delete_one({"id": purchase_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Purchase not found")
        return {"deleted": True}

    @router.get("/purchases/summary")
    async def purchase_summary(user_id: str = Depends(get_current_user_id)):
        from datetime import datetime
        month_start = datetime.now(timezone.utc).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        all_purchases = await db.biz_purchases.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}},
            {"_id": 0}
        ).to_list(1000)

        total = sum(p.get("total", 0) for p in all_purchases)
        unpaid = sum(p.get("total", 0) for p in all_purchases if not p.get("paid"))

        by_supplier: dict = {}
        for p in all_purchases:
            s = p["supplier_name"]
            by_supplier[s] = by_supplier.get(s, 0) + p.get("total", 0)

        return {
            "total_purchases": round(total, 2),
            "unpaid_to_suppliers": round(unpaid, 2),
            "count": len(all_purchases),
            "by_supplier": {k: round(v, 2) for k, v in sorted(by_supplier.items(), key=lambda x: -x[1])},
        }

    # ── CASH BOOK ─────────────────────────────────────────────────────────────

    @router.get("/cashbook")
    async def get_cashbook(
        user_id: str = Depends(get_current_user_id),
        date: str = None,
    ):
        target_date = date or today_str()

        # Opening balance for this date
        ob_doc = await db.cash_opening.find_one(
            {"user_id": user_id, "date": target_date}, {"_id": 0}
        )
        opening_balance = ob_doc.get("amount", 0.0) if ob_doc else 0.0

        # All cash entries for this date
        entries = await db.cash_entries.find(
            {"user_id": user_id, "date": target_date}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)

        cash_in = sum(e["amount"] for e in entries if e["type"] == "in")
        cash_out = sum(e["amount"] for e in entries if e["type"] == "out")
        closing_balance = opening_balance + cash_in - cash_out

        return {
            "date": target_date,
            "opening_balance": round(opening_balance, 2),
            "cash_in": round(cash_in, 2),
            "cash_out": round(cash_out, 2),
            "closing_balance": round(closing_balance, 2),
            "entries": entries,
        }

    @router.post("/cashbook/opening")
    async def set_opening_balance(req: OpeningBalance, user_id: str = Depends(get_current_user_id)):
        target_date = req.date or today_str()
        doc = {
            "user_id": user_id,
            "date": target_date,
            "amount": round(req.amount, 2),
            "updated_at": now_iso(),
        }
        await db.cash_opening.replace_one(
            {"user_id": user_id, "date": target_date}, doc, upsert=True
        )
        return doc

    @router.post("/cashbook/entries")
    async def add_cash_entry(req: CashEntry, user_id: str = Depends(get_current_user_id)):
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "date": req.date or today_str(),
            "type": req.type,
            "amount": round(req.amount, 2),
            "description": req.description.strip(),
            "category": req.category or "Other",
            "created_at": now_iso(),
        }
        await db.cash_entries.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.delete("/cashbook/entries/{entry_id}")
    async def delete_cash_entry(entry_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.cash_entries.delete_one({"id": entry_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Entry not found")
        return {"deleted": True}

    @router.get("/cashbook/history")
    async def cashbook_history(user_id: str = Depends(get_current_user_id)):
        """Last 30 days closing balance history."""
        today = datetime.now(timezone.utc)
        days = []
        for i in range(29, -1, -1):
            d = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            days.append(d)

        result = []
        for d in days:
            ob = await db.cash_opening.find_one({"user_id": user_id, "date": d})
            opening = ob.get("amount", 0.0) if ob else 0.0
            entries = await db.cash_entries.find(
                {"user_id": user_id, "date": d}, {"type": 1, "amount": 1}
            ).to_list(500)
            cash_in = sum(e["amount"] for e in entries if e["type"] == "in")
            cash_out = sum(e["amount"] for e in entries if e["type"] == "out")
            result.append({
                "date": d,
                "opening": round(opening, 2),
                "in": round(cash_in, 2),
                "out": round(cash_out, 2),
                "closing": round(opening + cash_in - cash_out, 2),
            })

        return result

    return router
