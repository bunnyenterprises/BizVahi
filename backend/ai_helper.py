"""
Business Vahi AI Helper
===============
Groq API integration (OpenAI-compatible chat completions format).
Fast, free-tier-friendly inference — no third-party wrapper library needed.

Usage:
    from ai_helper import ask_claude

    response = await ask_claude(
        api_key=GROQ_API_KEY,
        system="You are a business advisor.",
        user_message="Which product sold most?",
    )
"""

import logging
import httpx

logger = logging.getLogger(__name__)

# Groq's currently recommended general-purpose/reasoning model.
# Groq deprecated the old llama-3.3-70b-versatile / llama-3.1-8b-instant models —
# openai/gpt-oss-120b is their current flagship replacement for this kind of workload.
MODEL   = "openai/gpt-oss-120b"
API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Function name kept as ask_claude so business.py's existing calls
# (from ai_helper import ask_claude) don't need to change — only the
# implementation underneath switched providers, from Anthropic to Groq.
async def ask_claude(
    api_key: str,
    system: str,
    user_message: str,
    max_tokens: int = 1000,
) -> str:
    """
    Send a message to Groq and return the text response.
    Raises RuntimeError if the API call fails.
    """
    if not api_key:
        raise RuntimeError("Groq API key not set. Add GROQ_API_KEY to your environment secrets.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_message},
        ],
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(API_URL, headers=headers, json=payload)

    if resp.status_code != 200:
        logger.error("Groq API error %s: %s", resp.status_code, resp.text[:300])
        raise RuntimeError(f"Groq API returned {resp.status_code}")

    data = resp.json()
    return data["choices"][0]["message"]["content"]
