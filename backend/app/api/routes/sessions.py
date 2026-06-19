"""
/api/sessions — create, list, fetch, resume, and complete debate/interview
sessions. This is what turns History, Progress, transcript storage, and
Resume Session from localStorage placeholders into real server-backed
features.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.entities import Message, Session as SessionModel, User
from app.schemas.api import (
    SessionComplete,
    SessionCreate,
    SessionDetail,
    SessionSummary,
)
from app.services.ai_evaluation import evaluate_session

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _owned_or_404(db: DBSession, session_id: int, user: User) -> SessionModel:
    s = (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id, SessionModel.user_id == user.id)
        .first()
    )
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    return s


@router.post("", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
def create_session(
    body: SessionCreate,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    s = SessionModel(
        user_id=user.id,
        kind=body.kind,
        status="active",
        topic=body.topic,
        ai_model=body.ai_model,
        side=body.side,
        personality=body.personality,
        category=body.category,
        company=body.company,
        difficulty=body.difficulty,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("", response_model=list[SessionSummary])
def list_sessions(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
    kind: str | None = Query(default=None, description="filter: debate|interview"),
    status_filter: str | None = Query(
        default=None, alias="status", description="filter: active|completed|abandoned"
    ),
):
    q = db.query(SessionModel).filter(SessionModel.user_id == user.id)
    if kind:
        q = q.filter(SessionModel.kind == kind)
    if status_filter:
        q = q.filter(SessionModel.status == status_filter)
    return q.order_by(SessionModel.created_at.desc()).all()


@router.get("/active", response_model=list[SessionSummary])
def list_resumable(
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Powers Resume Session: a user's still-active (unfinished) sessions."""
    return (
        db.query(SessionModel)
        .filter(SessionModel.user_id == user.id, SessionModel.status == "active")
        .order_by(SessionModel.created_at.desc())
        .all()
    )


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    return _owned_or_404(db, session_id, user)


@router.post("/{session_id}/messages", response_model=SessionDetail)
def append_messages(
    session_id: int,
    body: SessionComplete,  # reuse: a list of messages
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Persist transcript turns as they happen, so an interrupted session
    can still be resumed with its history intact."""
    s = _owned_or_404(db, session_id, user)
    if s.status != "active":
        raise HTTPException(status.HTTP_409_CONFLICT, "Session is not active.")

    existing = db.query(Message).filter(Message.session_id == s.id).count()
    for i, m in enumerate(body.messages):
        db.add(
            Message(
                session_id=s.id,
                sender=m.sender,
                content=m.content,
                turn_index=existing + i,
            )
        )
    db.commit()
    db.refresh(s)
    return s


@router.post("/{session_id}/complete", response_model=SessionDetail)
def complete_session(
    session_id: int,
    body: SessionComplete,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Finalize a session: store the full transcript, score it, mark
    completed. Idempotency guard prevents double-scoring."""
    s = _owned_or_404(db, session_id, user)
    if s.status == "completed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Session already completed.")

    # Replace any partial transcript with the authoritative full one.
    db.query(Message).filter(Message.session_id == s.id).delete()
    for i, m in enumerate(body.messages):
        db.add(
            Message(session_id=s.id, sender=m.sender, content=m.content, turn_index=i)
        )

    # Evaluate with the AI when a key is configured; falls back to the
    # heuristic automatically (never raises). Pass the session's model so
    # the same provider the user debated with does the grading.
    result = evaluate_session(
        [{"sender": m.sender, "content": m.content} for m in body.messages],
        personality=s.personality,
        ai_model=s.ai_model,
    )
    s.score_overall = result.overall
    s.score_logic = result.logic
    s.score_evidence = result.evidence
    s.score_clarity = result.clarity
    s.score_persuasiveness = result.persuasiveness
    s.score_source = result.source
    s.feedback_summary = result.summary or None
    s.feedback_strengths = json.dumps(result.strengths) if result.strengths else None
    s.feedback_improvements = json.dumps(result.improvements) if result.improvements else None
    s.status = "completed"
    s.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(s)
    return s


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    s = _owned_or_404(db, session_id, user)
    db.delete(s)
    db.commit()
