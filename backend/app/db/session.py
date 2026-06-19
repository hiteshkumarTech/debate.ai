"""
Database setup: engine, session factory, and the declarative Base that
all models inherit from. Works with both SQLite (local dev) and Postgres
(production) — the only difference is the DATABASE_URL and one SQLite-only
connect arg.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False to be used across FastAPI's
# threadpool; Postgres ignores connect_args entirely.
_is_sqlite = settings.database_url.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    # pool_pre_ping avoids stale-connection errors on managed Postgres
    # (Supabase closes idle connections); harmless on SQLite.
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
