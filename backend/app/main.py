"""
FastAPI application entrypoint. Wires CORS, registers routers, and creates
tables on startup.

Run locally:  uvicorn app.main:app --reload --port 8000
Interactive docs:  http://localhost:8000/docs

Table creation uses metadata.create_all for simplicity. For production
schema changes over time, switch to Alembic migrations (see ARCHITECTURE).
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import Base, engine
from app.models import entities  # noqa: F401 - registers models on Base
from app.api.routes import ai, sessions, analytics, personas, public

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist. Safe to run every startup.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(sessions.router)
app.include_router(personas.router)
app.include_router(public.router)


@app.get("/")
def root():
    return {"service": settings.app_name, "docs": "/docs", "health": "/api/health"}
