"""Authoritative digitization-job API (backend-owned orchestration).

Single endpoint owns Phase 01 -> 11 sequencing; the per-phase
``/api/digitization/*`` bridge remains for step-level consumers. Routes do
auth + validation + service invocation + serialization only.
"""
from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user, require_permission
from app.core.permissions import DIGITIZATION_READ, DIGITIZATION_RUN
from app.database.session import get_domain_db
from app.services.digitization_orchestrator import DigitizationOrchestrator

router = APIRouter(prefix="/jobs", tags=["digitization-jobs"])


def _orch(db=Depends(get_domain_db)) -> DigitizationOrchestrator:
    return DigitizationOrchestrator(db)


@router.post("", dependencies=[Depends(require_permission(DIGITIZATION_RUN))])
async def start_job(request: Request, file: UploadFile = File(...),
                    run_pipeline: bool = Form(True),
                    user: dict = Depends(get_current_user),
                    orch: DigitizationOrchestrator = Depends(_orch)):
    from app.core.config import settings

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    max_bytes = int(settings.MAX_UPLOAD_SIZE_MB) * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail={
            "code": "FILE_TOO_LARGE",
            "message": f"Upload exceeds {settings.MAX_UPLOAD_SIZE_MB} MB",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    # Ownership is bound inside start_job, before the pipeline runs, so a
    # binding failure stops the run instead of leaving a processed record that
    # nobody owns (and therefore that ScopeService would deny to everyone).
    try:
        result = orch.start_job(content, file.filename or "document",
                                created_by=user["username"], run_pipeline=bool(run_pipeline),
                                owner=user)
    except Exception as exc:
        logging.getLogger("zameenai.ownership").error(
            "ownership_bind_failed user=%s error=%s", user.get("id"), exc, exc_info=True)
        raise HTTPException(status_code=500, detail={
            "code": "OWNERSHIP_BIND_FAILED",
            "message": "Could not bind record ownership; the digitization run was not started",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    status_code = 200 if result.get("status") not in ("FAILED",) else 400
    return JSONResponse(result, status_code=status_code)


@router.post("/run", dependencies=[Depends(require_permission(DIGITIZATION_RUN))])
def run_pipeline(request: Request, record_id: str = "", document_id: str = "",
                 ingestion_id: str = "",
                 job_id: str = "", from_phase: Optional[str] = None,
                 user: dict = Depends(get_current_user),
                 orch: DigitizationOrchestrator = Depends(_orch)):
    from app.core.scopes import ScopeService

    ScopeService.check(user, record_id=record_id or None,
                       document_id=document_id or None, request=request)
    result = orch.run_pipeline(job_id=job_id or None, record_id=record_id,
                               document_id=document_id, ingestion_id=ingestion_id,
                               created_by=user["username"], from_phase=from_phase)
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)


@router.get("/{job_id}", dependencies=[Depends(require_permission(DIGITIZATION_READ))])
def job_status(job_id: str, request: Request, user: dict = Depends(get_current_user),
               orch: DigitizationOrchestrator = Depends(_orch)):
    from app.core.scopes import ScopeService

    result = orch.get_status(job_id=job_id)
    if result.get("status") == "FAILED" and result.get("error_code") == "JOB_NOT_FOUND":
        # Enumeration-safe: unknown ids and out-of-scope ids look identical
        # to scoped roles; admins still get the precise 404.
        if user.get("role") == "system_admin":
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "Resource not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    ScopeService.check(user, record_id=result.get("record_id") or None, request=request)
    return JSONResponse(result)


@router.get("/by-record/{record_id}", dependencies=[Depends(require_permission(DIGITIZATION_READ))])
def job_by_record(record_id: str, request: Request, user: dict = Depends(get_current_user),
                  orch: DigitizationOrchestrator = Depends(_orch)):
    from app.core.scopes import ScopeService

    ScopeService.check(user, record_id=record_id, request=request)
    result = orch.get_status(record_id=record_id)
    if result.get("error_code") == "JOB_NOT_FOUND":
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "Resource not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    return JSONResponse(result)
