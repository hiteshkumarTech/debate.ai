"""Anthropic (Claude) adapter. SDK imported lazily so a missing
`anthropic` package only errors if this provider is actually used."""
from __future__ import annotations

from app.services.ai_providers.base import AIProvider, AIMessage, ProviderError


class AnthropicProvider(AIProvider):
    name = "anthropic"
    is_live = True

    # A sensible current default; override per-call if needed later.
    DEFAULT_MODEL = "claude-3-5-sonnet-20241022"

    def __init__(self, api_key: str, model: str | None = None):
        try:
            import anthropic  # lazy
        except ImportError as e:  # pragma: no cover - depends on env
            raise ProviderError(
                "The 'anthropic' package is not installed. Run: pip install anthropic"
            ) from e
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model or self.DEFAULT_MODEL

    def generate_reply(self, system_prompt: str, history: list[AIMessage]) -> str:
        try:
            resp = self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": m.role, "content": m.content} for m in history],
            )
            # Anthropic returns a list of content blocks; concatenate text.
            return "".join(
                block.text for block in resp.content if getattr(block, "type", "") == "text"
            ).strip()
        except Exception as e:  # noqa: BLE001 - normalize all SDK errors
            raise ProviderError(f"Anthropic request failed: {e}") from e
