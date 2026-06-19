# DebateAI — Complete Setup Guide (Get It Running For Real)

This is the step-by-step to take the project from "downloaded code" to "fully
working app" with real AI, real accounts, and real saved data. Follow it in
order. Every command and file name here was checked against the actual code.

There are **4 phases**. You can stop after any phase and still have a working
app — each phase unlocks more.

- **Phase 1** — Run it locally with zero keys (proves the code works on your machine).
- **Phase 2** — Add real AI (Claude / GPT / Gemini) so debates, interviews, and scoring are real.
- **Phase 3** — Add Firebase login + cloud database so accounts and history sync.
- **Phase 4** — Deploy it to the internet (optional).

Prerequisites: **Node.js 18+** and **Python 3.10+** installed. Check with
`node --version` and `python --version` (or `python3 --version`).

---

## PHASE 1 — Run locally, zero config (~10 min)

This proves everything works before you spend a cent or set up any account.
With no keys, the app uses local mock AI + browser storage — fully functional.

### 1a. Start the backend

Open a terminal in the project's `backend/` folder:

```bash
cd backend
python -m venv .venv

# Activate the virtual environment:
#   Windows (PowerShell):  .venv\Scripts\Activate.ps1
#   Windows (cmd):         .venv\Scripts\activate.bat
#   Mac/Linux:             source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`. Leave this running.

**Verify it works:** open http://localhost:8000/api/health in a browser.
You should see JSON like `{"status":"ok", ...}`. Also try
http://localhost:8000/docs for the interactive API explorer.

> If `uvicorn` isn't found, your venv isn't activated — redo the activate step.

### 1b. Start the frontend

Open a **second** terminal in the project root (the folder with `package.json`):

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The app loads. You can
run a debate or interview right now — replies are local mock text, scores are
the heuristic, and history saves in your browser. **This is the baseline.**

✅ **Phase 1 done** when both servers run and you can complete a debate.

---

## PHASE 2 — Add real AI (~10 min, costs pennies)

This makes AI opponents, the interviewer, and scoring use a real model.
You only need **one** provider. Claude is the configured default.

### 2a. Get an API key (pick one)

- **Anthropic (Claude):** https://console.anthropic.com → API Keys → Create.
  Key looks like `sk-ant-...`
- **OpenAI (GPT):** https://platform.openai.com/api-keys → Create. Key `sk-...`
- **Google (Gemini):** https://aistudio.google.com/app/apikey → Create.

You'll need a few dollars of credit on the account. Debate replies and scoring
are short calls — this costs cents, not dollars, for normal use.

### 2b. Create the backend `.env` file

In `backend/`, copy the example and edit it:

```bash
# from backend/
cp .env.example .env      # Windows: copy .env.example .env
```

Open `backend/.env` and set the key for the provider you chose. For Claude:

```
DEFAULT_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

(For GPT use `OPENAI_API_KEY` + `DEFAULT_AI_PROVIDER=openai`; for Gemini use
`GOOGLE_API_KEY` + `DEFAULT_AI_PROVIDER=google`.)

### 2c. Restart the backend

Stop uvicorn (Ctrl+C) and start it again (`uvicorn app.main:app --reload --port 8000`).
Check http://localhost:8000/api/health — under `ai_keys_present` your provider
should now show `true`.

### 2d. Point the frontend at the backend

In the **project root**, create `.env.local`:

```
VITE_API_URL=http://localhost:8000
```

Restart `npm run dev` (Vite only reads env files at startup).

> **Important nuance:** the app only calls the backend when you're **signed in**.
> Without Firebase (Phase 3) you can't sign in through the UI, so the frontend
> still uses local mock replies even with the key set. To test real AI *before*
> doing Phase 3, use the API docs directly: open http://localhost:8000/docs,
> try `POST /api/ai/reply` with header `X-Dev-User: test` and a sample body —
> you'll get a real model reply. Full in-app real AI arrives once Phase 3 adds
> sign-in.

✅ **Phase 2 done** when `/api/health` shows your key present and `/docs`
`POST /api/ai/reply` returns a real (non-placeholder) reply.

---

## PHASE 3 — Firebase login + cloud database (~25 min)

This unlocks real accounts, cross-device sync, leaderboards with real users,
and makes in-app AI work (since the app calls the backend only when signed in).

### 3a. Create a Firebase project + web app

1. Go to https://console.firebase.google.com → Add project.
2. Once created, click the **Web** icon (`</>`) to add a web app. Name it.
3. Firebase shows a `firebaseConfig` object. Keep that tab open — you need
   those 6 values next.
4. In the console: **Build → Authentication → Get started**. Enable
   **Google** and **Email/Password** sign-in methods.

### 3b. Frontend Firebase config

In the **project root**, create `.env.local` (or add to the one from Phase 2)
with the 6 values from your `firebaseConfig`:

```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...:web:abc...
```

Restart `npm run dev`. You should now be able to sign in through the app's UI.

### 3c. Backend Firebase Admin (verifies the login tokens)

1. Firebase console → **Project Settings (gear) → Service accounts**.
2. Click **Generate new private key** → downloads a JSON file.
3. Put that file in `backend/` (e.g. `backend/firebase-service-account.json`).
   **Never commit it** — it's already covered by `.gitignore`.
4. In `backend/.env`, add the path:

```
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
```

Restart the backend. `/api/health` should now show `"firebase_auth":"enabled"`.

### 3d. Database — local Postgres or Supabase (recommended)

By default the backend uses a local SQLite file (`backend/debateai.db`) — fine
for testing. For real cloud storage, use **Supabase** (free tier):

1. https://supabase.com → New project. Set a database password.
2. Project → **Settings → Database → Connection string → URI**. Copy it.
3. In `backend/.env` set (note the `+psycopg2`):

```
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

