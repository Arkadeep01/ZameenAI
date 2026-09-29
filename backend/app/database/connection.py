import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

_engine = None
SessionLocal = None


def _get_session_factory():
    """Build the engine lazily so importing the app never requires a live DB.

    Behavior with DATABASE_URL set is unchanged; without it, only actual
    DB access raises (previously the import itself crashed the app).
    """
    global _engine, SessionLocal
    if SessionLocal is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL is not set in .env")
        _engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            connect_args={
                "options": "-c search_path=public,extensions"
            }
        )
        SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=_engine
        )
    return SessionLocal


def get_db():
    SessionFactory = _get_session_factory()
    db = SessionFactory()
    try:
        yield db
    finally:
        db.close()


def __getattr__(name: str):
    """Backward-compat for `from app.database.connection import engine`.

    `seed.py` binds the engine at call time; resolve lazily so the import
    itself never requires DATABASE_URL (raises on first real use instead).
    """
    if name in ("engine", "SessionLocal"):
        _get_session_factory()
        return globals()[name if name != "engine" else "_engine"]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
