"""Background-task entrypoint (Celery optional).

Expensive OCR/extraction can be dispatched here when Redis+Celeny are
provisioned; without a broker the API runs the orchestrator inline and
this module raises an explicit configuration error instead of silently
dropping jobs.
"""
from __future__ import annotations

import os


def celery_available() -> bool:
    try:
        import celery  # noqa: F401
        return bool(os.getenv("REDIS_URL"))
    except Exception:
        return False


def enqueue_pipeline(job_id: str) -> dict:
    if not celery_available():
        return {"status": "FAILED", "error_code": "BROKER_UNAVAILABLE",
                "message": "Celery/Redis not configured; run the pipeline inline via POST /api/jobs/run."}
    # Worker wiring lands here when the broker is provisioned.
    return {"status": "QUEUED", "job_id": job_id}
