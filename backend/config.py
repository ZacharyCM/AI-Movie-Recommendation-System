from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    tmdb_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_service_role_key: str = ""


settings = Settings()
