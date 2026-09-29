"""Authoritative digitization-job API (backend-owned orchestration).

Single endpoint owns Phase 01 -> 11 sequencing; the per-phase
``/api/digitization/*`` bridge remains for step-level consumers. Routes do
auth + validation + service invocation + serialization only.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.deps import enforce_ownership, get_current_user, require_permission
from app.database.session import get_domain_db
from app.services.digitization_orchestrator import DigitizationOrchestrator

router = APIRouter(prefix="/jobs", tags=["digitization-jobs"])


def _orch(db=Depends(get_domain_db)) -> DigitizationOrchestrator:
    return DigitizationOrchestrator(db)


@router.post("", dependencies=[Depends(require_permission("DIGITIZATION.RUN"))])
async def start_job(file: UploadFile = File(...),
                    run_pipeline: bool = Form(True),
                    user: dict = Depends(get_current_user),
                    orch: DigitizationOrchestrator = Depends(_orch)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    result = orch.start_job(content, file.filename or "document",
                            created_by=user["username"], run_pipeline=bool(run_pipeline))
    status_code = 200 if result.get("status") not in ("FAILED",) else 400
    return JSONResponse(result, status_code=status_code)


@router.post("/run", dependencies=[Depends(require_permission("DIGITIZATION.RUN"))])
def run_pipeline(record_id: str = "", document_id: str = "", ingestion_id: str = "",
                 job_id: str = "", from_phase: Optional[str] = None,
                 user: dict = Depends(get_current_user),
                 orch: DigitizationOrchestrator = Depends(_orch)):
    result = orch.run_pipeline(job_id=job_id or None, record_id=record_id,
                               document_id=document_id, ingestion_id=ingestion_id,
                               created_by=user["username"], from_phase=from_phase)
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)


@router.get("/{job_id}", dependencies=[Depends(require_permission("DIGITIZATION.READ"))])
def job_status(job_id: str, user: dict = Depends(get_current_user),
               orch: DigitizationOrchestrator = Depends(_orch)):
    result = orch.get_status(job_id=job_id)
    if result.get("status") == "FAILED" and result.get("error_code") == "JOB_NOT_FOUND":
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if user["role"] == "citizen":
        enforce_ownership(user, record_id=result.get("record_id", ""))
    return JSONResponse(result)


@router.get("/by-record/{record_id}", dependencies=[Depends(require_permission("DIGITIZATION.READ"))])
def job_by_record(record_id: str, user: dict = Depends(get_current_user),
                  orch: DigitizationOrchestrator = Depends(_orch)):
    if user["role"] == "citizen":
        enforce_ownership(user, record_id=record_id)
    result = orch.get_status(record_id=record_id)
    if result.get("error_code") == "JOB_NOT_FOUND":
        raise HTTPException(status_code=404, detail=f"No job for record {record_id}")
    return JSONResponse(result)
