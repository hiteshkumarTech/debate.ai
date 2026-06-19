"""
/api/ai — generate the AI's next turn in a debate or interview. This is
the route that makes opponents/interviewers real instead of mock. Auth is
required so usage is tied to a user (and future rate-limiting has a key).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.models.entities import User
from app.schemas.api import ReplyRequest, ReplyResponse
from app.services.ai_providers.base import AIMessage, ProviderError
from app.services.ai_providers.factory import get_provider
from app.services.prompts import build_prompt_for_request

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _to_ai_history(history) -> list[AIMessage]:
    # Wire 'sender' is 'user'|'ai'; models expect 'user'|'assistant'.
    return [
        AIMessage(role="assistant" if m.sender == "ai" else "user", content=m.content)
        for m in history
    ]


@router.post("/reply", response_model=ReplyResponse)
def generate_reply(
    req: ReplyRequest,
    _user: User = Depends(get_current_user),
):
    provider = get_provider(req.ai_model)
    system_prompt = build_prompt_for_request(req)
    history = _to_ai_history(req.history)

    try:
        reply = provider.generate_reply(system_prompt, history)
    except ProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e

    return ReplyResponse(reply=reply, provider=provider.name, is_live=provider.is_live)
