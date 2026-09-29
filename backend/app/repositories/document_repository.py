"""Thin repository helpers over the domain session (persistence only)."""
from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

from app.database.models.document import DigitizationJob, Document, PipelinePhaseExecution


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_document(self, doc: Document) -> Document:
        existing = self.db.get(Document, doc.id)
        if existing:
            for attr in ("record_id", "ingestion_id", "filename", "mime_type",
                         "size_bytes", "sha256", "stored_path", "created_by"):
                setattr(existing, attr, getattr(doc, attr))
            self.db.commit()
            self.db.refresh(existing)
            return existing
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def get_document(self, document_id: str) -> Optional[Document]:
        return self.db.get(Document, document_id)

    def save_job(self, job: DigitizationJob) -> DigitizationJob:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_job(self, job_id: str) -> Optional[DigitizationJob]:
        return self.db.get(DigitizationJob, job_id)

    def get_job_by_record(self, record_id: str) -> Optional[DigitizationJob]:
        return (
            self.db.query(DigitizationJob)
            .filter(DigitizationJob.record_id == record_id)
            .order_by(DigitizationJob.created_at.desc())
            .first()
        )

    def update_job(self, job: DigitizationJob, **fields) -> DigitizationJob:
        for k, v in fields.items():
            setattr(job, k, v)
        self.db.commit()
        self.db.refresh(job)
        return job

    def record_phase(self, execution: PipelinePhaseExecution) -> PipelinePhaseExecution:
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        return execution

    def list_phases(self, job_id: str) -> list[PipelinePhaseExecution]:
        return (
            self.db.query(PipelinePhaseExecution)
            .filter(PipelinePhaseExecution.job_id == job_id)
            .order_by(PipelinePhaseExecution.id.asc())
            .all()
        )
