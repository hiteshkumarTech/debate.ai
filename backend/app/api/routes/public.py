"""
/api/public - the public "Explore" gallery. Users opt in by publishing a
completed debate. Published debates are browsable by anyone (no auth),
can be liked (auth required), and track a view counter.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession, joinedload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.entities import (
    DebateLike,
    Message,
    PublicDebate,
    Session as SessionModel,
    User,
)
from app.schemas.api import (
    LikeResult,
    MessageOut,
    PublicDebateCard,
    PublicDebateDetail,
    PublishRequest,
)

router = APIRouter(prefix="/api/public", tags=["public"])


def _card(pd: PublicDebate) -> PublicDebateCard:
    return PublicDebateCard(
        id=pd.id,
        session_id=pd.session_id,
        title=pd.title,
        category=pd.category,
        ai_model=pd.ai_model,
        side=pd.side,
        personality=pd.personality,
        score_overall=pd.score_overall,
        views=pd.views,
        likes_count=pd.likes_count,
        author_name=(pd.user.display_name if pd.user and pd.user.display_name else "Anonymous"),
        published_at=pd.published_at,
    )


@router.post("/debates", response_model=PublicDebateCard, status_code=status.HTTP_201_CREATED)
def publish_debate(
    body: PublishRequest,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == body.session_id, SessionModel.user_id == user.id)
        .first()
    )
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if session.kind != "debate":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only debates can be published.")
    if session.status != "completed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Finish and score the debate before publishing.")

    existing = db.query(PublicDebate).filter(PublicDebate.session_id == session.id).first()
    if existing:
        return _card(existing)  # idempotent

    pd = PublicDebate(
        session_id=session.id,
        user_id=user.id,
        title=session.topic,
        category=body.category,
        ai_model=session.ai_model,
        side=session.side,
        personality=session.personality,
        score_overall=session.score_overall,
    )
    db.add(pd)
    db.commit()
    db.refresh(pd)
    return _card(pd)


@router.delete("/debates/{public_id}", status_code=status.HTTP_204_NO_CONTENT)
def unpublish_debate(
    public_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    pd = db.query(PublicDebate).filter(PublicDebate.id == public_id).first()
    if pd is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    if pd.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only unpublish your own debates.")
    db.delete(pd)
    db.commit()


@router.get("/debates", response_model=list[PublicDebateCard])
def list_public_debates(
    db: DBSession = Depends(get_db),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    sort: str = Query(default="newest"),
    limit: int = Query(default=30, le=60),
    offset: int = Query(default=0, ge=0),
):
    q = db.query(PublicDebate).options(joinedload(PublicDebate.user))

    if search:
        q = q.filter(PublicDebate.title.ilike(f"%{search}%"))
    if category and category.lower() != "all":
        q = q.filter(PublicDebate.category == category)

    if sort == "popular":
        q = q.order_by(PublicDebate.likes_count.desc(), PublicDebate.published_at.desc())
    elif sort == "top":
        q = q.filter(PublicDebate.score_overall.isnot(None)).order_by(
            PublicDebate.score_overall.desc(), PublicDebate.published_at.desc()
        )
    elif sort == "trending":
        engagement = PublicDebate.likes_count * 3 + PublicDebate.views
        q = q.order_by(engagement.desc(), PublicDebate.published_at.desc())
    else:  # newest
        q = q.order_by(PublicDebate.published_at.desc())

    rows = q.offset(offset).limit(limit).all()
    return [_card(pd) for pd in rows]


@router.get("/debates/{public_id}", response_model=PublicDebateDetail)
def get_public_debate(public_id: int, db: DBSession = Depends(get_db)):
    pd = (
        db.query(PublicDebate)
        .options(joinedload(PublicDebate.user))
        .filter(PublicDebate.id == public_id)
        .first()
    )
    if pd is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    msgs = (
        db.query(Message)
        .filter(Message.session_id == pd.session_id)
        .order_by(Message.turn_index)
        .all()
    )
    card = _card(pd)
    return PublicDebateDetail(**card.model_dump(), messages=[MessageOut.model_validate(m) for m in msgs])


@router.post("/debates/{public_id}/view")
def add_view(public_id: int, db: DBSession = Depends(get_db)):
    pd = db.query(PublicDebate).filter(PublicDebate.id == public_id).first()
    if pd is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    pd.views = (pd.views or 0) + 1
    db.commit()
    return {"views": pd.views}


@router.post("/debates/{public_id}/like", response_model=LikeResult)
def toggle_like(
    public_id: int,
    user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    pd = db.query(PublicDebate).filter(PublicDebate.id == public_id).first()
    if pd is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
    existing = (
        db.query(DebateLike)
        .filter(DebateLike.public_debate_id == public_id, DebateLike.user_id == user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        pd.likes_count = max(0, (pd.likes_count or 0) - 1)
        liked = False
    else:
        db.add(DebateLike(public_debate_id=public_id, user_id=user.id))
        pd.likes_count = (pd.likes_count or 0) + 1
        liked = True
    db.commit()
    return LikeResult(liked=liked, likes_count=pd.likes_count)


@router.get("/me/likes", response_model=list[int])
def my_likes(user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    rows = db.query(DebateLike.public_debate_id).filter(DebateLike.user_id == user.id).all()
    return [r[0] for r in rows]