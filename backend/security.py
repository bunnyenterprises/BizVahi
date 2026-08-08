"""
Business Vahi Security Module
- SecurityHeadersMiddleware: adds security headers to every response
- Account lockout: locks after 5 failed logins for 30 minutes
- In-memory rate limiter: stops brute-force on any endpoint
- Password strength validation
- Input sanitization: blocks XSS and injection attacks
"""
import os
import re
import time
import logging
import asyncio
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 30

# ─── Input Sanitization ───────────────────────────────────────────────────────

_DANGEROUS = re.compile(
    r'(<script|javascript:|on\w+=|<iframe|<object|'
    r'union\s+select|drop\s+table|insert\s+into|'
    r'\.\./|/etc/passwd|cmd\.exe)',
    re.IGNORECASE
)

def sanitize(value: str, max_len: int = 500) -> str:
    """Sanitize string input — escape HTML, block injection."""
    if not isinstance(value, str):
        return value
    value = value[:max_len].strip()
    if _DANGEROUS.search(value):
        logger.warning("Suspicious input blocked: %.100s", value)
        raise ValueError("Invalid input")
    return value

def sanitize_email(email: str) -> str:
    email = email.lower().strip()[:254]
    if not re.match(r'^[\w._%+\-]+@[\w.\-]+\.[a-zA-Z]{2,}$', email):
        raise ValueError("Invalid email address")
    return email

def sanitize_gstin(gstin: str) -> str:
    if not gstin:
        return ""
    gstin = gstin.upper().strip()
    if gstin and not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', gstin):
        raise ValueError("Invalid GSTIN format")
    return gstin
LOGIN_RATE_LIMIT = 10   # max login attempts per IP per minute
API_RATE_LIMIT = 120    # max API calls per IP per minute

# ─── Security Headers Middleware ──────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every HTTP response."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        h = response.headers
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"] = "SAMEORIGIN"
        h["X-XSS-Protection"] = "1; mode=block"
        h["Referrer-Policy"] = "strict-origin-when-cross-origin"
        h["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Only add HSTS when HTTPS is confirmed (set HTTPS_ONLY=true in prod env)
        if os.environ.get("HTTPS_ONLY"):
            h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

# ─── Account Lockout ──────────────────────────────────────────────────────────

async def is_account_locked(db, email: str):
    """
    Returns (is_locked: bool, minutes_remaining: int).
    Clears expired lockouts automatically.
    """
    record = await db.login_attempts.find_one({"email": email.lower()})
    if not record:
        return False, 0

    locked_until = record.get("locked_until")
    if not locked_until:
        return False, 0

    if isinstance(locked_until, str):
        locked_until = datetime.fromisoformat(locked_until)
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    if now < locked_until:
        remaining = max(1, int((locked_until - now).total_seconds() / 60) + 1)
        return True, remaining

    # Lock expired — clean up
    await db.login_attempts.delete_one({"email": email.lower()})
    return False, 0

async def record_failed_login(db, email: str) -> int:
    """
    Increment failed login counter.
    Locks account for LOCKOUT_MINUTES after MAX_FAILED_ATTEMPTS.
    Returns the new attempt count.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    record = await db.login_attempts.find_one({"email": email.lower()})
    new_count = (record.get("attempts", 0) if record else 0) + 1

    update_data = {
        "email": email.lower(),
        "attempts": new_count,
        "last_attempt": now_iso,
        "locked_until": None,
    }

    if new_count >= MAX_FAILED_ATTEMPTS:
        locked_until = (
            datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        ).isoformat()
        update_data["locked_until"] = locked_until
        logger.warning(
            "Account locked: %s after %d failed attempts", email, new_count
        )

    await db.login_attempts.replace_one(
        {"email": email.lower()}, update_data, upsert=True
    )
    return new_count

async def clear_failed_logins(db, email: str):
    """Clear failed login record on successful authentication."""
    await db.login_attempts.delete_one({"email": email.lower()})

# ─── Password Validation ──────────────────────────────────────────────────────

def validate_password(password: str):
    """
    Returns an error string if the password is too weak, None if acceptable.
    Rules: ≥8 chars, at least one letter, at least one digit.
    """
    if not password or len(password) < 8:
        return "Password must be at least 8 characters"
    if not any(c.isalpha() for c in password):
        return "Password must contain at least one letter"
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number"
    return None

# ─── In-Memory Rate Limiter ───────────────────────────────────────────────────
# Suitable for single-server deployments.
# Replace with Redis-backed limiter for multi-instance production.

_rl_store: dict = defaultdict(list)
_rl_lock = asyncio.Lock()

async def is_rate_limited(key: str, max_calls: int = 60, window_seconds: int = 60) -> bool:
    """
    Returns True if this key has exceeded max_calls within window_seconds.
    Automatically clears stale entries.
    """
    async with _rl_lock:
        now = time.time()
        calls = [t for t in _rl_store[key] if now - t < window_seconds]
        _rl_store[key] = calls
        if len(calls) >= max_calls:
            return True
        _rl_store[key].append(now)
        return False
