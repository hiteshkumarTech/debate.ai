"""
Scoring engine — a faithful Python port of the frontend's
src/utils/scoreDebate.js, so a session scores the same whether computed in
the browser or here. Keeping them identical avoids confusing users with
two different numbers for the same transcript.

Honest note: this is still a heuristic, not real AI evaluation. It rewards
engagement, message length in a sensible range, and citation-like
language. The real-AI-evaluation upgrade plugs in at the service layer
(see services/scoring_service) without changing this function's contract.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict, field

_PERSONALITY_DIFFICULTY = {
    "friendly-teacher": 0.85,
    "strict-professor": 1.0,
    "aggressive-opponent": 1.18,
    "job-interviewer": 1.05,
}

_EVIDENCE_RE = re.compile(
    r"\d|study|research|report|according to|source|data|statistics|%",
    re.IGNORECASE,
)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _has_evidence(text: str) -> bool:
    return bool(_EVIDENCE_RE.search(text))


@dataclass
class ScoreResult:
    overall: int
    logic: int
    evidence: int
    clarity: int
    persuasiveness: int
    message_count: int
    incomplete: bool
    # Optional written feedback. The heuristic scorer leaves these empty;
    # the AI evaluator fills them in. `source` distinguishes which scorer
    # produced the result ('heuristic' | 'ai').
    summary: str = ""
    strengths: list = field(default_factory=list)
    improvements: list = field(default_factory=list)
    source: str = "heuristic"

    def as_dict(self) -> dict:
        return asdict(self)


def score_session(messages: list[dict], personality: str | None = None) -> ScoreResult:
    """
    messages: list of {"sender": "user"|"ai", "content": str}
    personality: opponent id, or None for interviews (neutral 1.0 multiplier)
    """
    user_messages = [m for m in messages if m.get("sender") == "user"]
    count = len(user_messages)

    if count == 0:
        return ScoreResult(0, 0, 0, 0, 0, 0, True)

    avg_len = sum(len(m.get("content", "")) for m in user_messages) / count
    evidence_rate = sum(1 for m in user_messages if _has_evidence(m.get("content", ""))) / count

    engagement = _clamp((count / 6) * 100, 30, 100)
    clarity_raw = _clamp(100 - abs(avg_len - 150) * 0.35, 25, 100)
    evidence_raw = _clamp(35 + evidence_rate * 65, 20, 100)
    logic_raw = _clamp(engagement * 0.5 + clarity_raw * 0.5, 25, 100)
    persuasion_raw = _clamp(logic_raw * 0.4 + evidence_raw * 0.3 + clarity_raw * 0.3, 25, 100)

    mult = _PERSONALITY_DIFFICULTY.get(personality, 1.0)

    def adjust(v: float) -> int:
        return round(_clamp(v / mult, 10, 100))

    logic = adjust(logic_raw)
    evidence = adjust(evidence_raw)
    clarity = adjust(clarity_raw)
    persuasiveness = adjust(persuasion_raw)
    overall = round((logic + evidence + clarity + persuasiveness) / 4)

    return ScoreResult(
        overall=overall,
        logic=logic,
        evidence=evidence,
        clarity=clarity,
        persuasiveness=persuasiveness,
        message_count=count,
        incomplete=False,
    )
