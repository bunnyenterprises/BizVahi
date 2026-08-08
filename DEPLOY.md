# Fintr Deployment Guide
## Complete steps from your Android phone

---

## What goes where

```
GitHub          → your code (NO secrets)
MongoDB Atlas   → your database (FREE)
Railway         → your backend / API (FREE)
Vercel          → your frontend / website (FREE)
```

Secrets (passwords, API keys) go ONLY in Railway and Vercel dashboards.
Never in GitHub. Never in code.

---

## Step 1 — MongoDB Atlas (5 minutes)

1. Open mongodb.com/atlas on your phone
2. Sign up with Google
3. Choose FREE tier (M0)
4. Choose region: AWS Mumbai (ap-south-1)
5. Click Create

6. Security Quickstart:
   - Username: fintr
   - Password: make a strong one, SAVE IT
   - Click Create User

7. Network Access:
   - Click Add IP Address
   - Click Allow Access From Anywhere
   - Click Confirm

8. Get connection string:
   - Click Connect → Drivers
   - Copy the string — looks like:
     mongodb+srv://fintr:PASSWORD@cluster0.abc12.mongodb.net/

9. Replace <password> in the string with your real password
10. Save this string — you need it for Step 3

---

## Step 2 — Push code to GitHub (5 minutes)

1. Open github.com on your phone
2. Create new repository named: fintr
3. Make it Private (important for security)

4. Open github.dev/YOUR_USERNAME/fintr in browser
   (replace YOUR_USERNAME with your GitHub username)

5. This opens VS Code in browser

6. Click the Explorer icon (top left)
7. Click Upload Files button
8. Upload the fintr-v6.zip file

9. Open Terminal (hamburger menu → Terminal)
10. Run these commands one by one:

```bash
unzip fintr-v6.zip
cp -r fintr/* .
rm -rf fintr fintr-v6.zip
git add -A
git commit -m "Fintr complete business platform"
git push
```

Your code is now on GitHub. No secrets — just code.

---

## Step 3 — Deploy Backend on Railway (5 minutes)

1. Open railway.app on your phone
2. Login with GitHub

3. Click New Project
4. Click Deploy from GitHub repo
5. Select your fintr repo
6. Railway starts building automatically

7. Click on your service → Variables tab
8. Click Add Variable for each one:

```
MONGO_URL        = mongodb+srv://fintr:PASSWORD@cluster0.abc12.mongodb.net/
DB_NAME          = fintr
JWT_SECRET       = make_a_long_random_string_like_this_abc123xyz789
EMERGENT_LLM_KEY = your_anthropic_api_key
ADMIN_EMAIL      = your_email@gmail.com
CORS_ORIGINS     = https://fintr.vercel.app
HTTPS_ONLY       = true
```

9. Railway will redeploy with the variables
10. Click on your service → copy the URL
    Looks like: https://fintr-production.railway.app

SAVE THIS URL — you need it for Step 4.

---

## Step 4 — Deploy Frontend on Vercel (5 minutes)

1. Open vercel.com on your phone
2. Login with GitHub

3. Click New Project
4. Import your fintr repo
5. Set Root Directory: (leave blank — vercel.json handles it)

6. Click Environment Variables → Add:

```
REACT_APP_API_URL = https://fintr-production.railway.app/api
```
(use the Railway URL from Step 3 + /api at the end)

7. Click Deploy
8. Wait 2-3 minutes

9. Vercel gives you URL: https://fintr.vercel.app

---

## Step 5 — Final security check (2 minutes)

1. Go back to Railway → Variables
2. Update CORS_ORIGINS to your real Vercel URL:
   CORS_ORIGINS = https://fintr.vercel.app

3. Railway redeploys automatically

---

## Test your live app

Open https://fintr.vercel.app

Try:
- Sign up with your email
- Add a sale
- View the Dashboard
- Check P&L

If anything fails, check Railway logs:
Railway → your service → Deployments → View Logs

---

## What is secure

✅ MongoDB password: only in Railway, never in code
✅ JWT secret: only in Railway, never in code
✅ API key: only in Railway, never in code
✅ Frontend only knows YOUR Railway URL (not database)
✅ .gitignore blocks .env files from ever going to GitHub
✅ CORS blocks requests from other websites
✅ Security headers block XSS and clickjacking attacks
✅ Rate limiting blocks brute force login attacks
✅ Account lockout after 5 failed logins

---

## Monthly cost

MongoDB Atlas M0    = FREE forever
Railway Hobby       = $5/month free credit (enough for small app)
Vercel              = FREE for personal projects

Total = ₹0/month to start
