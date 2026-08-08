"""
Business Vahi Business Module
Sales, Inventory, Expenses, Customers for Indian small businesses.
Usage in server.py:
  from business import build_business_router
  api_router.include_router(build_business_router(db, EMERGENT_LLM_KEY))
"""
import os
import uuid
import json
import re
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import get_current_user_id

logger = logging.getLogger(__name__)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def this_month_start():
    n = datetime.now(timezone.utc)
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class SaleItem(BaseModel):
    name: str
    qty: float
    price: float  # selling price per unit in ₹

class SaleCreate(BaseModel):
    customer_name: Optional[str] = "Walk-in"
    customer_id: Optional[str] = None
    items: List[SaleItem]
    date: Optional[str] = None
    notes: Optional[str] = ""
    payment_mode: Optional[str] = "Cash"  # Cash | UPI | Credit | Cheque

class InventoryCreate(BaseModel):
    product_name: str
    category: Optional[str] = "General"
    quantity: float
    unit: Optional[str] = "pcs"
    cost_price: Optional[float] = 0.0
    selling_price: Optional[float] = 0.0
    low_stock_alert: Optional[float] = 5.0
    hsn_code: Optional[str] = ""
    gst_rate: Optional[float] = 18.0

class InventoryUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    low_stock_alert: Optional[float] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None

class ExpenseCreate(BaseModel):
    date: Optional[str] = None
    category: str  # Rent | Salary | Utilities | Materials | Transport | Marketing | Other
    amount: float = Field(..., gt=0)
    description: Optional[str] = ""

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""

# ─── Invoice + Settings + AI Models ──────────────────────────────────────────

class InvoiceItem(BaseModel):
    name: str
    hsn: Optional[str] = ""
    qty: float = 1.0
    unit: Optional[str] = "pcs"
    rate: float
    gst_rate: Optional[float] = 18.0  # 0 | 5 | 12 | 18 | 28

class InvoiceCreate(BaseModel):
    buyer_name: str
    buyer_address: Optional[str] = ""
    buyer_gstin: Optional[str] = ""
    buyer_phone: Optional[str] = ""
    items: List[InvoiceItem]
    date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = ""
    is_igst: Optional[bool] = False   # True = inter-state (IGST), False = CGST+SGST
    discount_percent: Optional[float] = 0.0

class BizSettings(BaseModel):
    business_name: Optional[str] = ""
    address: Optional[str] = ""
    gstin: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    state: Optional[str] = ""
    bank_name: Optional[str] = ""
    account_no: Optional[str] = ""
    ifsc: Optional[str] = ""
    upi_id: Optional[str] = ""
    logo_url: Optional[str] = ""

class BusinessQuestion(BaseModel):
    question: str

# ─── Invoice Helpers ──────────────────────────────────────────────────────────

