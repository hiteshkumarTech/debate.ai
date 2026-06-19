# DebateAI — Phase 4: Deploy to the Internet (with GitHub + Supabase)

You've finished Phases 1–3: the app runs locally with real Gemini AI and Firebase
login. This guide takes it **live on the internet** with code on GitHub and a real
cloud database so saved data persists.

Every command/value here was checked against your actual code.

**Order matters — do the stages in sequence:**
1. **4A** — Push code to GitHub (secrets stay out)
2. **4B** — Supabase (cloud Postgres database)
3. **4C** — Deploy the backend on Render
4. **4D** — Deploy the frontend on Vercel
5. **4E** — Wire them together (CORS + Firebase domains) ← the step everyone forgets

> 💡 Do this in a **fresh chat** if your current one is near its limit. Paste the
> "context paragraph" at the bottom of this file into the new chat first.

---

## ⚠️ READ FIRST — Secrets

You have THREE secrets that must **never** be committed to GitHub:
- `backend/.env` (has your Gemini key)
- `backend/firebase-service-account.json` (Firebase admin key)
- `frontend .env.local` (Firebase web config — less sensitive, but keep it out too)

Your `.gitignore` already excludes all of these. We'll verify before pushing.
On Render/Vercel you'll re-enter these as **environment variables** (not files).

---

## 4A — Push to GitHub

