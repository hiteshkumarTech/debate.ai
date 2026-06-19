"""OpenAI (GPT) adapter. SDK imported lazily."""
from __future__ import annotations

from app.services.ai_providers.base import AIProvider, AIMessage, ProviderError


class OpenAIProvider(AIProvider):
    name = "openai"
    is_live = True

    DEFAULT_MODEL = "gpt-4o"

    def __init__(self, api_key: str, model: str | None = None):
        try:
            from openai import OpenAI  # lazy
        except ImportError as e:  # pragma: no cover
            raise ProviderError(
                "The 'openai' package is not installed. Run: pip install openai"
            ) from e
        self._client = OpenAI(api_key=api_key)
        self._model = model or self.DEFAULT_MODEL

    def generate_reply(self, system_prompt: str, history: list[AIMessage]) -> str:
        try:
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(
                {"role": m.role, "content": m.content} for m in history
            )
            resp = self._client.chat.completions.create(
                model=self._model,
                max_tokens=1024,
                messages=messages,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as e:  # noqa: BLE001
            raise ProviderError(f"OpenAI request failed: {e}") from e