def number_to_words_inr(amount: float) -> str:
    """Convert a rupee amount to Indian words (e.g. 12500 → 'Twelve Thousand Five Hundred Rupees Only')."""
    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ]
    tens_w = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert(n: int) -> str:
        if n == 0: return ""
        if n < 20: return ones[n]
        if n < 100:
            return tens_w[n // 10] + (" " + ones[n % 10] if n % 10 else "")
        return ones[n // 100] + " Hundred" + (" " + convert(n % 100) if n % 100 else "")

    rupees = int(round(amount))
    if rupees == 0:
        return "Zero Rupees Only"
    parts = []
    if rupees >= 10_000_000:
        parts.append(convert(rupees // 10_000_000) + " Crore")
        rupees %= 10_000_000
    if rupees >= 100_000:
        parts.append(convert(rupees // 100_000) + " Lakh")
        rupees %= 100_000
    if rupees >= 1_000:
        parts.append(convert(rupees // 1_000) + " Thousand")
        rupees %= 1_000
    if rupees > 0:
        parts.append(convert(rupees))
    return " ".join(parts) + " Rupees Only"

# ─── Router Factory ────────────────────────────────────────────────────────────

def build_business_router(db, llm_key: str = ""):
    router = APIRouter(prefix="/business", tags=["business"])

    # ── DASHBOARD ─────────────────────────────────────────────────────────────

    @router.get("/dashboard")
    async def get_dashboard(user_id: str = Depends(get_current_user_id)):
        month_start = this_month_start()

        sales = await db.biz_sales.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)

        expenses = await db.biz_expenses.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)

        all_inventory = await db.biz_inventory.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(1000)

        low_stock = [
            i for i in all_inventory
            if i.get("quantity", 0) <= i.get("low_stock_alert", 5)
        ]

        total_customers = await db.biz_customers.count_documents({"user_id": user_id})

        recent_sales = await db.biz_sales.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(5)

        sales_total = sum(s.get("total", 0) for s in sales)
        expenses_total = sum(e.get("amount", 0) for e in expenses)

        # Top products by revenue
        product_totals: dict = {}
        for sale in sales:
            for item in sale.get("items", []):
                name = item.get("name", "Unknown")
                rev = item.get("qty", 0) * item.get("price", 0)
                product_totals[name] = product_totals.get(name, 0) + rev
        top_products = sorted(product_totals.items(), key=lambda x: -x[1])[:3]

        # Expense by category
        exp_by_cat: dict = {}
        for e in expenses:
            cat = e.get("category", "Other")
            exp_by_cat[cat] = exp_by_cat.get(cat, 0) + e.get("amount", 0)

        return {
            "sales_total": round(sales_total, 2),
            "sales_count": len(sales),
            "expenses_total": round(expenses_total, 2),
            "profit_estimate": round(sales_total - expenses_total, 2),
            "total_customers": total_customers,
            "inventory_count": len(all_inventory),
            "low_stock_count": len(low_stock),
            "low_stock_items": [
                {"name": i["product_name"], "quantity": i["quantity"], "unit": i.get("unit", "pcs")}
                for i in low_stock[:5]
            ],
            "recent_sales": recent_sales,
            "top_products": [{"name": p[0], "revenue": round(p[1], 2)} for p in top_products],
            "expense_breakdown": [{"category": k, "amount": round(v, 2)} for k, v in exp_by_cat.items()],
        }

    # ── SALES ─────────────────────────────────────────────────────────────────

    @router.get("/sales")
    async def list_sales(user_id: str = Depends(get_current_user_id)):
        return await db.biz_sales.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)

    @router.post("/sales")
    async def create_sale(req: SaleCreate, user_id: str = Depends(get_current_user_id)):
        total = round(sum(i.qty * i.price for i in req.items), 2)
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "customer_name": req.customer_name or "Walk-in",
            "customer_id": req.customer_id,
            "items": [i.dict() for i in req.items],
            "total": total,
            "date": req.date or today_str(),
            "notes": req.notes or "",
            "payment_mode": req.payment_mode or "Cash",
            "created_at": now_iso(),
        }
        await db.biz_sales.insert_one(doc)

        if req.customer_id:
            await db.biz_customers.update_one(
                {"id": req.customer_id, "user_id": user_id},
                {"$inc": {"total_purchases": total}, "$set": {"last_purchase": today_str()}}
            )

        doc.pop("_id", None)
        return doc

    @router.delete("/sales/{sale_id}")
    async def delete_sale(sale_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_sales.delete_one({"id": sale_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Sale not found")
        return {"deleted": True}

    # ── INVENTORY ─────────────────────────────────────────────────────────────

    @router.get("/inventory")
    async def list_inventory(user_id: str = Depends(get_current_user_id)):
        return await db.biz_inventory.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("product_name", 1).to_list(1000)

    @router.post("/inventory")
    async def add_inventory(req: InventoryCreate, user_id: str = Depends(get_current_user_id)):
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **req.dict(),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.biz_inventory.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/inventory/{item_id}")
    async def update_inventory(item_id: str, req: InventoryUpdate, user_id: str = Depends(get_current_user_id)):
        updates = {k: v for k, v in req.dict().items() if v is not None}
        if not updates:
            raise HTTPException(400, "No fields to update")
        updates["updated_at"] = now_iso()
        res = await db.biz_inventory.update_one(
            {"id": item_id, "user_id": user_id}, {"$set": updates}
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Item not found")
        return await db.biz_inventory.find_one({"id": item_id}, {"_id": 0})

    @router.delete("/inventory/{item_id}")
    async def delete_inventory(item_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_inventory.delete_one({"id": item_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Item not found")
        return {"deleted": True}

    # ── EXPENSES ──────────────────────────────────────────────────────────────

    @router.get("/expenses")
    async def list_expenses(user_id: str = Depends(get_current_user_id)):
        return await db.biz_expenses.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)

    @router.post("/expenses")
    async def add_expense(req: ExpenseCreate, user_id: str = Depends(get_current_user_id)):
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **req.dict(),
            "date": req.date or today_str(),
            "created_at": now_iso(),
        }
        await db.biz_expenses.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.delete("/expenses/{exp_id}")
    async def delete_expense(exp_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_expenses.delete_one({"id": exp_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Expense not found")
        return {"deleted": True}

    # ── CUSTOMERS ─────────────────────────────────────────────────────────────

    @router.get("/customers")
    async def list_customers(user_id: str = Depends(get_current_user_id)):
        return await db.biz_customers.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("name", 1).to_list(1000)

    @router.post("/customers")
    async def add_customer(req: CustomerCreate, user_id: str = Depends(get_current_user_id)):
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **req.dict(),
            "total_purchases": 0.0,
            "last_purchase": None,
            "created_at": now_iso(),
        }
        await db.biz_customers.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/customers/{cust_id}")
    async def update_customer(cust_id: str, req: CustomerCreate, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_customers.update_one(
            {"id": cust_id, "user_id": user_id}, {"$set": req.dict()}
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Customer not found")
        return await db.biz_customers.find_one({"id": cust_id}, {"_id": 0})

    @router.delete("/customers/{cust_id}")
    async def delete_customer(cust_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_customers.delete_one({"id": cust_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Customer not found")
        return {"deleted": True}

    # ── AI INSIGHTS ───────────────────────────────────────────────────────────

    @router.post("/insights")
    async def get_insights(user_id: str = Depends(get_current_user_id)):
        from ai_helper import ask_claude

        month_start = this_month_start()

        sales = await db.biz_sales.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)
        expenses = await db.biz_expenses.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)
        inventory = await db.biz_inventory.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        total_customers = await db.biz_customers.count_documents({"user_id": user_id})

        sales_total = sum(s.get("total", 0) for s in sales)
        expenses_total = sum(e.get("amount", 0) for e in expenses)
        low_stock = [i for i in inventory if i.get("quantity", 0) <= i.get("low_stock_alert", 5)]

        product_totals: dict = {}
        for sale in sales:
            for item in sale.get("items", []):
                n = item.get("name", "Unknown")
                product_totals[n] = product_totals.get(n, 0) + item.get("qty", 0) * item.get("price", 0)
        top_products = sorted(product_totals.items(), key=lambda x: -x[1])[:5]

        exp_by_cat: dict = {}
        for e in expenses:
            cat = e.get("category", "Other")
            exp_by_cat[cat] = exp_by_cat.get(cat, 0) + e.get("amount", 0)

        summary = {
            "month": datetime.now(timezone.utc).strftime("%B %Y"),
            "sales_total_inr": round(sales_total, 2),
            "sales_count": len(sales),
            "expenses_total_inr": round(expenses_total, 2),
            "profit_estimate_inr": round(sales_total - expenses_total, 2),
            "total_customers": total_customers,
            "top_products": [{"name": p[0], "revenue_inr": round(p[1], 2)} for p in top_products],
            "expense_breakdown": {k: round(v, 2) for k, v in exp_by_cat.items()},
            "low_stock_items": [i["product_name"] for i in low_stock],
            "total_stock_items": len(inventory),
        }

        SYSTEM = """You are a business advisor for Indian small businesses. The user has shared their monthly business data (amounts in INR ₹).

Respond with ONLY a JSON array — no markdown, no explanation before or after — of exactly 3 to 5 insights, each:
{"title": "3-5 word title", "insight": "1-2 sentences with specific numbers from the data.", "type": "warning|opportunity|tip"}

Be specific with ₹ amounts. Keep language simple. Focus on: profit margins, low stock risks, top products, expense reduction, customer patterns."""

        try:
            raw = await ask_claude(
                api_key=llm_key,
                system=SYSTEM,
                user_message=json.dumps(summary, ensure_ascii=False),
            )
            text = re.sub(r"^```[a-zA-Z]*\n?", "", raw.strip())
            text = re.sub(r"```$", "", text).strip()
            insights = json.loads(text)
            if not isinstance(insights, list):
                raise ValueError("not a list")
        except Exception:
            logger.exception("Business insights AI error")
            profit = sales_total - expenses_total
            insights = [
                {
                    "title": "This month summary",
                    "insight": f"Sales: ₹{sales_total:,.0f} across {len(sales)} transactions. Expenses: ₹{expenses_total:,.0f}. Estimated profit: ₹{profit:,.0f}.",
                    "type": "tip",
                }
            ]
            if low_stock:
                insights.append({
                    "title": "Low stock alert",
                    "insight": f"{len(low_stock)} item(s) are running low: {', '.join(i['product_name'] for i in low_stock[:3])}. Reorder soon.",
                    "type": "warning",
                })

        return {"insights": insights, "summary": summary}

    # ── BUSINESS SETTINGS ─────────────────────────────────────────────────────

    @router.get("/settings")
    async def get_biz_settings(user_id: str = Depends(get_current_user_id)):
        doc = await db.biz_settings.find_one({"user_id": user_id}, {"_id": 0})
        return doc or {"user_id": user_id}

    @router.put("/settings")
    async def save_biz_settings(req: BizSettings, user_id: str = Depends(get_current_user_id)):
        data = {**req.dict(), "user_id": user_id, "updated_at": now_iso()}
        await db.biz_settings.replace_one({"user_id": user_id}, data, upsert=True)
        return data

    # ── INVOICES ──────────────────────────────────────────────────────────────

    async def _next_invoice_number(user_id: str) -> str:
        now = datetime.now(timezone.utc)
        key = f"{user_id}_{now.year}_{now.month:02d}"
        result = await db.biz_invoice_counters.find_one_and_update(
            {"key": key},
            {"$inc": {"count": 1}},
            upsert=True,
            return_document=True,
        )
        count = result.get("count", 1)
        return f"INV/{now.year}-{now.month:02d}/{count:04d}"

    @router.get("/invoices")
    async def list_invoices(user_id: str = Depends(get_current_user_id)):
        return await db.biz_invoices.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)

    @router.post("/invoices")
    async def create_invoice(req: InvoiceCreate, user_id: str = Depends(get_current_user_id)):
        inv_no = await _next_invoice_number(user_id)
        settings = await db.biz_settings.find_one({"user_id": user_id}, {"_id": 0}) or {}

        subtotal = sum(i.qty * i.rate for i in req.items)
        discount_amt = round(subtotal * (req.discount_percent or 0) / 100, 2)
        taxable = round(subtotal - discount_amt, 2)

        tax_lines = []
        total_tax = 0.0
        for item in req.items:
            item_taxable = round(item.qty * item.rate, 2)
            gst = item.gst_rate or 0
            tax_amt = round(item_taxable * gst / 100, 2)
            total_tax += tax_amt
            if gst > 0:
                if req.is_igst:
                    tax_lines.append({"label": f"IGST {gst}%", "amount": tax_amt})
                else:
                    half = round(tax_amt / 2, 2)
                    tax_lines.append({"label": f"CGST {gst/2}%", "amount": half})
                    tax_lines.append({"label": f"SGST {gst/2}%", "amount": half})

        grand_total = round(taxable + total_tax, 2)

        # Consolidate duplicate tax labels
        consolidated: dict = {}
        for t in tax_lines:
            consolidated[t["label"]] = round(consolidated.get(t["label"], 0) + t["amount"], 2)
        tax_summary = [{"label": k, "amount": v} for k, v in consolidated.items()]

        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "invoice_no": inv_no,
            "seller": {
                "name": settings.get("business_name", ""),
                "address": settings.get("address", ""),
                "gstin": settings.get("gstin", ""),
                "phone": settings.get("phone", ""),
                "email": settings.get("email", ""),
                "state": settings.get("state", ""),
                "bank_name": settings.get("bank_name", ""),
                "account_no": settings.get("account_no", ""),
                "ifsc": settings.get("ifsc", ""),
                "upi_id": settings.get("upi_id", ""),
                "logo_url": settings.get("logo_url", ""),
            },
            "buyer": {
                "name": req.buyer_name,
                "address": req.buyer_address or "",
                "gstin": req.buyer_gstin or "",
                "phone": req.buyer_phone or "",
            },
            "items": [i.dict() for i in req.items],
            "subtotal": round(subtotal, 2),
            "discount_percent": req.discount_percent or 0,
            "discount_amount": discount_amt,
            "taxable_amount": taxable,
            "tax_summary": tax_summary,
            "total_tax": round(total_tax, 2),
            "grand_total": grand_total,
            "amount_in_words": number_to_words_inr(grand_total),
            "is_igst": req.is_igst or False,
            "date": req.date or today_str(),
            "due_date": req.due_date or "",
            "notes": req.notes or "",
            "created_at": now_iso(),
        }
        await db.biz_invoices.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("/invoices/{inv_id}")
    async def get_invoice(inv_id: str, user_id: str = Depends(get_current_user_id)):
        doc = await db.biz_invoices.find_one({"id": inv_id, "user_id": user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Invoice not found")
        return doc

    @router.delete("/invoices/{inv_id}")
    async def delete_invoice(inv_id: str, user_id: str = Depends(get_current_user_id)):
        res = await db.biz_invoices.delete_one({"id": inv_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Invoice not found")
        return {"deleted": True}

    # ── CHART DATA ────────────────────────────────────────────────────────────

    @router.get("/chart-data")
    async def get_chart_data(user_id: str = Depends(get_current_user_id)):
        from datetime import timedelta

        now = datetime.now(timezone.utc)
        # Last 30 days
        days_30_ago = (now - timedelta(days=29)).strftime("%Y-%m-%d")

        all_sales = await db.biz_sales.find(
            {"user_id": user_id, "date": {"$gte": days_30_ago}}, {"_id": 0}
        ).to_list(2000)

        all_expenses = await db.biz_expenses.find(
            {"user_id": user_id, "created_at": {"$gte": this_month_start()}}, {"_id": 0}
        ).to_list(1000)

        # Daily sales for last 30 days
        daily: dict = {}
        for i in range(30):
            d = (now - timedelta(days=29 - i)).strftime("%Y-%m-%d")
            daily[d] = 0
        for s in all_sales:
            d = s.get("date", "")[:10]
            if d in daily:
                daily[d] = round(daily[d] + s.get("total", 0), 2)
        daily_sales = [{"date": k, "sales": v} for k, v in daily.items()]

        # Expense by category (this month)
        exp_by_cat: dict = {}
        for e in all_expenses:
            cat = e.get("category", "Other")
            exp_by_cat[cat] = round(exp_by_cat.get(cat, 0) + e.get("amount", 0), 2)
        expense_breakdown = [{"category": k, "amount": v} for k, v in exp_by_cat.items()]

        # Last 6 months sales
        monthly: dict = {}
        for i in range(5, -1, -1):
            from dateutil.relativedelta import relativedelta
            m = (now - relativedelta(months=i))
            key = m.strftime("%b %Y")
            monthly[key] = 0

        all_past_sales = await db.biz_sales.find(
            {"user_id": user_id}, {"date": 1, "total": 1, "_id": 0}
        ).to_list(5000)
        for s in all_past_sales:
            try:
                d = datetime.strptime(s.get("date", "")[:10], "%Y-%m-%d")
                key = d.strftime("%b %Y")
                if key in monthly:
                    monthly[key] = round(monthly[key] + s.get("total", 0), 2)
            except (ValueError, TypeError):
                pass  # Skip sales with invalid date format

        monthly_sales = [{"month": k, "sales": v} for k, v in monthly.items()]

        return {
            "daily_sales": daily_sales,
            "expense_breakdown": expense_breakdown,
            "monthly_sales": monthly_sales,
        }

    # ── AI BUSINESS Q&A ───────────────────────────────────────────────────────

    @router.post("/ask")
    async def ask_business(req: BusinessQuestion, user_id: str = Depends(get_current_user_id)):
        from ai_helper import ask_claude

        if not req.question or not req.question.strip():
            raise HTTPException(400, "Please type a question")

        # Collect business context
        month_start = this_month_start()
        sales = await db.biz_sales.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)
        expenses = await db.biz_expenses.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)
        inventory = await db.biz_inventory.find({"user_id": user_id}, {"_id": 0}).to_list(500)
        customers = await db.biz_customers.find({"user_id": user_id}, {"_id": 0}).to_list(500)

        sales_total = sum(s.get("total", 0) for s in sales)
        expenses_total = sum(e.get("amount", 0) for e in expenses)
        low_stock = [i for i in inventory if i.get("quantity", 0) <= i.get("low_stock_alert", 5)]

        product_totals: dict = {}
        for s in sales:
            for item in s.get("items", []):
                n = item.get("name", "")
                product_totals[n] = product_totals.get(n, 0) + item.get("qty", 0) * item.get("price", 0)

        exp_by_cat: dict = {}
        for e in expenses:
            cat = e.get("category", "Other")
            exp_by_cat[cat] = exp_by_cat.get(cat, 0) + e.get("amount", 0)

        context = {
            "month": datetime.now(timezone.utc).strftime("%B %Y"),
            "sales_this_month_inr": round(sales_total, 2),
            "sales_count": len(sales),
            "expenses_this_month_inr": round(expenses_total, 2),
            "profit_estimate_inr": round(sales_total - expenses_total, 2),
            "total_customers": len(customers),
            "top_products_by_revenue": sorted(product_totals.items(), key=lambda x: -x[1])[:5],
            "expense_breakdown": exp_by_cat,
            "low_stock_items": [i["product_name"] for i in low_stock],
            "total_inventory_items": len(inventory),
        }

        SYSTEM = f"""You are a smart business advisor for an Indian small business owner.
You have access to their real business data for {context['month']}:
{json.dumps(context, indent=2, ensure_ascii=False)}

Answer their question in simple, direct English (2-4 sentences max).
Use ₹ for amounts. Be specific with numbers from their data.
If you don't have enough data to answer, say so honestly and suggest what data they should enter.
Never make up numbers that aren't in the data."""

        try:
            answer = await ask_claude(
                api_key=llm_key,
                system=SYSTEM,
                user_message=req.question.strip(),
            )
        except Exception:
            logger.exception("Business Q&A AI error")
            raise HTTPException(500, "AI is unavailable right now, try again")

        return {"question": req.question, "answer": answer}

    # ── BALANCE SHEET ─────────────────────────────────────────────────────────

    @router.get("/balance-sheet")
    async def get_balance_sheet(user_id: str = Depends(get_current_user_id)):
        """
        Simplified Balance Sheet:
        Assets  = Cash + Receivables (Khata) + Inventory value
        Liabilities = Supplier payables + GST payable
        Net Worth = Assets - Liabilities
        """
        # Cash in hand — latest cash book closing balance
        today = today_str()
        cash_ob = await db.cash_opening.find_one({"user_id": user_id, "date": today})
        opening = cash_ob.get("amount", 0) if cash_ob else 0
        cash_entries = await db.cash_entries.find({"user_id": user_id, "date": today}).to_list(1000)
        cash_in = sum(e["amount"] for e in cash_entries if e["type"] == "in")
        cash_out = sum(e["amount"] for e in cash_entries if e["type"] == "out")
        cash_in_hand = round(opening + cash_in - cash_out, 2)

        # Also check last 7 days if today has no entry
        if cash_in_hand == 0:
            from datetime import timedelta
            for i in range(1, 8):
                d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
                ob = await db.cash_opening.find_one({"user_id": user_id, "date": d})
                if ob:
                    o = ob.get("amount", 0)
                    ce = await db.cash_entries.find({"user_id": user_id, "date": d}).to_list(500)
                    ci = sum(e["amount"] for e in ce if e["type"] == "in")
                    co = sum(e["amount"] for e in ce if e["type"] == "out")
                    cash_in_hand = round(o + ci - co, 2)
                    if cash_in_hand != 0:
                        break

        # Trade receivables (Khata outstanding)
        khata_entries = await db.khata_entries.find({"user_id": user_id}).to_list(5000)
        cust_totals: dict = {}
        for e in khata_entries:
            n = e["customer_name"]
            delta = e["amount"] if e["type"] == "credit" else -e["amount"]
            cust_totals[n] = cust_totals.get(n, 0) + delta
        total_receivables = round(sum(v for v in cust_totals.values() if v > 0), 2)

        # Inventory value at cost
        inventory = await db.biz_inventory.find({"user_id": user_id}).to_list(1000)
        stock_value = round(sum(i.get("quantity", 0) * i.get("cost_price", 0) for i in inventory), 2)

        # Supplier payables (unpaid purchases)
        purchases = await db.biz_purchases.find({"user_id": user_id, "paid": False}).to_list(500)
        supplier_payables = round(sum(p.get("total", 0) for p in purchases), 2)

        # GST payable (rough: sum of tax on uninvoiced last month)
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        invoices_this_month = await db.biz_invoices.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}
        ).to_list(1000)
        gst_payable = round(sum(inv.get("total_tax", 0) for inv in invoices_this_month), 2)

        # Totals
        total_assets = round(cash_in_hand + total_receivables + stock_value, 2)
        total_liabilities = round(supplier_payables + gst_payable, 2)
        net_worth = round(total_assets - total_liabilities, 2)

        return {
            "as_of": today,
            "assets": {
                "cash_in_hand": cash_in_hand,
                "trade_receivables": total_receivables,
                "stock_value": stock_value,
                "total": total_assets,
            },
            "liabilities": {
                "supplier_payables": supplier_payables,
                "gst_payable": gst_payable,
                "total": total_liabilities,
            },
            "net_worth": net_worth,
            "is_solvent": net_worth >= 0,
        }

    # ── HEALTH SCORE ──────────────────────────────────────────────────────────

    @router.get("/health-score")
    async def get_health_score(user_id: str = Depends(get_current_user_id)):
        """
        Business health score 0–100 based on:
        - Net margin (0–30 pts)
        - Receivables control (0–20 pts)
        - Cash position (0–20 pts)
        - Expense ratio (0–20 pts)
        - Inventory health (0–10 pts)
        """
        month_start = this_month_start()

        sales = await db.biz_sales.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)
        expenses = await db.biz_expenses.find(
            {"user_id": user_id, "created_at": {"$gte": month_start}}, {"_id": 0}
        ).to_list(1000)
        inventory = await db.biz_inventory.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        khata_entries = await db.khata_entries.find({"user_id": user_id}).to_list(5000)

        revenue = sum(s.get("total", 0) for s in sales)
        total_exp = sum(e.get("amount", 0) for e in expenses)
        net_profit = revenue - total_exp

        # Receivables
        cust_totals: dict = {}
        for e in khata_entries:
            n = e["customer_name"]
            delta = e["amount"] if e["type"] == "credit" else -e["amount"]
            cust_totals[n] = cust_totals.get(n, 0) + delta
        total_receivables = sum(v for v in cust_totals.values() if v > 0)

        low_stock = [i for i in inventory if i.get("quantity", 0) <= i.get("low_stock_alert", 5)]

        score = 0
        breakdown = []

        # 1. Net margin (0–30)
        if revenue > 0:
            margin = net_profit / revenue * 100
            if margin >= 30:
                pts = 30
            elif margin >= 20:
                pts = 25
            elif margin >= 10:
                pts = 18
            elif margin >= 0:
                pts = 10
            else:
                pts = 0
        else:
            pts = 0
            margin = 0
        score += pts
        breakdown.append({"label": "Net Profit Margin", "score": pts, "max": 30,
                           "note": f"{margin:.1f}% — {'Excellent' if pts == 30 else 'Good' if pts >= 20 else 'Fair' if pts >= 10 else 'Needs attention'}"})

        # 2. Receivables control (0–20)
        if revenue > 0:
            rec_ratio = total_receivables / revenue * 100
            if rec_ratio <= 10:
                pts = 20
            elif rec_ratio <= 25:
                pts = 15
            elif rec_ratio <= 50:
                pts = 8
            else:
                pts = 3
        else:
            pts = 20
            rec_ratio = 0
        score += pts
        breakdown.append({"label": "Receivables (Khata) Control", "score": pts, "max": 20,
                           "note": f"₹{total_receivables:,.0f} outstanding ({rec_ratio:.0f}% of revenue) — {'Healthy' if pts >= 15 else 'Collect faster'}"})

        # 3. Cash position (0–20)
        if revenue > 0:
            cash_ratio = net_profit / revenue * 100
            if net_profit > 0:
                pts = min(20, int(net_profit / revenue * 40))
            else:
                pts = 0
        else:
            pts = 0
        score += pts
        breakdown.append({"label": "Cash Generation", "score": pts, "max": 20,
                           "note": f"₹{net_profit:,.0f} net cash this month — {'Strong' if pts >= 15 else 'Moderate' if pts >= 8 else 'Tight'}"})

        # 4. Expense ratio (0–20)
        if revenue > 0:
            exp_ratio = total_exp / revenue * 100
            if exp_ratio <= 50:
                pts = 20
            elif exp_ratio <= 65:
                pts = 14
            elif exp_ratio <= 80:
                pts = 8
            else:
                pts = 2
        else:
            pts = 10
            exp_ratio = 0
        score += pts
        breakdown.append({"label": "Expense Control", "score": pts, "max": 20,
                           "note": f"Expenses are {exp_ratio:.0f}% of revenue — {'Excellent' if pts == 20 else 'Good' if pts >= 14 else 'High — review costs'}"})

        # 5. Inventory health (0–10)
        if inventory:
            low_pct = len(low_stock) / len(inventory) * 100
            if low_pct == 0:
                pts = 10
            elif low_pct <= 20:
                pts = 7
            elif low_pct <= 40:
                pts = 4
            else:
                pts = 1
        else:
            pts = 5
        score += pts
        breakdown.append({"label": "Inventory Health", "score": pts, "max": 10,
                           "note": f"{len(low_stock)} of {len(inventory)} items low on stock"})

        # Grade
        if score >= 85:
            grade, label, color = "A", "Excellent", "green"
        elif score >= 70:
            grade, label, color = "B", "Good", "blue"
        elif score >= 55:
            grade, label, color = "C", "Fair", "yellow"
        elif score >= 40:
            grade, label, color = "D", "Needs Work", "orange"
        else:
            grade, label, color = "F", "Critical", "red"

        return {
            "score": score,
            "max": 100,
            "grade": grade,
            "label": label,
            "color": color,
            "breakdown": breakdown,
        }

    # ── SMART ALERTS ──────────────────────────────────────────────────────────

    @router.get("/alerts")
    async def get_alerts(user_id: str = Depends(get_current_user_id)):
        """Generate smart business alerts the CA would normally flag."""
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        alerts = []

        # GST filing deadline
        next_month = now.month + 1 if now.month < 12 else 1
        next_year = now.year if now.month < 12 else now.year + 1
        gst_deadline = datetime(next_year, next_month, 20)
        days_to_gst = (gst_deadline - now.replace(tzinfo=None)).days
        if days_to_gst <= 10:
            month_start = now.replace(day=1).isoformat()
            inv_count = await db.biz_invoices.count_documents(
                {"user_id": user_id, "created_at": {"$gte": month_start}}
            )
            alerts.append({
                "type": "warning",
                "icon": "🗓",
                "title": f"GST Return due in {days_to_gst} days",
                "message": f"You have {inv_count} invoice(s) this month. Go to GST Returns to prepare GSTR-1 and GSTR-3B.",
                "action": "/gst-returns",
                "action_label": "Prepare GST Return",
            })

        # Overdue receivables
        khata = await db.khata_entries.find({"user_id": user_id}).to_list(5000)
        cust_map: dict = {}
        cust_last: dict = {}
        for e in khata:
            n = e["customer_name"]
            delta = e["amount"] if e["type"] == "credit" else -e["amount"]
            cust_map[n] = cust_map.get(n, 0) + delta
            if e["type"] == "credit":
                d = e.get("date", "")
                if not cust_last.get(n) or d > cust_last[n]:
                    cust_last[n] = d
        overdue = [
            n for n, bal in cust_map.items()
            if bal > 0 and cust_last.get(n)
            and (now.replace(tzinfo=None) - datetime.strptime(cust_last[n], "%Y-%m-%d")).days > 30
        ]
        if overdue:
            total_overdue = sum(cust_map[n] for n in overdue)
            alerts.append({
                "type": "warning",
                "icon": "💰",
                "title": f"₹{total_overdue:,.0f} overdue from {len(overdue)} customer(s)",
                "message": f"{', '.join(overdue[:3])} haven't paid in over 30 days. Send WhatsApp reminders.",
                "action": "/khata",
                "action_label": "Open Khata",
            })

        # Low stock
        inv = await db.biz_inventory.find({"user_id": user_id}).to_list(500)
        low = [i for i in inv if i.get("quantity", 0) <= i.get("low_stock_alert", 5)]
        if low:
            alerts.append({
                "type": "warning",
                "icon": "📦",
                "title": f"{len(low)} item(s) running low",
                "message": f"{', '.join(i['product_name'] for i in low[:3])} need restocking. Record a purchase to update stock.",
                "action": "/purchases",
                "action_label": "Record Purchase",
            })

        # Revenue growing / shrinking
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        from dateutil.relativedelta import relativedelta
        prev_start = (month_start - relativedelta(months=1)).isoformat()
        prev_end = month_start.isoformat()
        curr_sales = await db.biz_sales.find(
            {"user_id": user_id, "created_at": {"$gte": month_start.isoformat()}}, {"total": 1}
        ).to_list(1000)
        prev_sales = await db.biz_sales.find(
            {"user_id": user_id, "created_at": {"$gte": prev_start, "$lt": prev_end}}, {"total": 1}
        ).to_list(1000)
        curr_rev = sum(s.get("total", 0) for s in curr_sales)
        prev_rev = sum(s.get("total", 0) for s in prev_sales)
        if prev_rev > 0 and curr_rev > 0:
            change = (curr_rev - prev_rev) / prev_rev * 100
            if change <= -20:
                alerts.append({
                    "type": "danger",
                    "icon": "📉",
                    "title": f"Revenue down {abs(change):.0f}% vs last month",
                    "message": f"Last month: ₹{prev_rev:,.0f} → This month so far: ₹{curr_rev:,.0f}. Check if seasonal or a real problem.",
                    "action": "/profit-loss",
                    "action_label": "View P&L",
                })
            elif change >= 20:
                alerts.append({
                    "type": "success",
                    "icon": "📈",
                    "title": f"Revenue up {change:.0f}% vs last month! 🎉",
                    "message": f"Great growth — ₹{prev_rev:,.0f} → ₹{curr_rev:,.0f}. Keep the momentum going.",
                    "action": "/sales",
                    "action_label": "View Sales",
                })

        # No sales today
        today_sales = await db.biz_sales.count_documents(
            {"user_id": user_id, "date": today_str()}
        )
        if today_sales == 0 and now.hour >= 14:  # Afternoon check
            alerts.append({
                "type": "info",
                "icon": "🛒",
                "title": "No sales recorded today",
                "message": "Don't forget to log today's sales before closing.",
                "action": "/sales",
                "action_label": "Add Sale",
            })

        # Unpaid supplier bills
        unpaid = await db.biz_purchases.find(
            {"user_id": user_id, "paid": False}
        ).to_list(100)
        if unpaid:
            total_unpaid = sum(p.get("total", 0) for p in unpaid)
            alerts.append({
                "type": "info",
                "icon": "🏪",
                "title": f"₹{total_unpaid:,.0f} owed to suppliers",
                "message": f"{len(unpaid)} purchase(s) on credit not yet paid. Pay to maintain good supplier relations.",
                "action": "/purchases",
                "action_label": "View Purchases",
            })

        return {"alerts": alerts, "count": len(alerts)}

    return router

    @router.get("/pl")
    async def get_pl(
        user_id: str = Depends(get_current_user_id),
        from_date: str = None,
        to_date: str = None,
    ):
        from datetime import timedelta

        now = datetime.now(timezone.utc)
        if not from_date:
            from_date = now.replace(day=1).strftime("%Y-%m-%d")
        if not to_date:
            to_date = now.strftime("%Y-%m-%d")

        # ── Revenue ───────────────────────────────────────────────────────────
        sales = await db.biz_sales.find(
            {"user_id": user_id, "date": {"$gte": from_date, "$lte": to_date}}, {"_id": 0}
        ).to_list(5000)
        total_revenue = sum(s.get("total", 0) for s in sales)

        # Revenue breakdown by product
        product_rev: dict = {}
        for s in sales:
            for item in s.get("items", []):
                n = item.get("name", "Other")
                product_rev[n] = product_rev.get(n, 0) + item.get("qty", 0) * item.get("price", 0)
        top_products = sorted(product_rev.items(), key=lambda x: -x[1])[:8]

        # ── COGS from inventory cost prices ───────────────────────────────────
        inventory = await db.biz_inventory.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        cost_map = {i["product_name"].strip().lower(): i.get("cost_price", 0) for i in inventory}
        inventory_cogs = 0.0
        for s in sales:
            for item in s.get("items", []):
                name = item.get("name", "").strip().lower()
                inventory_cogs += item.get("qty", 0) * cost_map.get(name, 0)

        # ── Expenses ──────────────────────────────────────────────────────────
        COGS_CATS = {"Raw Materials", "Materials"}
        expenses = await db.biz_expenses.find(
            {"user_id": user_id, "date": {"$gte": from_date, "$lte": to_date}}, {"_id": 0}
        ).to_list(5000)

        cogs_from_exp = 0.0
        opex_by_cat: dict = {}
        for e in expenses:
            cat = e.get("category", "Other")
            amt = e.get("amount", 0)
            if cat in COGS_CATS:
                cogs_from_exp += amt
            else:
                opex_by_cat[cat] = opex_by_cat.get(cat, 0) + amt
        total_opex = sum(opex_by_cat.values())

        # Use inventory-based COGS if available, else fall back to expense-based
        total_cogs = max(inventory_cogs, cogs_from_exp)
        gross_profit = total_revenue - total_cogs
        net_profit = gross_profit - total_opex
        gross_margin = round(gross_profit / total_revenue * 100, 1) if total_revenue > 0 else 0
        net_margin = round(net_profit / total_revenue * 100, 1) if total_revenue > 0 else 0

        # ── Previous Period Comparison ─────────────────────────────────────────
        from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        span = (to_dt - from_dt).days + 1
        prev_from = (from_dt - timedelta(days=span)).strftime("%Y-%m-%d")
        prev_to = (from_dt - timedelta(days=1)).strftime("%Y-%m-%d")

        prev_sales = await db.biz_sales.find(
            {"user_id": user_id, "date": {"$gte": prev_from, "$lte": prev_to}},
            {"total": 1, "_id": 0}
        ).to_list(5000)
        prev_rev = sum(s.get("total", 0) for s in prev_sales)

        prev_exps = await db.biz_expenses.find(
            {"user_id": user_id, "date": {"$gte": prev_from, "$lte": prev_to}},
            {"amount": 1, "_id": 0}
        ).to_list(5000)
        prev_total_exp = sum(e.get("amount", 0) for e in prev_exps)
        prev_net = prev_rev - prev_total_exp

        def pct_change(curr, prev):
            if prev == 0:
                return None
            return round((curr - prev) / abs(prev) * 100, 1)

        return {
            "period": {"from": from_date, "to": to_date},
            "revenue": {
                "total": round(total_revenue, 2),
                "transactions": len(sales),
                "by_product": [{"name": p[0], "amount": round(p[1], 2)} for p in top_products],
            },
            "cogs": {
                "total": round(total_cogs, 2),
                "inventory_based": round(inventory_cogs, 2),
                "expense_based": round(cogs_from_exp, 2),
            },
            "gross_profit": round(gross_profit, 2),
            "gross_margin_pct": gross_margin,
            "operating_expenses": {
                "by_category": {k: round(v, 2) for k, v in sorted(opex_by_cat.items(), key=lambda x: -x[1])},
                "total": round(total_opex, 2),
            },
            "net_profit": round(net_profit, 2),
            "net_margin_pct": net_margin,
            "is_profit": net_profit >= 0,
            "comparison": {
                "prev_from": prev_from,
                "prev_to": prev_to,
                "prev_revenue": round(prev_rev, 2),
                "prev_net_profit": round(prev_net, 2),
                "revenue_change_pct": pct_change(total_revenue, prev_rev),
                "profit_change_pct": pct_change(net_profit, prev_net),
            },
        }

    return router
