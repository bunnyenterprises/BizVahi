from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
load_dotenv()  # Load .env first before anything else
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from auth import hash_password, verify_password, create_token, get_current_user_id
from seed_data import EXCEL_FUNCTIONS, TUTORIALS
from admin import build_admin_router, ADMIN_EMAIL, get_settings
from business import build_business_router
from khata import build_khata_router
from gst import build_gst_router
from security import (
    SecurityHeadersMiddleware, is_account_locked,
    record_failed_login, clear_failed_logins,
    validate_password, is_rate_limited,
    MAX_FAILED_ATTEMPTS, sanitize, sanitize_email,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ── Environment Variables ─────────────────────────────────────────────────────
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("❌ MONGO_URL environment variable is not set. Add it to Railway Variables.")

db_name = os.environ.get('DB_NAME', 'bizvahi')
EMERGENT_LLM_KEY = os.environ.get('GROQ_API_KEY') or ''
# ADMIN_EMAIL is imported from admin.py above (line 16) — it already has the correct
# fallback default. Do NOT redefine it here; an earlier version did, with a blank-string
# fallback that silently broke admin auto-promotion whenever the Railway env var wasn't set.

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class ChatMessageRequest(BaseModel):
    content: str
    session_id: Optional[str] = None

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"

# ============= AUTH =============
def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "is_admin": bool(user.get("is_admin")) or user.get("email", "").lower() == ADMIN_EMAIL,
        "is_pro": bool(user.get("is_pro")),
        "pro_since": user.get("pro_since"),
    }

@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    try:
        clean_email = sanitize_email(req.email)
        clean_name = sanitize(req.name, max_len=100)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    pw_error = validate_password(req.password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)
    existing = await db.users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    is_admin = clean_email == ADMIN_EMAIL
    user_doc = {
        "id": user_id,
        "email": clean_email,
        "name": clean_name,
        "password_hash": hash_password(req.password),
        "is_admin": is_admin,
        "is_pro": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return AuthResponse(token=token, user=public_user(user_doc))

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest, request: Request):
    client_ip = request.client.host or "unknown"

    # IP-level rate limit: 10 login attempts per minute per IP
    if await is_rate_limited(f"login:{client_ip}", max_calls=10, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please wait a minute and try again."
        )

    # Account-level lockout check
    locked, minutes_left = await is_account_locked(db, req.email)
    if locked:
        raise HTTPException(
            status_code=429,
            detail=f"Account locked after too many failed attempts. Try again in {minutes_left} minute(s)."
        )

    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        count = await record_failed_login(db, req.email)
        remaining = max(0, MAX_FAILED_ATTEMPTS - count)
        detail = "Invalid email or password"
        if remaining > 0:
            detail += f". {remaining} attempt(s) left before account is locked."
        raise HTTPException(status_code=401, detail=detail)

    # Successful login — clear lockout record
    await clear_failed_logins(db, req.email)

    if not user.get("is_admin") and user.get("email", "").lower() == ADMIN_EMAIL:
        await db.users.update_one({"id": user["id"]}, {"$set": {"is_admin": True}})
        user["is_admin"] = True

    token = create_token(user["id"])
    return AuthResponse(token=token, user=public_user(user))

@api_router.get("/auth/me")
async def me(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return public_user(user)

# ============= ROOT =============
@api_router.get("/")
async def root():
    return {"message": "FINTR API", "status": "ok"}

# ============= HEALTH CHECK =============
# Must be registered BEFORE the catch-all static route below
@app.get("/health")
async def health():
    return {"status": "ok", "app": "Business Vahi", "version": "1.0"}

# Mount admin/payments/reviews routes under /api
api_router.include_router(build_admin_router(db))

# Mount business module routes under /api
api_router.include_router(build_business_router(db, EMERGENT_LLM_KEY or ""))

# Mount khata / purchases / cashbook routes under /api
api_router.include_router(build_khata_router(db))

# Mount GST returns routes under /api
api_router.include_router(build_gst_router(db))

# Include main router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers on every response
app.add_middleware(SecurityHeadersMiddleware)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def seed_db():
    await db.users.update_many({"email": ADMIN_EMAIL}, {"$set": {"is_admin": True}})
    needs_reseed = await db.excel_functions.count_documents({}) == 0
    if not needs_reseed:
        sample = await db.excel_functions.find_one({}, {"_id": 0})
        if sample and "visual_example" not in sample:
            needs_reseed = True
    if needs_reseed:
        await db.excel_functions.delete_many({})
        docs = [{**f, "id": str(uuid.uuid4())} for f in EXCEL_FUNCTIONS]
        await db.excel_functions.insert_many(docs)
        logger.info(f"Seeded {len(docs)} Excel functions")
    if await db.tutorials.count_documents({}) == 0:
        docs = [{**t, "id": str(uuid.uuid4())} for t in TUTORIALS]
        await db.tutorials.insert_many(docs)
        logger.info(f"Seeded {len(docs)} tutorials")
    await get_settings(db)
    # Create MongoDB indexes for performance + security
    await db.login_attempts.create_index("email", unique=True)
    await db.login_attempts.create_index("last_attempt", expireAfterSeconds=86400)  # auto-expire after 24h
    await db.biz_sales.create_index([("user_id", 1), ("created_at", -1)])
    await db.biz_inventory.create_index([("user_id", 1), ("product_name", 1)])
    await db.biz_expenses.create_index([("user_id", 1), ("created_at", -1)])
    await db.biz_customers.create_index([("user_id", 1), ("name", 1)])
    await db.biz_invoices.create_index([("user_id", 1), ("created_at", -1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ── Serve React frontend (for Replit / single-server deployment) ──────────────
# After `yarn build`, copy frontend/build → backend/static
# FastAPI serves the built files so everything runs on one port
import os as _os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse as _FileResponse

_BUILD = _os.path.join(_os.path.dirname(__file__), "static")

if _os.path.exists(_BUILD):
    # Serve React's js/css/media assets
    _static_assets = _os.path.join(_BUILD, "static")
    if _os.path.exists(_static_assets):
        app.mount("/static", StaticFiles(directory=_static_assets), name="react-static")

    # All non-API routes → React's index.html (handles React Router)
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        _index = _os.path.join(_BUILD, "index.html")
        if _os.path.exists(_index):
            return _FileResponse(_index)
        return {"error": "Frontend not built. Run: cd frontend && yarn build && cp -r build ../backend/static"}
