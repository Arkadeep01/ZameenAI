from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEBUG: bool = True
    SECRET_KEY: str = "change-me"

    DB_NAME: str = "zameenai"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432

    # Optional full URL (Supabase/Postgres). When absent the domain layer
    # falls back to a local sqlite file so the served API boots without a
    # live database; GIS raw-SQL routes still require Postgres explicitly.
    DATABASE_URL: str = ""

    ALLOWED_HOSTS: str = "localhost,127.0.0.1"
    # NOTE: your frontend (Vite) runs on port 3005 per vite.config.ts,
    # not 5173. Update your .env if you rely on this directly.
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3005"

    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    GEMINI_API_KEY: str = ""

    # --- auth ---
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # --- storage ---
    UPLOAD_DIR: str = "./app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 25

    # --- OCR / AI providers (fail-open explicitly, never silent mock) ---
    OCR_PROVIDER: str = "tesseract"
    LLM_PROVIDER: str = "mistral"

    # --- pipeline thresholds (configurable, never hard-coded in services) ---
    CONFIDENCE_HIGH_THRESHOLD: float = 0.90
    CONFIDENCE_MEDIUM_THRESHOLD: float = 0.70

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()