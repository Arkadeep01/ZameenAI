"""Domain models package (TECHSPEC target path).

Authoritative SQLAlchemy models live in ``app.database.models`` (existing
Project/LandParcel + new document/job/record/audit tables). This package
re-exports them so ``app.models`` imports work without maintaining a
second competing model definition.
"""
from app.database.models import (  # noqa: F401
    AuditEvent,
    DigitizationJob,
    Document,
    ExtractedField,
    HitlReview,
    LandParcel,
    LandRecord,
    LandRecordParcelLink,
    Notification,
    PipelinePhaseExecution,
    Project,
    User,
)
