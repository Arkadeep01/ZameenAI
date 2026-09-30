# RBAC Matrix (server-side enforced)

Roles: `system_admin`, `pia`, `field_officer`, `desk_validator` (= LAO),
`approver`, `executive`, `citizen`. Identity comes only from the verified
JWT (`app/core/deps.py:get_current_user`); client-supplied role / user /
project ids are never trusted.

| Capability | admin | pia | field | validator | approver | exec | citizen |
|---|---|---|---|---|---|---|---|
| system/user/config management, audit read | yes | no | no | no | no | no | no |
| project/acquisition management | yes | yes | no | no | read | no | no |
| upload, assigned records, field verify | yes | yes | yes | no | no | no | own only |
| validation / doc review / HITL / corrections | yes | no | no | yes | no | no | own only |
| workflow assignment | yes | no | no | yes | no | no | no |
| approve / reject lifecycle transitions | yes | submit only | no | verify only | yes | no | no |
| freeze / unfreeze a record (legal hold) | yes | no | no | no | assigned only | no | no |
| read / report / dashboard | yes | yes | assigned | yes | assigned | yes (all, read-only) | own only |

`system_admin` holds `*`. `executive` holds **no write permission at all** and
is the only non-admin role with platform-wide read visibility.

## Permission strings (`MODULE.ACTION`)

`DOCUMENT.CREATE/READ/DELETE/DOWNLOAD`, `DIGITIZATION.RUN/READ`,
`VALIDATION.REVIEW`, `HITL.REVIEW`, `CORRECTION.REQUEST`,
`WORKFLOW.READ/ASSIGN/APPROVE/REJECT`, `FIELD.VERIFY`, `GIS.READ`,
`REPORT.READ`, `DASHBOARD.READ`, `OWN.RECORD.READ`, `PROJECT.READ/WRITE`,
`LAND_RECORD.READ/UPDATE`, `ACQUISITION.*`, `COMPENSATION.*`,
`OBJECTION.*`, `NOTICE.*`, `RNR.*`, `USER.MANAGE`, `ROLE.READ`,
`SYSTEM.CONFIG`, `AUDIT.READ`.

Registry (single source of truth): `app/core/permissions.py`, mirrored for
the UI in `frontend/src/auth/permissions.ts`. `LAO` is never a runtime role;
`normalize_role()` maps `LAO`/`CALA`/`DM`/`FIELD`/`EXEC`/`SYSTEM_ADMIN`
aliases onto the canonical seven.

## Error contract

| Situation | Status | Code |
|---|---|---|
| missing / invalid / expired token | 401 | `AUTHENTICATION_REQUIRED` |
| authenticated but lacking the permission | 403 | `PERMISSION_DENIED` |
| in role but outside the object's project/assignment scope | 404 | `RESOURCE_NOT_FOUND` |
| invalid lifecycle edge | 422 | `INVALID_TRANSITION` |
| valid edge, wrong role for the target state | 422 | `ROLE_NOT_ALLOWED` |
| edit to a frozen record | 423 | `RECORD_FROZEN` |
| freeze state unreadable | 503 | `FREEZE_STATE_UNAVAILABLE` |
| freeze/unfreeze without justification | 400 | `JUSTIFICATION_REQUIRED` |

Scope denials return 404 (never 403) so a caller cannot probe for the
existence of records they are not scoped to see.

## Object scope

`app/core/scopes.py:ScopeService` is the single authority, imported at module
level by `app/core/deps.py`.

- `system_admin` — global, audited by every caller.
- `citizen` — only ids in their own OTP-verified ownership set.
- `pia`, `field_officer`, `desk_validator`, `approver` — bounded by project
  membership **and** record assignment.
- `executive` — read-only, no object scope required.

Rules that fail **closed**:

- A record with no assignment is not readable by a project-scoped role.
- `field_officer` / `desk_validator`: when an assignment lists assignees, only
  those assignees have access.
- `approver`: must appear in the assignment's `authority` list. An empty or
  missing authority list grants **nobody** freeze rights, because freezing is a
  legal hold — an approver must first be assigned to the record.
- A freeze-state read error denies the write (503) instead of reporting the
  record as unfrozen.

`POST /api/workflow/records/{record_id}/assign` is the only way to grant
record access: it validates that the assignee is a real, active principal,
persists the assignment, and automatically adds an approver to the authority
list.

## Lifecycle authority

Two separate, non-overlapping authorities — there is no second transition
map in any route:

- `app/workflow/state_machine.py` — the digitization record workflow
  (`INGESTED` … `VERIFIED` / `REJECTED`).
- `app/workflow/acquisition_flow.py` — the acquisition lifecycles
  (`project`, `objection`, `compensation`), including the minimum role allowed
  to move into each target state.

`system_admin` waives the *role* requirement but never the legality of an
edge; terminal states are terminal for everyone.

## Audit

Every sensitive read and mutation appends an `AuditEvent` through
`app/services/audit_notification_service.py`, recording actor id, actor role,
action, entity, before/after state, request id and IP.

An audit write that fails is never swallowed: it is reported through
`report_audit_failure()` and emits an error log for alerting. Sensitive
mutations additionally require justification text.

## Configuration safety

- `DEBUG` defaults to `False`. A deployment that forgets to set it cannot
  silently boot with the development identity store enabled.
- `SECRET_KEY` has no default. With `DEBUG=false` and no key, the process
  refuses to boot; placeholder and `django-insecure-` keys are rejected.
- `DEV_USERS_PASSWORD` has no default. When unset, one random password is
  generated for the process and logged once, so every seeded identity shares a
  single usable credential and nothing is committed.
- Production authentication reads the `users` table only; the dev seed store
  is never consulted.

## Tests

- `tests/test_rbac_security.py` — 401/403/404 boundaries, scope, privilege
  escalation, credential hygiene, boot-time secret checks.
- `tests/test_acquisition_authz.py` — acquisition/record domain: project
  scope, lifecycle authority, assignment persistence, freeze and fail-closed
  freeze lookup, admin surface.
- `tests/test_backend_integration.py` — end-to-end journey checks.
