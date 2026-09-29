"""Migration 001 — domain tables (documents/jobs/phases/records/audit).

The project has no Alembic env yet; this module documents the authoritative
DDL source (SQLAlchemy metadata) and applies it idempotently via
``init_domain_db``. When Alembic is introduced, autogenerate from
``app.database.base.Base`` and keep this file as the baseline reference.

Portable tables (sqlite + Postgres):
  users, documents, digitization_jobs, pipeline_phase_executions,
  land_records, extracted_fields, hitl_reviews, audit_events,
  notifications, land_record_parcel_links

Postgres-only (PostGIS, excluded from sqlite fallback):
  land_parcels, projects
"""
from __future__ import annotations

REVISION = "001_domain_tables"


def upgrade() -> None:
    from app.database.session import init_domain_db
    init_domain_db()


def downgrade() -> None:  # pragma: no cover - baseline has no down migration
    raise NotImplementedError("Baseline migration 001 has no downgrade; restore from backup.")
