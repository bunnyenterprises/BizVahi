"""Admin, reviews, settings, payments, and bookmarks router."""
import os
import uuid
import hmac
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import get_current_user_id

logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "rajel.chavan6@gmail.com").lower()

# ============= MODELS =============
class SettingsUpdate(BaseModel):
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    google_review_url: Optional[str] = None
    pro_price_inr: Optional[int] = None
    free_daily_chat_limit: Optional[int] = None

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=1, max_length=1000)

class CreateOrderRequest(BaseModel):
    plan: str = "pro_monthly"

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class BookmarkRequest(BaseModel):
    item_type: str  # "function" or "tutorial"
    item_id: str

# ============= HELPERS =============
DEFAULT_SETTINGS = {
    "razorpay_key_id": "",
    "razorpay_key_secret": "",
    "google_review_url": "",
    "pro_price_inr": 299,
    "free_daily_chat_limit": 5,
}

async def get_settings(db: AsyncIOMotorDatabase) -> dict:
    s = await db.app_settings.find_one({"_id": "singleton"}, {"_id": 0})
    if not s:
        await db.app_settings.insert_one({"_id": "singleton", **DEFAULT_SETTINGS})
        s = DEFAULT_SETTINGS.copy()
    for k, v in DEFAULT_SETTINGS.items():
        s.setdefault(k, v)
    return s

