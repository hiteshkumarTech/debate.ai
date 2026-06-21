"""
Database models for DebateAI.

Design notes:
- A `Session` represents one debate OR one interview (distinguished by
  `kind`), unifying storage so History/Progress/Leaderboard read from one
  place. This mirrors the frontend's existing localStorage shape where
  interview entries are just debates tagged kind='interview'.
- `status` ('active' | 'completed' | 'abandoned') is what makes the
  brief's "Resume Session" feature possible â€” an 'active' session can be
  picked back up.
- Transcript turns live in `Message`, one row per turn, so full
  transcripts can be stored, searched, and exported.
- Scores are stored as columns (not a blob) so leaderboards and analytics
  can aggregate with plain SQL.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    # Firebase UID â€” the stable identity from the frontend's existing auth.
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(320), nullable=True)
    display_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # 'debate' | 'interview'
    kind = Column(String(20), nullable=False, default="debate")
    # 'active' | 'completed' | 'abandoned'  â€” drives Resume Session
    status = Column(String(20), nullable=False, default="active")

    # Shared framing
    topic = Column(Text, nullable=False)
    ai_model = Column(String(60), nullable=True)

    # Debate-specific (nullable so interviews can leave them empty)
    side = Column(String(20), nullable=True)            # 'for' | 'against'
    personality = Column(String(60), nullable=True)     # opponent persona id

    # Interview-specific
    category = Column(String(60), nullable=True)        # 'Behavioral' etc.
    company = Column(String(120), nullable=True)
    difficulty = Column(String(20), nullable=True)      # future: easy/med/hard

    # Scores (0-100). Null until the session is completed and scored.
    score_overall = Column(Integer, nullable=True)
    score_logic = Column(Integer, nullable=True)
    score_evidence = Column(Integer, nullable=True)
    score_clarity = Column(Integer, nullable=True)
    score_persuasiveness = Column(Integer, nullable=True)

    # Written feedback from AI evaluation (empty for heuristic scoring).
    # strengths/improvements are stored as JSON-encoded text for portability
    # across SQLite and Postgres. `score_source` is 'heuristic' | 'ai'.
    feedback_summary = Column(Text, nullable=True)
    feedback_strengths = Column(Text, nullable=True)      # JSON array string
    feedback_improvements = Column(Text, nullable=True)   # JSON array string
    score_source = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.turn_index",
    )

    __table_args__ = (
        # Fast lookups for History (a user's sessions) and Resume
        # (a user's active sessions).
        Index("ix_sessions_user_status", "user_id", "status"),
        Index("ix_sessions_user_kind", "user_id", "kind"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(
        Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    # 'user' | 'ai'
    sender = Column(String(10), nullable=False)
    content = Column(Text, nullable=False)
    # 0-based order within the session, so transcripts reconstruct exactly.
    turn_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session = relationship("Session", back_populates="messages")

    __table_args__ = (
        Index("ix_messages_session_turn", "session_id", "turn_index"),
    )


class Persona(Base):
    """A user-created custom AI opponent. The `instruction` is the style
    text fed into the debate prompt (the same slot the built-in
    personalities fill), so a custom persona behaves exactly like a built-in
    one â€” just authored by the user."""
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(80), nullable=False)
    icon = Column(String(16), nullable=True)         # an emoji, optional
    # The behavioral instruction injected into the system prompt.
    instruction = Column(Text, nullable=False)
    # 'gentle' | 'balanced' | 'intense' â€” a coarse difficulty hint, optional.
    intensity = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_personas_user", "user_id"),
    )


class PublicDebate(Base):
    """A completed debate a user has chosen to share to the public Explore
    gallery. Display fields are snapshotted at publish time so the gallery
    lists fast and stays stable if the source session changes. Kept in its
    own table (not columns on `sessions`) so create_all builds it with no
    migration on the existing table."""
    __tablename__ = "public_debates"

    id = Column(Integer, primary_key=True)
    session_id = Column(
        Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(Text, nullable=False)            # the debate topic
    category = Column(String(60), nullable=True)    # topic category, e.g. 'Technology'
    ai_model = Column(String(60), nullable=True)
    side = Column(String(20), nullable=True)
    personality = Column(String(60), nullable=True)
    score_overall = Column(Integer, nullable=True)

    views = Column(Integer, nullable=False, default=0)
    likes_count = Column(Integer, nullable=False, default=0)

    published_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User")
    session = relationship("Session")
    likes = relationship(
        "DebateLike", back_populates="public_debate", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_public_debates_published", "published_at"),
        Index("ix_public_debates_category", "category"),
    )


class DebateLike(Base):
    """One like, by one user, on one published debate (unique per pair)."""
    __tablename__ = "debate_likes"

    id = Column(Integer, primary_key=True)
    public_debate_id = Column(
        Integer, ForeignKey("public_debates.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    public_debate = relationship("PublicDebate", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("public_debate_id", "user_id", name="uq_debate_like"),
        Index("ix_debate_likes_pd", "public_debate_id"),
    )
