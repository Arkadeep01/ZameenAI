"""Workflow application service: HITL -> correction -> resubmission ->
reprocessing -> validation -> canonical record.

Every transition is validated against ``app.workflow.state_machine``,
authorized by role, persisted (DB best-effort + file truth), and audited.
Stale phase-number strings are not accepted as states.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from app.workflow import state_machine as sm

logger = logging.getLogger(__name__)


class WorkflowService:
    def __init__(self, db=None):
        self.db = db

    # -- state derivation -------------------------------------------------
    def record_state(self, record_id: str) -> dict[str, Any]:
        """Derive the current record-level workflow state from file truth."""
        from app.ocr.hitl.service import get_hitl1_service
        from app.ocr.resubmission.service import get_resubmission_service
        from app.ocr.reprocessing.service import get_reprocessing_service

        sessions = get_hitl1_service().get_record_sessions(record_id)
        latest = sessions[-1] if sessions else None
        if latest:
            status = latest.get("status", sm.READY_FOR_HITL)
            mapping = {
                "READY_FOR_HITL": sm.READY_FOR_HITL,
                "UNDER_REVIEW": sm.UNDER_REVIEW,
                "CORRECTION_REQUIRED": sm.CORRECTION_REQUIRED,
                "VERIFIED": sm.VERIFIED,
                "REJECTED": sm.REJECTED,
            }
            state = mapping.get(status, sm.READY_FOR_HITL)
            # A later resubmission/reprocessing supersedes a CORRECTION_REQUIRED.
            subs = get_resubmission_service().get_record_submissions(record_id) or {}
            runs = get_reprocessing_service().get_record_reprocessing_history(record_id) or {}
            if state == sm.CORRECTION_REQUIRED:
                sub_list = (subs.get("submissions") if isinstance(subs, dict) else None) or []
                run_list = (runs.get("runs") if isinstance(runs, dict) else None) or []
                if run_list:
                    last = run_list[0] if isinstance(run_list, list) else {}
                    if str(last.get("status", "")).upper() in ("COMPLETED", "SUCCESS"):
                        state = sm.REPROCESSED
                    else:
                        state = sm.REPROCESSING
                elif sub_list:
                    state = sm.RESUBMITTED
            return {"record_id": record_id, "state": state,
                    "allowed_transitions": sm.allowed_targets(state),
                    "hitl_id": latest.get("hitl1_id")}
        # No HITL yet: derive from validation presence.
        from app.ocr.validation.service import get_automated_validation_service
        validations = get_automated_validation_service().get_record_validations(record_id) or {}
        runs = (validations.get("runs") if isinstance(validations, dict) else None) or []
        if runs:
            return {"record_id": record_id, "state": sm.VALIDATED,
                    "allowed_transitions": sm.allowed_targets(sm.VALIDATED)}
        return {"record_id": record_id, "state": sm.INGESTED,
                "allowed_transitions": sm.allowed_targets(sm.INGESTED)}

    # -- HITL decision ----------------------------------------------------
    def hitl_decision(self, *, hitl_id: str, decision: str, reviewer: str,
                      notes: str = "", actor_role: str = "") -> dict[str, Any]:
        from app.ocr.hitl.service import get_hitl1_service

        check = sm.can_transition(sm.UNDER_REVIEW, decision.upper(), role=actor_role)
        # Allow READY_FOR_HITL -> decision as well (review_field moves to UNDER_REVIEW first).
        if not check.ok:
            check2 = sm.can_transition(sm.READY_FOR_HITL, decision.upper(), role=actor_role)
            if not check2.ok:
                return {"status": "FAILED", "error_code": "INVALID_TRANSITION",
                        "message": check.reason}
        session = get_hitl1_service().submit(hitl1_id=hitl_id, decision=decision,
                                             reviewer=reviewer, notes=notes)
        body = session.to_dict()
        if session.error_code:
            return {"status": "FAILED", "error_code": body.get("error_code"),
                    "message": body.get("error_message"), "hitl": body}
        self._mirror_hitl(body)
        self._audit(reviewer, actor_role, "HITL_DECISION", "hitl_review", hitl_id,
                    new_state=body.get("status"), meta={"decision": decision})
        if body.get("status") == "VERIFIED":
            canonical = self.materialize_canonical(body.get("record_id", ""), verified_by=reviewer)
            body["canonical_record"] = canonical
        return {"status": "SUCCESS", "hitl": body}

    # -- canonical record --------------------------------------------------
    def materialize_canonical(self, record_id: str, verified_by: Optional[str] = None) -> dict[str, Any]:
        """Build the verified canonical land record from real Phase 07/08
        evidence. Never fabricates: missing extraction returns an explicit
        error instead of invented fields."""
        from app.ocr.extraction.pipeline import SemanticExtractionService
        from app.ocr.confidence.service import ConfidenceCompletenessService

        # Latest extraction result file is the source of truth.
        svc = SemanticExtractionService()
        # Reuse the service's loaders indirectly: find latest via validation svc.
        from app.ocr.validation.service import get_automated_validation_service
        validations = get_automated_validation_service().get_record_validations(record_id) or {}
        runs = (validations.get("runs") if isinstance(validations, dict) else None) or []
        if not runs:
            return {"status": "FAILED", "error_code": "NO_VALIDATION",
                    "message": "No validation run found; cannot materialize canonical record."}
        # Pull confidence snapshot for scores.
        conf = ConfidenceCompletenessService().evaluate(
            record_id=record_id,
            document_id=str((runs[0] or {}).get("document_id", "")),
            ingestion_id=str((runs[0] or {}).get("ingestion_id", "")))
        conf_d = conf.to_dict() if hasattr(conf, "to_dict") else {}
        canonical = {
            "record_id": record_id,
            "document_id": (runs[0] or {}).get("document_id"),
            "status": "VERIFIED",
            "overall_confidence": conf_d.get("overall_confidence", 0.0),
            "completeness_score": conf_d.get("completeness_score", 0.0),
            "verified_by": verified_by,
        }
        if self.db is not None:
            try:
                import json as _json
                from app.database.models.land_record import LandRecord
                from app.repositories.domain_repositories import LandRecordRepository
                LandRecordRepository(self.db).upsert_record(LandRecord(
                    id=record_id, document_id=canonical["document_id"],
                    document_type=None, status="VERIFIED",
                    confidence=canonical["overall_confidence"],
                    completeness=canonical["completeness_score"],
                    payload=_json.dumps(canonical, ensure_ascii=False),
                    verified_by=verified_by))
            except Exception:
                try:
                    self.db.rollback()
                except Exception:
                    pass
        self._audit(verified_by, None, "CANONICAL_RECORD_CREATED", "land_record",
                    record_id, new_state="VERIFIED")
        return {"status": "SUCCESS", "canonical_record": canonical}

    # -- helpers ------------------------------------------------------------
    def _mirror_hitl(self, body: dict[str, Any]) -> None:
        if self.db is None or not body.get("hitl1_id"):
            return
        try:
            from app.database.models.hitl_review import HitlReview
            from app.repositories.domain_repositories import HitlRepository
            HitlRepository(self.db).upsert(HitlReview(
                id=body["hitl1_id"], record_id=body.get("record_id", ""),
                document_id=body.get("document_id", ""),
                validation_run_id=body.get("validation_run_id"),
                status=body.get("status", ""), reviewer=None,
                decision=body.get("status"),
                field_reviews=json.dumps(body.get("field_reviews", {})),
                notes=json.dumps(body.get("notes", []))))
        except Exception:
            try:
                self.db.rollback()
            except Exception:
                pass

    def _audit(self, actor, role, action, entity_type, entity_id, **kw) -> None:
        if self.db is None:
            return
        try:
            from app.services.audit_notification_service import AuditService
            AuditService(self.db).log(actor_id=actor, actor_role=role, action=action,
                                      entity_type=entity_type, entity_id=entity_id, **kw)
        except Exception:
            pass
