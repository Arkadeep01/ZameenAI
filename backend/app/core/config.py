from pydantic_settings import BaseSettings


def _resolve_secret_key(raw: str) -> str:
    """Resolve the signing key.

    Development (DEBUG) gets a per-process random key so nothing is ever
    committed. Production must supply its own key: the value is returned
    empty on purpose so ``assert_secure_secret()`` can fail closed at boot
    instead of silently signing tokens with an invisible ephemeral key.
    """
    import logging
    import secrets

    value = (raw or "").strip().strip('"').strip("'")
    if value:
        return value
    if not DEBUG:
        logging.getLogger("zameenai.security").error(
            "SECRET_KEY is not set. Set SECRET_KEY in the environment before "
            "running with DEBUG=false.")
        return ""
    ephemeral = secrets.token_urlsafe(48)
    logging.getLogger("zameenai.security").warning(
        "SECRET_KEY not set; generated an ephemeral development key. "
        "Set SECRET_KEY in the environment for any shared deployment.")
    return ephemeral


class Settings(BaseSettings):
    # Fail closed: a deployment that forgets DEBUG=false must not silently
    # enable the development identity store or debug error output.
    DEBUG: bool = False
    # No hardcoded default: production MUST provide a real secret, and local
    # development gets a per-process random key so nothing is ever committed.
    SECRET_KEY: str = ""

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
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT: int = 10
    LOGIN_RATE_WINDOW_SECONDS: int = 60

    # Dev-only seed identities. The password is never hardcoded: provide it via
    # the environment, otherwise a random per-process password is generated and
    # logged so local debugging still works without a committed credential.
    DEV_USERS_PASSWORD: str = ""

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
DEBUG = settings.DEBUG
settings.SECRET_KEY = _resolve_secret_key(settings.SECRET_KEY)