from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Saphena M.I.S."
    environment: str = "local"
    database_url: str = "sqlite:///./saphena.db"
    session_ttl_minutes: int = Field(default=1440, ge=5)
    auth_token_mode: str = "opaque_session"
    tetis_webhook_token: str | None = None
    tetis_transition_secret: str | None = None
    qtrix_api_url: str | None = None
    qtrix_service_token: str | None = None
    service_api_key: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:8000/api/v1/google-calendar/callback"
    google_token_encryption_key: str | None = None

    model_config = SettingsConfigDict(env_prefix="SAPHENA_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