async def require_admin(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("is_admin") and user.get("email", "").lower() != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    if not user.get("is_admin") and user.get("email", "").lower() == ADMIN_EMAIL:
        await db.users.update_one({"id": user_id}, {"$set": {"is_admin": True}})
        user["is_admin"] = True
    return user

def build_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter()

    # ------- ADMIN: Stats -------
    @router.get("/admin/stats")
    async def get_admin_stats(user_id: str = Depends(get_current_user_id)):
        await require_admin(db, user_id)
        total_users = await db.users.count_documents({})
        pro_users = await db.users.count_documents({"is_pro": True})
        total_chats = await db.chat_messages.count_documents({"role": "user"})
        total_reviews = await db.reviews.count_documents({})
        avg_rating_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
        avg_cur = await db.reviews.find({}, {"rating": 1, "_id": 0}).to_list(1000)
        avg_rating = round(sum(d.get("rating", 0) for d in avg_cur) / len(avg_cur), 2) if avg_cur else 0
        successful_payments = await db.payments.find({"status": "paid"}, {"_id": 0, "amount": 1}).to_list(10000)
        total_revenue_paise = sum(p.get("amount", 0) for p in successful_payments)
        return {
            "total_users": total_users,
            "pro_users": pro_users,
            "free_users": total_users - pro_users,
            "total_chats": total_chats,
            "total_reviews": total_reviews,
            "avg_rating": avg_rating,
            "total_revenue_inr": total_revenue_paise / 100,
        }

    # ------- ADMIN: Users -------
    @router.get("/admin/users")
    async def list_users(user_id: str = Depends(get_current_user_id)):
        await require_admin(db, user_id)
        users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
        return users

    # ------- ADMIN: Reviews -------
    @router.get("/admin/reviews")
    async def admin_list_reviews(user_id: str = Depends(get_current_user_id)):
        await require_admin(db, user_id)
        reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return reviews

    # ------- ADMIN: Settings -------
    @router.get("/admin/settings")
    async def admin_settings(user_id: str = Depends(get_current_user_id)):
        await require_admin(db, user_id)
        return await get_settings(db)

    @router.put("/admin/settings")
    async def update_admin_settings(payload: SettingsUpdate, user_id: str = Depends(get_current_user_id)):
        await require_admin(db, user_id)
        updates = {k: v for k, v in payload.dict().items() if v is not None}
        await db.app_settings.update_one({"_id": "singleton"}, {"$set": updates}, upsert=True)
        return await get_settings(db)

    # ------- PUBLIC: Config -------
    @router.get("/config")
    async def public_config():
        s = await get_settings(db)
        return {
            "razorpay_key_id": s.get("razorpay_key_id", ""),
            "razorpay_configured": bool(s.get("razorpay_key_id") and s.get("razorpay_key_secret")),
            "google_review_url": s.get("google_review_url", ""),
            "pro_price_inr": s.get("pro_price_inr", 299),
            "free_daily_chat_limit": s.get("free_daily_chat_limit", 5),
        }

    # ------- PUBLIC: Reviews -------
    @router.get("/reviews")
    async def list_reviews_public():
        reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
        return reviews

    @router.post("/reviews")
    async def submit_review(req: ReviewCreate, user_id: str = Depends(get_current_user_id)):
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        existing = await db.reviews.find_one({"user_id": user_id})
        now = datetime.now(timezone.utc).isoformat()
        review_doc = {
            "id": existing["id"] if existing else str(uuid.uuid4()),
            "user_id": user_id,
            "user_name": user["name"],
            "rating": req.rating,
            "comment": req.comment,
            "created_at": existing["created_at"] if existing else now,
            "updated_at": now,
        }
        if existing:
            await db.reviews.update_one({"id": existing["id"]}, {"$set": review_doc})
        else:
            await db.reviews.insert_one(review_doc.copy())
        return review_doc

    @router.get("/reviews/me")
    async def my_review(user_id: str = Depends(get_current_user_id)):
        r = await db.reviews.find_one({"user_id": user_id}, {"_id": 0})
        return r or {}

    # ------- BOOKMARKS -------
    @router.get("/bookmarks")
    async def get_bookmarks(user_id: str = Depends(get_current_user_id)):
        bookmarks = await db.bookmarks.find({"user_id": user_id}, {"_id": 0}).to_list(500)
        return bookmarks

    @router.post("/bookmarks")
    async def add_bookmark(req: BookmarkRequest, user_id: str = Depends(get_current_user_id)):
        if req.item_type not in ("function", "tutorial"):
            raise HTTPException(status_code=400, detail="item_type must be 'function' or 'tutorial'")
        existing = await db.bookmarks.find_one({"user_id": user_id, "item_id": req.item_id})
        if existing:
            return {"ok": True, "bookmarked": True}
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "item_type": req.item_type,
            "item_id": req.item_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.bookmarks.insert_one(doc.copy())
        return {"ok": True, "bookmarked": True}

    @router.delete("/bookmarks/{item_id}")
    async def remove_bookmark(item_id: str, user_id: str = Depends(get_current_user_id)):
        await db.bookmarks.delete_one({"user_id": user_id, "item_id": item_id})
        return {"ok": True, "bookmarked": False}

    # ------- PAYMENTS: Razorpay -------
    @router.post("/payments/create-order")
    async def create_order(req: CreateOrderRequest, user_id: str = Depends(get_current_user_id)):
        s = await get_settings(db)
        key_id = s.get("razorpay_key_id")
        key_secret = s.get("razorpay_key_secret")
        if not key_id or not key_secret:
            raise HTTPException(status_code=503, detail="Payments not configured. Admin must add Razorpay keys.")
        amount_inr = s.get("pro_price_inr", 299)
        amount_paise = int(amount_inr) * 100
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            order = client.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1})
        except Exception as e:
            logger.exception("Razorpay order create failed")
            raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")
        await db.payments.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "plan": req.plan,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"order_id": order["id"], "amount": amount_paise, "currency": "INR", "key_id": key_id, "amount_inr": amount_inr}

    @router.post("/payments/verify")
    async def verify_payment(req: VerifyPaymentRequest, user_id: str = Depends(get_current_user_id)):
        s = await get_settings(db)
        key_secret = s.get("razorpay_key_secret")
        if not key_secret:
            raise HTTPException(status_code=503, detail="Payments not configured")
        msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
        expected = hmac.new(key_secret.encode(), msg, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, req.razorpay_signature):
            await db.payments.update_one(
                {"order_id": req.razorpay_order_id, "user_id": user_id},
                {"$set": {"status": "signature_failed"}}
            )
            raise HTTPException(status_code=400, detail="Invalid signature")
        await db.payments.update_one(
            {"order_id": req.razorpay_order_id, "user_id": user_id},
            {"$set": {"status": "paid", "payment_id": req.razorpay_payment_id, "paid_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_pro": True, "pro_since": datetime.now(timezone.utc).isoformat()}}
        )
        return {"ok": True, "is_pro": True}

    return router
