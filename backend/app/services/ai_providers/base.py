"""
Provider-agnostic AI interface. Every concrete provider (Anthropic,
OpenAI, Google) implements `generate_reply`, so the rest of the app never
imports a vendor SDK directly — it asks the factory for "a provider" and
calls one method. Swapping or adding providers touches only this package.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class AIMessage:
    """Minimal role/content pair, vendor-neutral."""

    def __init__(self, role: str, content: str):
        # role is 'user' or 'assistant' in vendor-neutral terms
        self.role = role
        self.content = content


class AIProvider(ABC):
    #: short id, e.g. "anthropic"
    name: str = "base"
    #: whether this provider can actually make real calls (has a key/SDK)
    is_live: bool = False

    @abstractmethod
    def generate_reply(self, system_prompt: str, history: list[AIMessage]) -> str:
        """Return the assistant's next message given a system prompt and
        the prior conversation. Raises ProviderError on failure."""
        raise NotImplementedError


class ProviderError(RuntimeError):
    """Raised when a provider call fails (bad key, network, rate limit).
    Routes catch this and return a clean 502 rather than leaking SDK
    internals to the client."""
