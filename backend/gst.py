"""
Business Vahi GST Returns Module
- GSTR-1: Invoice-wise details for filing
- GSTR-3B: Monthly tax liability summary
- Deadline tracking and payment reminders
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user_id

logger = logging.getLogger(__name__)

# Indian state codes (extracted from first 2 digits of GSTIN)
STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh",
    "29": "Karnataka", "30": "Goa", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "36": "Telangana",
    "37": "Andhra Pradesh (New)",
}

def get_seller_state(gstin: str) -> str:
    if not gstin or len(gstin) < 2:
        return "27"  # Default Maharashtra
    return gstin[:2]

def is_inter_state(seller_gstin: str, buyer_gstin: str) -> bool:
    """True if seller and buyer are in different states → IGST applies."""
    s = get_seller_state(seller_gstin)
    b = get_seller_state(buyer_gstin) if buyer_gstin and len(buyer_gstin) >= 2 else s
    return s != b

def get_gst_deadline(year: int, month: int) -> str:
    """GSTR-1 and GSTR-3B are due on 11th and 20th of following month."""
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    return f"{next_year}-{next_month:02d}-20"

def build_gst_router(db):
    router = APIRouter(prefix="/gst", tags=["gst"])

    @router.get("/summary")
    async def gst_summary(
        user_id: str = Depends(get_current_user_id),
        year: int = None,
        month: int = None,
    ):
        """GSTR-3B summary: tax liability grouped by rate."""
        now = datetime.now(timezone.utc)
        y = year or now.year
        m = month or now.month

        from_date = f"{y}-{m:02d}-01"
        if m == 12:
            to_date = f"{y + 1}-01-01"
        else:
            to_date = f"{y}-{m + 1:02d}-01"

        invoices = await db.biz_invoices.find(
            {"user_id": user_id, "date": {"$gte": from_date, "$lt": to_date}},
            {"_id": 0}
        ).to_list(2000)

        # Settings for seller info
        settings = await db.biz_settings.find_one({"user_id": user_id}, {"_id": 0}) or {}
        seller_gstin = settings.get("gstin", "")

        # Aggregate tax by rate
        b2b_invoices = []   # Buyer has GSTIN
        b2c_invoices = []   # No buyer GSTIN

        rate_totals: dict = {}  # {rate: {taxable, igst, cgst, sgst}}

        for inv in invoices:
            buyer_gstin = inv.get("buyer", {}).get("gstin", "")
            inter = is_inter_state(seller_gstin, buyer_gstin) if buyer_gstin else False

            for item in inv.get("items", []):
                rate = float(item.get("gst_rate", 0))
                if rate not in rate_totals:
                    rate_totals[rate] = {"taxable": 0, "igst": 0, "cgst": 0, "sgst": 0}

                taxable = round(item.get("qty", 0) * item.get("rate", 0), 2)
                tax = round(taxable * rate / 100, 2)

                rate_totals[rate]["taxable"] += taxable
                if inter or inv.get("is_igst"):
                    rate_totals[rate]["igst"] += tax
                else:
                    half = round(tax / 2, 2)
                    rate_totals[rate]["cgst"] += half
                    rate_totals[rate]["sgst"] += half

            if buyer_gstin:
                b2b_invoices.append(inv)
            else:
                b2c_invoices.append(inv)

        # Totals
        total_taxable = sum(v["taxable"] for v in rate_totals.values())
        total_igst = sum(v["igst"] for v in rate_totals.values())
        total_cgst = sum(v["cgst"] for v in rate_totals.values())
        total_sgst = sum(v["sgst"] for v in rate_totals.values())
        total_tax = round(total_igst + total_cgst + total_sgst, 2)

        # Deadline
        deadline = get_gst_deadline(y, m)
        days_left = (
            datetime.strptime(deadline, "%Y-%m-%d") - datetime.now(timezone.utc).replace(tzinfo=None)
        ).days

        return {
            "period": {"year": y, "month": m, "month_name": datetime(y, m, 1).strftime("%B %Y")},
            "seller_gstin": seller_gstin,
            "invoice_count": len(invoices),
            "b2b_count": len(b2b_invoices),
            "b2c_count": len(b2c_invoices),
            "total_invoice_value": round(sum(inv.get("grand_total", 0) for inv in invoices), 2),
            "total_taxable": round(total_taxable, 2),
            "by_rate": {
                str(int(r)): {
                    "taxable": round(v["taxable"], 2),
                    "igst": round(v["igst"], 2),
                    "cgst": round(v["cgst"], 2),
                    "sgst": round(v["sgst"], 2),
                    "total_tax": round(v["igst"] + v["cgst"] + v["sgst"], 2),
                }
                for r, v in sorted(rate_totals.items())
                if v["taxable"] > 0
            },
            "total_igst": round(total_igst, 2),
            "total_cgst": round(total_cgst, 2),
            "total_sgst": round(total_sgst, 2),
            "total_tax_payable": total_tax,
            "gstr1_deadline": deadline,
            "gstr3b_deadline": deadline,
            "days_until_deadline": days_left,
            "b2b_invoices": b2b_invoices,
            "b2c_invoices": b2c_invoices,
        }

    @router.get("/history")
    async def gst_history(user_id: str = Depends(get_current_user_id)):
        """Last 6 months GST liability summary."""
        now = datetime.now(timezone.utc)
        history = []
        for i in range(5, -1, -1):
            m = (now.month - i - 1) % 12 + 1
            y = now.year - ((now.month - i - 1) // 12 + (1 if (now.month - i - 1) < 0 else 0))
            from_date = f"{y}-{m:02d}-01"
            nm = m + 1 if m < 12 else 1
            ny = y if m < 12 else y + 1
            to_date = f"{ny}-{nm:02d}-01"

            invoices = await db.biz_invoices.find(
                {"user_id": user_id, "date": {"$gte": from_date, "$lt": to_date}},
                {"grand_total": 1, "total_tax": 1, "_id": 0}
            ).to_list(2000)

            history.append({
                "period": datetime(y, m, 1).strftime("%b %Y"),
                "invoices": len(invoices),
                "total_billed": round(sum(inv.get("grand_total", 0) for inv in invoices), 2),
                "tax_collected": round(sum(inv.get("total_tax", 0) for inv in invoices), 2),
            })
        return history

    return router
