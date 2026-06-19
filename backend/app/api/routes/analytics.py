"""
/api/analytics, /api/leaderboard, and /api/health.
The first two are thin wrappers over the analytics service; health is an
unauthenticated liveness check.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.entities import User
from app.schemas.api import AnalyticsOut, LeaderboardOut, UserOut
from app.services.analytics import compute_analytics, compute_leaderboard

router = APIRouter(tags=["analytics"])


@router.get("/api/health")
def health():
    """Liveness + config visibility (no secrets). Useful for deploy checks."""
    s = get_settings()
    return {
        "status": "ok",
        "environment": s.environment,
        "firebase_auth": "enabled" if s.firebase_enabled else "dev-mode",
        "default_ai_provider": s.default_ai_provider,
        "ai_keys_present": {
            "anthropic": bool(s.anthropic_api_key),
            "openai": bool(s.openai_api_key),
            "google": bool(s.google_api_key),
        },
    }


@router.get("/api/me", response_model=UserOut)
def whoami(user: User = Depends(get_current_user)):
    return user


@router.get("/api/analytics", response_model=AnalyticsOut)
def analytics(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    return compute_analytics(db, user.id)


@router.get("/api/leaderboard", response_model=LeaderboardOut)
def leaderboard(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    return compute_leaderboard(db, user.id)
