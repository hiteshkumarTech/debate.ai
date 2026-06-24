"""Google (Gemini) adapter. SDK imported lazily."""
from __future__ import annotations

from app.services.ai_providers.base import AIProvider, AIMessage, ProviderError


class GoogleProvider(AIProvider):
    name = "google"
    is_live = True

    DEFAULT_MODEL = "gemini-2.5-flash-lite"

    def __init__(self, api_key: str, model: str | None = None):
        try:
            import google.generativeai as genai  # lazy
        except ImportError as e:  # pragma: no cover
            raise ProviderError(
                "The 'google-generativeai' package is not installed. "
                "Run: pip install google-generativeai"
            ) from e
        genai.configure(api_key=api_key)
        self._genai = genai
        self._model_name = self.DEFAULT_MODEL

    def generate_reply(self, system_prompt: str, history: list[AIMessage]) -> str:
        try:
            model = self._genai.GenerativeModel(
                model_name=self._model_name,
                system_instruction=system_prompt,
            )
            # Gemini uses 'model' instead of 'assistant' for its own turns.
            contents = [
                {
                    "role": "model" if m.role == "assistant" else "user",
                    "parts": [m.content],
                }
                for m in history
            ]
            resp = model.generate_content(contents)
            return (resp.text or "").strip()
        except Exception as e:  # noqa: BLE001
            raise ProviderError(f"Google request failed: {e}") from e
