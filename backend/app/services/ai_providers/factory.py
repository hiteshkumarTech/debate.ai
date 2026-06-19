"""
Factory that resolves a provider name to a concrete provider instance.

Resolution rules:
1. If the requested provider has a configured API key, return that live
   provider.
2. Else if the configured default provider has a key, return that.
3. Else return the EchoProvider, so the backend stays fully functional
   locally with zero keys (returning clearly-labeled placeholder replies).

This means the frontend can keep offering GPT/Gemini/Claude as choices,
and each one "just works" as soon as its key is present in the backend
.env — with a graceful, honest fallback until then.
"""
from __future__ import annotations

from app.core.config import get_settings
from app.services.ai_providers.base import AIProvider
from app.services.ai_providers.echo import EchoProvider

# Map the frontend's model ids to backend provider names, so a request
# carrying "gpt-5.5" or "claude" resolves to the right vendor.
_MODEL_ID_TO_PROVIDER = {
    "gpt-5.5": "openai",
    "gpt-4o": "openai",
    "openai": "openai",
    "gemini": "google",
    "google": "google",
    "claude": "anthropic",
    "anthropic": "anthropic",
}


def _build_live_provider(provider_name: str, api_key: str) -> AIProvider:
    if provider_name == "anthropic":
        from app.services.ai_providers.anthropic_provider import AnthropicProvider
        return AnthropicProvider(api_key=api_key)
    if provider_name == "openai":
        from app.services.ai_providers.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=api_key)
    if provider_name == "google":
        from app.services.ai_providers.google_provider import GoogleProvider
        return GoogleProvider(api_key=api_key)
    # Unknown name — caller will fall back to echo.
    raise KeyError(provider_name)


def get_provider(requested: str | None = None) -> AIProvider:
    """
    requested: a frontend model id ('claude', 'gpt-5.5', ...) or backend
    provider name ('anthropic', ...). None uses the configured default.
    """
    settings = get_settings()

    # Normalize a frontend model id to a provider name.
    provider_name = _MODEL_ID_TO_PROVIDER.get(
        (requested or "").lower(), requested or settings.default_ai_provider
    )

    # Try the requested provider's key.
    key = settings.provider_key(provider_name)
    if key:
        try:
            return _build_live_provider(provider_name, key)
        except KeyError:
            pass  # unknown provider name → fall through

    # Try the configured default provider's key.
    default_key = settings.provider_key(settings.default_ai_provider)
    if default_key:
        try:
            return _build_live_provider(settings.default_ai_provider, default_key)
        except KeyError:
            pass

    # Nothing configured — safe, honest fallback.
    return EchoProvider()