**1. Make a GitHub account** (if you don't have one): https://github.com → Sign up.

**2. Create a new repository:**
- GitHub → top-right **+** → **New repository**
- Name: `debateai` (or anything)
- Set to **Private** (recommended while it has your setup)
- Do NOT check "Add a README" / "Add .gitignore" (your project has its own)
- Click **Create repository**. Leave that page open — it shows the push commands.

**3. Install Git** (if `git --version` in PowerShell fails):
- https://git-scm.com/download/win → download → install with all defaults.
- Close & reopen PowerShell after installing.

**4. In PowerShell, go to your project ROOT** (not backend):
```
cd "$env:USERPROFILE\Downloads\debateai\debate-ai-frontend"
```

**5. VERIFY secrets are ignored BEFORE committing** (critical):
```
git init
git add .
git status
```
In the `git status` list, **confirm you do NOT see**: `.env`, `firebase-service-account.json`,
or `.env.local`. If any of those appear, STOP — the .gitignore isn't catching them;
fix before continuing (ask for help). If they're absent, you're safe to proceed.

**6. Commit and push** (replace YOUR-USERNAME):
```
git commit -m "DebateAI: phases 1-3 complete, ready to deploy"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/debateai.git
git push -u origin main
```
It may pop a browser window to log into GitHub — approve it. When it finishes,
refresh your GitHub repo page: your code should be there (and NO secret files).

> If `git push` asks for credentials and fails: GitHub no longer accepts passwords
> here. Easiest fix: install **GitHub CLI** (https://cli.github.com), run `gh auth login`,
> then retry the push. Or use a Personal Access Token as the password.

---

## 4B — Supabase (cloud Postgres)

**1. Create account/project:** https://supabase.com → Sign in (GitHub login works)
→ **New project**.
- Name: `debateai`
- **Database Password**: set a strong one and **save it somewhere** — you need it next.
- Region: pick the closest to you.
- Click **Create new project**, wait ~2 min for it to provision.

**2. Get the connection string:**
- In your Supabase project: **Settings (gear)** → **Database**.
- Find **Connection string** → click the **URI** tab.
- Copy it. It looks like:
  `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`

**3. Adapt it for this backend.** Two edits to that string:
- Replace `[YOUR-PASSWORD]` with the actual password you set.
- Change the prefix `postgresql://` to **`postgresql+psycopg2://`**

  Final form:
  `postgresql+psycopg2://postgres:YOURPASSWORD@db.xxxx.supabase.co:5432/postgres`

Keep this final string — it's the `DATABASE_URL` you'll paste into Render next.
(Your code auto-creates all tables on first startup, so no manual SQL needed.)

> ⚠️ This string contains your DB password — it's a secret. Don't commit/share it.

---

## 4C — Deploy the backend on Render

**1.** https://render.com → Sign up (use **"Sign in with GitHub"** — simplest).

**2.** Dashboard → **New +** → **Web Service** → connect your GitHub → pick the
`debateai` repo.

**3. Configure the service:**
- **Name**: `debateai-api` (this becomes part of your URL)
- **Root Directory**: `backend`  ← important (your backend is in a subfolder)
- **Runtime/Language**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Instance Type**: **Free**

**4. Add environment variables** (scroll to "Environment" / "Advanced" →
"Add Environment Variable"). Add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | your `postgresql+psycopg2://...` string from 4B |
| `DEFAULT_AI_PROVIDER` | `google` |
| `GOOGLE_API_KEY` | your Gemini key |
| `GOOGLE_MODEL` | `gemini-2.5-flash` |
| `FIREBASE_CREDENTIALS_JSON` | *(see step 5)* |
| `CORS_ORIGINS` | *(set in 4E once you have the Vercel URL — for now put a placeholder like `https://example.com`)* |

**5. The Firebase credential (special).** Render can't take your JSON *file*, so
your backend now accepts the JSON *contents* via `FIREBASE_CREDENTIALS_JSON`:
- On your PC, open `backend/firebase-service-account.json` in Notepad.
- Select ALL (Ctrl+A), copy (Ctrl+C).
- In Render, create env var `FIREBASE_CREDENTIALS_JSON` and **paste the entire
  JSON** as the value (the whole `{ ... }` blob, on one line is fine).

> This is why we updated the code — `FIREBASE_CREDENTIALS_JSON` is read first, so
> deployment works without committing the secret file. Do NOT also set
> `FIREBASE_CREDENTIALS_PATH` on Render.

**6. Click "Create Web Service".** Render builds & deploys (~3-5 min). When done,
it shows a URL like `https://debateai-api.onrender.com`.

**7. Verify:** open `https://debateai-api.onrender.com/api/health` — you should see
`"firebase_auth":"enabled"` and `"google":true`. **Copy your Render URL** — you need
it for the frontend.

> Render free tier "sleeps" after inactivity; the first request after a nap takes
> ~30-60s to wake. Normal for free tier.

---

## 4D — Deploy the frontend on Vercel

**1.** https://vercel.com → Sign up with **GitHub**.

**2.** **Add New → Project** → import your `debateai` repo.

**3. Configure:**
- **Framework Preset**: Vite (it usually auto-detects)
- **Root Directory**: leave as the repo root (`./`) — your frontend is at the root
- Build Command: `npm run build` (default is fine)
- Output Directory: `dist` (default is fine)

**4. Add Environment Variables** (expand "Environment Variables"). Add ALL of these
(same names as your `.env.local`, with the API URL pointing at Render):

| Key | Value |
|-----|-------|
| `VITE_API_URL` | your Render URL, e.g. `https://debateai-api.onrender.com` |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBanukZ2DS7mt7nQ3BmxFXtCHh_3DRqOfg` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `debateai1.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `debateai1` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `debateai1.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `935877382645` |
| `VITE_FIREBASE_APP_ID` | `1:935877382645:web:c6ff9fe639941307a690bc` |

**5. Click Deploy.** ~2 min. You get a URL like `https://debateai.vercel.app`.
**Copy this URL** — you need it for the final wiring step.

---

## 4E — Wire them together (DON'T SKIP — nothing works without this)

Two connections must be told about your real URLs:

**1. CORS — let the frontend call the backend:**
- Render → your `debateai-api` service → **Environment** → edit `CORS_ORIGINS`
- Set it to your Vercel URL exactly, e.g.: `https://debateai.vercel.app`
  (no trailing slash; if you have multiple, comma-separate them)
- Save → Render auto-redeploys.

> Without this, the browser blocks the frontend from talking to the backend
> (you'd see "CORS error" in the console and AI replies would fail).

**2. Firebase authorized domains — let Google login work on your live site:**
- Firebase Console → **Authentication** → **Settings** tab → **Authorized domains**
- Click **Add domain** → enter your Vercel domain (e.g. `debateai.vercel.app`)
- Save.

> Without this, Google sign-in on the deployed site is blocked with an
> "unauthorized domain" error.

---

## ✅ Final test

Open your Vercel URL (e.g. `https://debateai.vercel.app`) on your phone or any
device:
1. The app loads.
2. Sign in with Google.
3. Run a debate → real Gemini reply appears.
4. Refresh / sign in from another device → your history is still there (Supabase!).

If all four work — **you're deployed.** Anyone with the link can use your app. 🎉

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `git push` rejected / asks password | Use GitHub CLI (`gh auth login`) or a Personal Access Token |
| Secret file shows in `git status` | Don't commit. Verify `.gitignore` lines for `.env`, `*.json`, `.env.local` |
| Render build fails | Check Root Directory = `backend`, Build = `pip install -r requirements.txt` |
| Health shows `firebase_auth: dev-mode` on Render | `FIREBASE_CREDENTIALS_JSON` missing/malformed — re-paste the full JSON |
| Health shows `google: false` on Render | `GOOGLE_API_KEY` not set in Render env vars |
| Site loads but login fails | Add Vercel domain to Firebase Authorized domains (4E-2) |
| Login works but AI/data calls fail (CORS error in console) | Set `CORS_ORIGINS` on Render to your Vercel URL (4E-1) |
| Data resets | Confirm `DATABASE_URL` on Render points to Supabase, prefix `postgresql+psycopg2://` |
| First request very slow | Render free tier waking from sleep — normal (~30-60s) |

---

## Custom domain (optional, later)
After it works on the `.vercel.app` URL, you can buy a real domain (~$12/yr) from
Namecheap/Google Domains/Cloudflare. Note: `debate.ai.com` is NOT available (ai.com
is owned by someone else). Realistic options: `debateai.app`, `getdebateai.com`,
`trydebateai.com`, etc. Vercel → your project → Settings → Domains → Add, then
follow their DNS instructions. Also add the new domain to Firebase Authorized
domains and to `CORS_ORIGINS`.

---

## 📋 Context paragraph for a fresh chat
Paste this into a new chat so it has full context:

> I'm building DebateAI (React + Vite frontend, FastAPI + SQLAlchemy backend,
> Firebase auth, Google Gemini AI). Phases 1-3 are DONE and verified working
> locally: app runs (backend :8000, frontend :5173), real Gemini replies work in
> the app, Firebase login works, backend verifies tokens (`firebase_auth: enabled`,
> `google: true`). Project path: `C:\Users\Administrator\Downloads\debateai\debate-ai-frontend`.
> The backend supports `FIREBASE_CREDENTIALS_JSON` (env var) and `DATABASE_URL` for
> Postgres. Firebase project id is `debateai1`. I'm now doing Phase 4 (deploy):
> GitHub + Supabase + Render (backend) + Vercel (frontend). I'm on [stage], and
> [what's happening / where I'm stuck].
