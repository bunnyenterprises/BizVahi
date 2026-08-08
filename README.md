# Fintr — Business Management Software

Finance. Tracked. Simple.

## What is Fintr?

Fintr is a complete business management app for Indian small businesses.
GST invoices, Khata tracking, P&L, Cash Book, Inventory — all in one.
Works offline. No CA needed. Free to start.

## Tech Stack

- **Frontend:** React + Tailwind + Shadcn UI + Recharts
- **Backend:** FastAPI (Python) + MongoDB Atlas
- **AI:** Anthropic Claude (direct API)
- **Auth:** JWT + bcrypt
- **Payments:** Razorpay
- **Hosting:** Railway (backend) + Vercel (frontend)

## Folder Structure

```
fintr/
├── backend/          FastAPI Python server
│   ├── server.py     Main app entry point
│   ├── business.py   Sales, Inventory, P&L, AI features
│   ├── khata.py      Khata, Cash Book, Purchases
│   ├── gst.py        GST invoice + returns
│   ├── admin.py      Admin panel, payments
│   ├── auth.py       JWT authentication
│   ├── security.py   Rate limiting, lockout, sanitization
│   ├── ai_helper.py  Anthropic Claude API wrapper
│   └── database_sqlite.py  Offline SQLite layer
├── frontend/         React application
│   ├── src/pages/    20+ page components
│   ├── src/components/ Shared UI components
│   └── public/       PWA manifest, service worker, icons
└── electron/         Desktop app wrapper
```

## Environment Variables

```
MONGO_URL         MongoDB Atlas connection string
DB_NAME           fintr
JWT_SECRET        Your secret key
ADMIN_EMAIL       Admin account email
ANTHROPIC_KEY     Anthropic API key (for AI features)
CORS_ORIGINS      Allowed frontend URL (or * for all)
```

## Deploy

**Backend (Railway):**
- Root Directory: `backend`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Health Check: `/health`

**Frontend (Vercel):**
- Build Command: `cd frontend && npm install && npm run build`
- Output: `frontend/build`
- Env: `REACT_APP_API_URL=https://your-backend.railway.app/api`

## Business Features

- GST Invoice Generator (B2B + B2C)
- Khata / Udhaar Book with WhatsApp reminders
- Daily Cash Book
- Sales & Purchase Register
- Inventory Management
- Profit & Loss Statement
- Balance Sheet
- GST Returns (GSTR-1 + GSTR-3B)
- AI Business Advisor
- Business Health Score
- Smart Alerts Dashboard
- Reports (Excel download)

## Security

10 layers: HTTPS, bcrypt, JWT, account lockout,
rate limiting, input sanitization, CORS, security headers,
data isolation, encrypted database.

---

Made in Pune, Maharashtra 🇮🇳
