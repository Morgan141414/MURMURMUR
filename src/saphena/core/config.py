from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Saphena M.I.S."
    environment: str = "local"
    database_url: str = "sqlite:///./saphena.db"
    session_ttl_minutes: int = Field(default=1440, ge=5)
    tetis_webhook_token: str | None = None

    model_config = SettingsConfigDict(env_prefix="SAPHENA_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
