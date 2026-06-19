"""
System-prompt construction. Turns a session's framing (topic, side,
personality, or interview category) into the instruction that shapes the
AI's behavior. Centralized here so debate/interview prompts stay
consistent and are easy to tune in one place.
"""
from __future__ import annotations

_PERSONALITY_STYLE = {
    "friendly-teacher": (
        "You are warm and encouraging, like a supportive teacher. Point out "
        "weaknesses gently and help the user strengthen their argument."
    ),
    "strict-professor": (
        "You are a rigorous professor. Demand structure and evidence, and "
        "challenge weak premises directly but fairly."
    ),
    "aggressive-opponent": (
        "You are a relentless debate opponent. Attack every weak point hard, "
        "demand sources, and give no ground to sloppy reasoning."
    ),
    "job-interviewer": (
        "You treat the exchange like a high-stakes interview answer, probing "
        "for depth and pressure-testing claims."
    ),
}

_CATEGORY_GUIDANCE = {
    "Behavioral": (
        "Ask behavioral follow-ups that probe ownership, specifics, and "
        "measurable outcomes. Look for STAR structure."
    ),
    "Technical": (
        "Probe the candidate's technical reasoning: approach, complexity, "
        "trade-offs, and edge cases. Ask them to justify choices."
    ),
    "System Design": (
        "Push on requirements, components, bottlenecks, and scaling "
        "trade-offs. Ask why one design over another."
    ),
}


def build_debate_prompt(
    topic: str,
    user_side: str | None,
    personality: str | None,
    custom_instruction: str | None = None,
) -> str:
    # The AI always argues the side opposite the user's.
    ai_side = "against" if user_side == "for" else "for"
    # A custom persona's instruction takes precedence over a built-in style.
    style = (
        custom_instruction
        if custom_instruction
        else _PERSONALITY_STYLE.get(personality or "", _PERSONALITY_STYLE["strict-professor"])
    )
    return (
        f"You are an AI debate opponent. The debate topic is: \"{topic}\". "
        f"The user is arguing {user_side or 'their chosen side'}, so you must "
        f"argue {ai_side} the topic. Stay in character for the entire debate. "
        f"{style} "
        "Keep each reply focused and under ~120 words. Challenge the user's "
        "most recent argument directly rather than monologuing."
    )


def build_interview_prompt(
    question: str, category: str | None, company: str | None
) -> str:
    guidance = _CATEGORY_GUIDANCE.get(category or "", "")
    company_frame = f" You are interviewing for a role at {company}." if company else ""
    return (
        f"You are a professional interviewer conducting a {category or 'practice'} "
        f"interview.{company_frame} The question under discussion is: "
        f"\"{question}\". Play the interviewer for the whole session: ask one "
        "probing follow-up at a time based on the candidate's last answer. "
        f"{guidance} "
        "Be professional but demanding. Keep each reply under ~80 words. If an "
        "answer is too short or vague to evaluate, say so and ask for specifics."
    )


def build_prompt_for_request(req) -> str:
    """Dispatch on kind. `req` is a schemas.api.ReplyRequest."""
    if req.kind == "interview":
        return build_interview_prompt(req.topic, req.category, req.company)
    return build_debate_prompt(
        req.topic,
        req.side,
        req.personality,
        getattr(req, "custom_persona_instruction", None),
    )
