from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEBUG: bool = True
    SECRET_KEY: str = "change-me"

    DB_NAME: str = "zameenai"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432

    ALLOWED_HOSTS: str = "localhost,127.0.0.1"
    # NOTE: your frontend (Vite) runs on port 3005 per vite.config.ts,
    # not 5173. Update your .env if you rely on this directly.
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3005"

    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    GEMINI_API_KEY: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()