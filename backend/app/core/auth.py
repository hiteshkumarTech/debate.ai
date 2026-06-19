"""
Authentication: resolves the current user from a Firebase ID token sent
by the frontend as `Authorization: Bearer <token>`.

Two modes:
- PRODUCTION (firebase_credentials_path set): the Firebase Admin SDK
  verifies the token cryptographically. Real, secure.
- DEV (no credentials configured): the SDK isn't initialized, so instead
  the backend trusts an `X-Dev-User: <uid>` header. This lets you run and
  test the whole API locally before Firebase is wired, WITHOUT shipping an
  insecure path to prod — the moment a credentials path exists, dev mode
  is unreachable.

Either way, the dependency upserts a User row and returns it, so routes
just depend on `get_current_user` and get a real DB-backed user.
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.entities import User

# Initialize Firebase Admin once, only if configured. Import is lazy so the
# package isn't required for local dev / tests.
_firebase_ready = False
_firebase_auth = None


def _ensure_firebase():
    global _firebase_ready, _firebase_auth
    if _firebase_ready:
        return
    settings = get_settings()
    if not settings.firebase_enabled:
        return
    import firebase_admin
    from firebase_admin import credentials, auth as fb_auth

    if not firebase_admin._apps:
        # Two ways to supply the service account:
        #  1. FIREBASE_CREDENTIALS_JSON — the raw JSON *contents* (used in
        #     deployment, e.g. Render, where secrets are env vars, not files).
        #  2. FIREBASE_CREDENTIALS_PATH — a path to the JSON file (local dev).
        # JSON content takes precedence so prod doesn't depend on a committed
        # file (the service-account key must never be committed).
        if settings.firebase_credentials_json:
            import json
            info = json.loads(settings.firebase_credentials_json)
            cred = credentials.Certificate(info)
        else:
            cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
    _firebase_auth = fb_auth
    _firebase_ready = True


def _upsert_user(db: DBSession, uid: str, email: str | None, name: str | None) -> User:
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user is None:
        user = User(firebase_uid=uid, email=email, display_name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Keep email/name fresh if they changed, but don't thrash the DB.
        changed = False
        if email and user.email != email:
            user.email = email
            changed = True
        if name and user.display_name != name:
            user.display_name = name
            changed = True
        if changed:
            db.commit()
            db.refresh(user)
    return user


def get_current_user(
    authorization: str | None = Header(default=None),
    x_dev_user: str | None = Header(default=None),
    db: DBSession = Depends(get_db),
) -> User:
    settings = get_settings()

    # --- Production path: verify a real Firebase token ---
    if settings.firebase_enabled:
        _ensure_firebase()
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or malformed Authorization header.",
            )
        token = authorization.split(" ", 1)[1].strip()
        try:
            decoded = _firebase_auth.verify_id_token(token)
        except Exception as e:  # noqa: BLE001 - normalize verification errors
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
            ) from e
        return _upsert_user(
            db,
            uid=decoded["uid"],
            email=decoded.get("email"),
            name=decoded.get("name"),
        )

    # --- Dev path: no Firebase configured, trust X-Dev-User ---
    if not x_dev_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Auth not configured. For local dev, send an 'X-Dev-User: <id>' "
                "header. For production, set FIREBASE_CREDENTIALS_PATH."
            ),
        )
    return _upsert_user(db, uid=f"dev:{x_dev_user}", email=None, name=x_dev_user)
