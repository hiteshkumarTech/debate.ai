# DebateAI Backend

FastAPI + SQLAlchemy backend for DebateAI. Provider-agnostic AI, Firebase
token auth, and real session/transcript/score persistence — the foundation
that turns the frontend's placeholders into real features.

## What this gives you (real, today)

- **Session persistence** — debates and interviews are stored, with full
  transcripts, so History, Progress, and Resume Session become real.
- **Server-side scoring** — the same scoring logic as the frontend, ported
  to Python and unit-tested for parity.
- **Analytics** — streak, average, weekly trend, strongest/weakest topic,
  computed from stored sessions.
- **Leaderboard** — ranks real users by average score (padded with clearly
  labeled placeholders until there's a real user pool).
- **Provider-agnostic AI** — Claude / GPT / Gemini behind one interface.
  With no key set, a labeled echo fallback keeps everything runnable.

## Run it locally (zero config)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/docs for interactive API docs.

With no `.env`, it runs on SQLite, in **dev-mode auth** (send an
`X-Dev-User: <anything>` header instead of a real token), with the **echo**
AI fallback. That's enough to exercise the entire API.

## Turn on real services

Copy `.env.example` to `.env` and fill in:

- **Postgres (Supabase):** set `DATABASE_URL` to your Supabase connection
  string. Tables auto-create on startup.
- **Firebase auth:** set `FIREBASE_CREDENTIALS_PATH` to your service-account
  JSON. The backend then verifies the same Firebase ID tokens your frontend
  already issues — no frontend auth changes needed.
- **AI:** set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and/or `GOOGLE_API_KEY`.
  The frontend's model picker (`claude` / `gpt-5.5` / `gemini`) maps to
  whichever provider has a key.

## Run the tests

```bash
source .venv/bin/activate
python -m pytest -v
```

`tests/test_scoring.py` checks scoring parity with the frontend.
`tests/test_api.py` drives the full session lifecycle end-to-end against a
real SQLite DB.

## API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + config visibility (no secrets) |
| GET | `/api/me` | Current user (auth) |
| POST | `/api/ai/reply` | AI's next debate/interview turn |
| POST | `/api/sessions` | Create a session |
| GET | `/api/sessions` | List sessions (History) — filter `?kind=&status=` |
| GET | `/api/sessions/active` | Resumable (unfinished) sessions |
| GET | `/api/sessions/{id}` | One session + transcript |
| POST | `/api/sessions/{id}/messages` | Append transcript turns |
| POST | `/api/sessions/{id}/complete` | Finalize + score |
| DELETE | `/api/sessions/{id}` | Delete a session |
| GET | `/api/analytics` | Streak, averages, weekly trend |
| GET | `/api/leaderboard` | Ranked board |

All routes except `/api/health` and `/` require auth.

## Connecting the frontend

Point the frontend at this base URL and attach the Firebase ID token as
`Authorization: Bearer <token>` (the token from the user you already sign
in with Firebase). In local dev without Firebase configured, send
`X-Dev-User: <id>` instead. The session/score shapes returned here mirror
the frontend's existing localStorage records, so the migration is
mechanical.

## Architecture

```
app/
  core/        config (env settings), auth (Firebase token verification)
  db/          SQLAlchemy engine + session
  models/      ORM models: User, Session, Message
  schemas/     Pydantic request/response contracts
  services/    scoring, prompts, analytics, ai_providers/ (the agnostic layer)
  api/routes/  ai, sessions, analytics — the HTTP surface
  main.py      app wiring: CORS, routers, table creation
```

### Notes & next steps
- Tables auto-create via `metadata.create_all`. For evolving a production
  schema safely, add **Alembic** migrations.
- The scoring engine is still a heuristic; the service layer is structured
  so a real-AI-evaluation call can replace `score_session` without touching
  routes.
- Real-time sparring (WebSockets), persona storage, and the curriculum
  engine from the broader roadmap build on top of these models.
```
