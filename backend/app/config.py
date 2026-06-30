from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/assetrisk"
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    # When pointing at real Entra External ID, set these:
    # entra_tenant_id: str = ""
    # entra_client_id: str = ""
    # entra_issuer: str = ""  # https://login.microsoftonline.com/{tenant}/v2.0


settings = Settings()
