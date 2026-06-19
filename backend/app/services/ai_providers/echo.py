"""
Echo provider: the safe fallback when no real AI key is configured. It
returns a clearly-labeled placeholder reply so the backend is fully
runnable locally with zero API keys, and so developers can see the whole
request/response/scoring flow work before wiring real models.

This is intentionally NOT trying to be smart — it just proves the pipe.
"""
from __future__ import annotations

from app.services.ai_providers.base import AIProvider, AIMessage


class EchoProvider(AIProvider):
    name = "echo"
    is_live = False

    def generate_reply(self, system_prompt: str, history: list[AIMessage]) -> str:
        last_user = next(
            (m.content for m in reversed(history) if m.role == "user"), ""
        )
        snippet = (last_user[:80] + "…") if len(last_user) > 80 else last_user
        return (
            "[placeholder reply — no AI provider key configured] "
            f'You said: "{snippet}". Set an API key in the backend .env to get '
            "real AI responses here."
        )
