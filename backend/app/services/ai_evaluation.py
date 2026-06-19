"""
AI-based evaluation of a debate/interview transcript. Produces the same
five 0-100 scores the heuristic does (so it's a drop-in for storage), PLUS
written feedback (summary, strengths, improvements) — the real upgrade over
the keyword/length heuristic.

Safety/robustness: this NEVER raises. If there's no live AI provider, or
the model call fails, or its output can't be parsed into valid scores, it
falls back to the heuristic `score_session`. So enabling AI evaluation is
strictly additive — the product keeps working without a key, and a flaky
model response can't break session completion.
"""
from __future__ import annotations

import json
import re

from app.services.scoring import score_session, ScoreResult
from app.services.ai_providers.base import AIMessage, ProviderError
from app.services.ai_providers.factory import get_provider

_EVAL_SYSTEM = (
    "You are an expert debate and interview coach evaluating a transcript. "
    "Score the HUMAN participant only (role 'user'), not the AI. "
    "Return ONLY a JSON object (no prose, no markdown fences) with exactly "
    "these keys:\n"
    '{\n'
    '  "logic": <int 0-100>,          // structure & reasoning quality\n'
    '  "evidence": <int 0-100>,       // use of specifics, facts, examples\n'
    '  "clarity": <int 0-100>,        // how clearly ideas were expressed\n'
    '  "persuasiveness": <int 0-100>, // conviction & rebuttal effectiveness\n'
    '  "summary": "<=2 sentence overall assessment",\n'
    '  "strengths": ["short point", "short point"],\n'
    '  "improvements": ["actionable point", "actionable point"]\n'
    "}\n"
    "Be fair but rigorous. Base scores on what the human actually argued. "
    "Keep strengths/improvements to 2-3 items each, each under 20 words."
)


def _clamp_int(v, lo=0, hi=100) -> int:
    try:
        return max(lo, min(hi, int(round(float(v)))))
    except (TypeError, ValueError):
        return lo


def _extract_json(text: str) -> dict | None:
    """Pull a JSON object out of the model's reply, tolerating stray prose
    or ```json fences."""
    if not text:
        return None
    # Strip code fences if present.
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else None
    if candidate is None:
        # Fall back to the first {...} block.
        brace = re.search(r"\{.*\}", text, re.DOTALL)
        candidate = brace.group(0) if brace else None
    if candidate is None:
        return None
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


def _transcript_to_messages(messages: list[dict]) -> list[AIMessage]:
    """Render the transcript as a single user message for the evaluator, so
    the model sees the whole exchange to grade."""
    lines = []
    for m in messages:
        who = "HUMAN" if m.get("sender") == "user" else "AI"
        lines.append(f"{who}: {m.get('content', '')}")
    return [AIMessage(role="user", content="Transcript to evaluate:\n\n" + "\n".join(lines))]


def evaluate_session(
    messages: list[dict],
    personality: str | None = None,
    ai_model: str | None = None,
) -> ScoreResult:
    """Score a session. Tries AI evaluation; falls back to the heuristic on
    no-key / error / unparseable output. Always returns a ScoreResult."""
    # Compute the heuristic first — it's our fallback AND gives us the
    # canonical message_count / incomplete flags.
    heuristic = score_session(messages, personality)
    if heuristic.incomplete:
        return heuristic  # nothing to evaluate

    provider = get_provider(ai_model)
    if not provider.is_live:
        return heuristic  # no real AI configured

    try:
        raw = provider.generate_reply(_EVAL_SYSTEM, _transcript_to_messages(messages))
    except ProviderError:
        return heuristic

    data = _extract_json(raw)
    if not isinstance(data, dict):
        return heuristic

    # Require the four numeric scores; if any are missing/unparseable we
    # still proceed (clamp handles bad values), but if ALL are absent the
    # response is junk — fall back.
    score_keys = ["logic", "evidence", "clarity", "persuasiveness"]
    if not any(k in data for k in score_keys):
        return heuristic

    logic = _clamp_int(data.get("logic"))
    evidence = _clamp_int(data.get("evidence"))
    clarity = _clamp_int(data.get("clarity"))
    persuasiveness = _clamp_int(data.get("persuasiveness"))
    overall = round((logic + evidence + clarity + persuasiveness) / 4)

    def _as_list(v):
        if isinstance(v, list):
            return [str(x) for x in v][:3]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
        return []

    return ScoreResult(
        overall=overall,
        logic=logic,
        evidence=evidence,
        clarity=clarity,
        persuasiveness=persuasiveness,
        message_count=heuristic.message_count,
        incomplete=False,
        summary=str(data.get("summary", "")).strip(),
        strengths=_as_list(data.get("strengths")),
        improvements=_as_list(data.get("improvements")),
        source="ai",
    )
