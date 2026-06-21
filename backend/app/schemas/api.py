"""
Request/response schemas. These define the API contract the frontend
codes against. Kept separate from DB models so the wire format can evolve
independently of storage.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------- Shared ----------
class MessageIn(BaseModel):
    sender: Literal["user", "ai"]
    content: str


class MessageOut(BaseModel):
    sender: str
    content: str
    turn_index: int

    model_config = {"from_attributes": True}


class ScoreOut(BaseModel):
    overall: int
    logic: int
    evidence: int
    clarity: int
    persuasiveness: int
    message_count: int
    incomplete: bool


# ---------- Auth ----------
class UserOut(BaseModel):
    id: int
    email: Optional[str] = None
    display_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------- AI turn (live debate/interview reply) ----------
class ReplyRequest(BaseModel):
    """Ask the AI for its next turn given the conversation so far."""
    kind: Literal["debate", "interview"] = "debate"
    topic: str
    history: list[MessageIn] = Field(default_factory=list)
    ai_model: Optional[str] = None  # 'claude' | 'gpt-5.5' | 'gemini' | ...

    # Debate framing
    side: Optional[Literal["for", "against"]] = None
    personality: Optional[str] = None
    # When set, this custom instruction overrides the built-in personality
    # style â€” this is how a saved custom persona drives the AI.
    custom_persona_instruction: Optional[str] = None

    # Interview framing
    category: Optional[str] = None
    company: Optional[str] = None


class ReplyResponse(BaseModel):
    reply: str
    provider: str
    is_live: bool  # False when the echo placeholder produced this


# ---------- Sessions (persistence) ----------
class SessionCreate(BaseModel):
    kind: Literal["debate", "interview"] = "debate"
    topic: str
    ai_model: Optional[str] = None
    side: Optional[str] = None
    personality: Optional[str] = None
    category: Optional[str] = None
    company: Optional[str] = None
    difficulty: Optional[str] = None


class SessionComplete(BaseModel):
    """Submit the full transcript to finalize and score a session."""
    messages: list[MessageIn]


class SessionSummary(BaseModel):
    """Lightweight row for History/Leaderboard lists."""
    id: int
    kind: str
    status: str
    topic: str
    ai_model: Optional[str] = None
    side: Optional[str] = None
    personality: Optional[str] = None
    category: Optional[str] = None
    company: Optional[str] = None
    score_overall: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SessionDetail(SessionSummary):
    """Full session including transcript, per-metric scores, and AI feedback."""
    score_logic: Optional[int] = None
    score_evidence: Optional[int] = None
    score_clarity: Optional[int] = None
    score_persuasiveness: Optional[int] = None
    score_source: Optional[str] = None
    feedback_summary: Optional[str] = None
    feedback_strengths: list[str] = Field(default_factory=list)
    feedback_improvements: list[str] = Field(default_factory=list)
    messages: list[MessageOut] = Field(default_factory=list)

    @field_validator("feedback_strengths", "feedback_improvements", mode="before")
    @classmethod
    def _parse_json_list(cls, v):
        # Stored as a JSON-array string in the DB; expose as a real list.
        if v is None or v == "":
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, ValueError):
                return []
        return []


# ---------- Analytics ----------
class WeeklyPoint(BaseModel):
    label: str
    average: Optional[int] = None
    count: int


class AnalyticsOut(BaseModel):
    total_sessions: int
    total_debates: int
    total_interviews: int
    average_score: int
    streak_days: int
    strongest_topic: Optional[str] = None
    weakest_topic: Optional[str] = None
    weekly: list[WeeklyPoint] = Field(default_factory=list)


# ---------- Leaderboard ----------
class LeaderboardRow(BaseModel):
    rank: int
    name: str
    score: int
    sessions: int
    is_current_user: bool


class LeaderboardOut(BaseModel):
    rows: list[LeaderboardRow]
    current_user_rank: Optional[int] = None


# ---------- Personas (custom AI opponents) ----------
class PersonaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: Optional[str] = None
    instruction: str = Field(min_length=1, max_length=2000)
    intensity: Optional[Literal["gentle", "balanced", "intense"]] = None


class PersonaOut(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    instruction: str
    intensity: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------- Public gallery (Explore) ----------
class PublishRequest(BaseModel):
    session_id: int
    category: Optional[str] = None


class PublicDebateCard(BaseModel):
    id: int
    session_id: int
    title: str
    category: Optional[str] = None
    ai_model: Optional[str] = None
    side: Optional[str] = None
    personality: Optional[str] = None
    score_overall: Optional[int] = None
    views: int
    likes_count: int
    author_name: str
    published_at: datetime


class PublicDebateDetail(PublicDebateCard):
    messages: list[MessageOut] = Field(default_factory=list)


class LikeResult(BaseModel):
    liked: bool
    likes_count: int
