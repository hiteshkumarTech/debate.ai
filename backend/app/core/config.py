"""
Application configuration, loaded from environment variables (or a .env
file in development). Every setting has a safe default so the app boots
locally with zero configuration — you only add env vars to turn on real
services (Postgres, Firebase, AI providers).
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # don't crash on unrelated env vars
    )

    # --- App ---
    app_name: str = "DebateAI API"
    environment: Literal["development", "production"] = "development"
    # Comma-separated list of allowed CORS origins. Defaults cover local
    # Vite dev servers; add your deployed frontend URL in production.
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"

    # --- Database ---
    # Defaults to a local SQLite file so dev needs no Postgres. In
    # production set DATABASE_URL to your Supabase Postgres connection
    # string, e.g. postgresql+psycopg2://user:pass@host:5432/dbname
    database_url: str = "sqlite:///./debateai.db"

    # --- Firebase Admin (auth) ---
    # Path to the service-account JSON downloaded from the Firebase
    # console. If unset, auth runs in a clearly-labeled DEV MODE that
    # trusts an "X-Dev-User" header instead of verifying real tokens —
    # so the backend is usable locally before Firebase is wired up.
    firebase_credentials_path: str = ""
    # Alternative to the path above: the service-account JSON *contents* as a
    # string. Used in deployment (Render etc.) where secrets are env vars, not
    # files. Takes precedence over the path when both are set.
    firebase_credentials_json: str = ""

    # --- AI providers ---
    # Default provider used when a request doesn't specify one, or when
    # the requested provider has no key configured.
    default_ai_provider: Literal["anthropic", "openai", "google"] = "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def firebase_enabled(self) -> bool:
        return bool(self.firebase_credentials_path or self.firebase_credentials_json)

    def provider_key(self, provider: str) -> str:
        return {
            "anthropic": self.anthropic_api_key,
            "openai": self.openai_api_key,
            "google": self.google_api_key,
        }.get(provider, "")


@lru_cache
def get_settings() -> Settings:
    """Cached so the env is read once. Use as a FastAPI dependency."""
    return Settings()
