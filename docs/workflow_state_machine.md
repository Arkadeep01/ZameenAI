# Workflow State Machine (authoritative)

Defined in `app/workflow/state_machine.py`; enforced by
`WorkflowService` + route permissions; tested in
`tests/test_workflow_rbac.py`.

```text
INGESTED → QUALITY_CHECKED → PREPROCESSED → CLASSIFIED → OCR_DONE
  → EXTRACTED → CONFIDENCE_SCORED → VALIDATED → ANOMALY_CHECKED
  → READY_FOR_HITL → UNDER_REVIEW → {VERIFIED | CORRECTION_REQUIRED | REJECTED}
CORRECTION_REQUIRED → RESUBMITTED → REPROCESSING → REPROCESSED
  → {VALIDATED | READY_FOR_HITL}   (reprocessing → validation loop)
```

- Invalid edges rejected with `INVALID_TRANSITION` (HTTP 422 on the
  decision endpoint).
- Terminal: `VERIFIED`, `REJECTED` (immutable HITL sessions).
- `VERIFIED` requires all flagged fields reviewed (service rule) and then
  materialises the canonical `land_records` row (no invented fields; missing
  validation → explicit `NO_VALIDATION` error).
- `CORRECTION_REQUIRED`/`REJECTED` require a reason note.
- Every decision writes an `audit_events` row and mirrors the HITL session
  to `hitl_reviews`.
- Record state derivation (`WorkflowService.record_state`): latest HITL
  session wins; a later resubmission/reprocessing run supersedes
  `CORRECTION_REQUIRED` → `RESUBMITTED`/`REPROCESSING`/`REPROCESSED`.
