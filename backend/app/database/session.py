"""Domain session factory with Postgres-first, sqlite-fallback semantics.

The pre-existing ``app.database.connection.get_db`` requires DATABASE_URL
(used by raw PostGIS GIS routes — correct, they genuinely need Postgres).
This module serves the new domain tables (documents/jobs/phases/records/
audit/notifications) and falls back to a local sqlite file so the served
API and test suite boot without provisioning Postgres. GIS spatial queries
never use this fallback; they raise an explicit configuration error via
``connection.get_db`` instead of returning fabricated parcels.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_SQLITE_PATH = _BACKEND_DIR / "zameenai_domain.db"


def _resolve_url() -> tuple[str, dict]:
    url = os.getenv("DATABASE_URL", "")
    if url:
        return url, {"pool_pre_ping": True}
    return f"sqlite:///{_SQLITE_PATH}", {"connect_args": {"check_same_thread": False}}


_DATABASE_URL, _kwargs = _resolve_url()
_engine = create_engine(_DATABASE_URL, **_kwargs)
_SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_engine():
    return _engine


def domain_database_url() -> str:
    return _DATABASE_URL


def is_postgres() -> bool:
    return _DATABASE_URL.startswith("postgresql")


def get_domain_db() -> Iterator[Session]:
    db = _SessionFactory()
    try:
        yield db
    finally:
        db.close()


def init_domain_db() -> None:
    from app.database.base import Base  # noqa: PLC0415 (avoid circular import)
    import app.database.models  # noqa: PLC0415,F401 (register tables)

    if is_postgres():
        Base.metadata.create_all(bind=_engine)
        return
    # sqlite fallback: only portable domain tables (PostGIS land_parcels/
    # projects require SpatiaLite functions; they are Postgres-only by
    # design and must never be faked into sqlite).
    tables = [t for t in Base.metadata.tables.values()
              if t.name not in ("land_parcels", "projects", "spatial_ref_sys",
                                "geography_columns", "geometry_columns")]
    Base.metadata.create_all(bind=_engine, tables=tables)