4. Restart the backend. Tables are created automatically on startup.

> If you get a Postgres connection error, double-check the password and that
> you used `postgresql+psycopg2://` (not plain `postgresql://`).

✅ **Phase 3 done** when you can: sign in through the app, run a debate, refresh
the page, and still see it in History (it's now in the database, not just the
browser). Two different signed-in users will see each other on the leaderboard.

---

## PHASE 4 — Deploy to the internet (optional)

Recommended split: **frontend on Vercel**, **backend on Render**.

### Backend on Render
1. Push the project to GitHub.
2. https://render.com → New → Web Service → connect the repo, root = `backend`.
3. Build command: `pip install -r requirements.txt`
   Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the same environment variables from `backend/.env` (DATABASE_URL,
   FIREBASE_CREDENTIALS_PATH or the JSON contents, your AI key). For the
   Firebase JSON on Render, the simplest path is to paste its contents into a
   secret file and point `FIREBASE_CREDENTIALS_PATH` at it.
5. Note the deployed URL, e.g. `https://debateai-api.onrender.com`.

### Frontend on Vercel
1. https://vercel.com → New Project → import the repo (root = project root).
2. Framework preset: **Vite**. Build: `npm run build`, output: `dist`.
3. Add env vars: all 6 `VITE_FIREBASE_*` plus
   `VITE_API_URL=https://debateai-api.onrender.com` (your Render URL).
4. Deploy.

### Two must-do wiring steps after deploy
- **CORS:** in the backend's env on Render, set
  `CORS_ORIGINS=https://your-app.vercel.app` (your real frontend URL) so the
  browser is allowed to call the API.
- **Firebase authorized domains:** Firebase console → Authentication →
  Settings → Authorized domains → add your Vercel domain, or Google sign-in
  will be blocked.

✅ **Phase 4 done** when the public URL works end-to-end for a signed-in user.

---

## Quick troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `uvicorn: command not found` | venv not activated — redo the activate step |
| Health shows `ai_keys_present` all false | key not in `backend/.env`, or backend not restarted |
| In-app replies still look like placeholders | you're not signed in (Phase 3), or `VITE_API_URL` unset / Vite not restarted |
| `firebase_auth: dev-mode` in health | `FIREBASE_CREDENTIALS_PATH` not set or file path wrong |
| Browser console: CORS error | add your frontend URL to `CORS_ORIGINS` and restart backend |
| Google sign-in popup blocked on deployed site | add the domain to Firebase Authorized domains |
| Postgres connection refused | check password; use `postgresql+psycopg2://` prefix |
| History empties on refresh | you're on local storage — finish Phase 3 (DB + sign-in) |

## What "real" each phase unlocks
- After **Phase 2**: real AI scoring + replies are reachable (via /docs, and in-app after Phase 3).
- After **Phase 3**: real accounts, cloud-saved history, cross-device sync, real-user leaderboard, in-app real AI.
- After **Phase 4**: anyone can use it at a public URL.

Run the backend tests anytime with: `cd backend && pytest -q` (23 tests).
