# ZameenAI — How to Test the RBAC Module (All 7 Roles)

**Status:** verified against the running application on 2026-09-30
**Automated result:** `77 / 77` live probes pass · `42 / 42` static checks pass · `87 / 87` permission parity
**Scope:** every role in the PRD role model, both authentication flows, and every authorization boundary that currently exists.

---

## 0. The fastest way to test

```powershell
cd D:\ZameenAI\backend

# 1. Live end-to-end probe of all 7 roles (boots the app in-process)
python scripts\probe_roles.py

# 2. Static contract checks (no server needed)
python scripts\verify_rbac.py

# 3. Backend/frontend permission parity
python scripts\permission_drift.py

# 4. Show the live role x permission matrix
python scripts\show_matrix.py

# 5. List every route with its methods
python scripts\list_routes.py
```

`probe_roles.py` is the primary harness. It authenticates each seeded identity,
exercises a representative endpoint at every permission and scope boundary, and
**exits non-zero if any expectation breaks** — so it is safe to wire into CI today.

---

## 1. The 7 roles and their test identities

Six identities use a shared password. `citizen` authenticates by OTP.

| Username | Role (canonical) | User id | Project scope | Auth method |
|---|---|---|---|---|
| `admin` | `system_admin` | `u-admin` | none — global | password |
| `pia` | `pia` | `u-pia` | project `1` | password |
| `field` | `field_officer` | `u-field` | project `1` | password |
| `validator` | `desk_validator` | `u-validator` | project `1` | password |
| `approver` | `approver` | `u-approver` | project `1` | password |
| `executive` | `executive` | `u-executive` | none — read-only | password |
| `citizen` | `citizen` | `u-citizen` | own record `LR-2026-000002` | **OTP** |

> **`validator` is a username, not a role.** The role is `desk_validator`. This trips up
> reviewers who grep the codebase for `"validator"`.

> The six password identities share one credential from `DEV_USERS_PASSWORD`. If it is
> unset, the backend generates an **ephemeral** password at boot and prints it — tokens
> from a previous process then fail with 401. Pin the value for stable testing:
> ```powershell
> $env:DEV_USERS_PASSWORD = "your-dev-password"
> ```

### Permission footprint (from `show_matrix.py`)

| Role | Total | Write | Read | Note |
|---|---|---|---|---|
| `system_admin` | `*` | all | all | wildcard, bypasses scope |
| `pia` | 28 | 11 | 17 | creates and submits, never approves |
| `field_officer` | 16 | 5 | 11 | narrowest government role |
| `desk_validator` | 31 | 9 | 22 | assigns records, updates extractions |
| `approver` | 43 | 21 | 22 | the only role that can freeze or approve |
| `executive` | 23 | **0** | 23 | strictly read-only |
| `citizen` | 14 | 2 | 12 | only `GRIEVANCE.CREATE`, `OBJECTION.CREATE` |

---

## 2. Boot the stack

```powershell
# Backend  (http://127.0.0.1:8000)
cd D:\ZameenAI\backend
$env:DEV_USERS_PASSWORD = "your-dev-password"
python -m uvicorn app.main:app --reload

# Frontend (http://127.0.0.1:5173)  - separate terminal
cd D:\ZameenAI\frontend
npm run dev
```

Confirm the server is alive: `GET http://127.0.0.1:8000/api/health`

---

## 3. Log in as each role

```powershell
# Government roles - password login
curl.exe -X POST http://127.0.0.1:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"approver\",\"password\":\"your-dev-password\"}'
```

Response shape — note there is **no `user` object**; take the role from `/api/auth/me`:

```json
{ "access_token": "...", "refresh_token": "...", "token_type": "bearer", "expires_in_minutes": 60 }
```

```powershell
# Confirm the role your token actually carries
curl.exe http://127.0.0.1:8000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

### Citizen — OTP flow (two calls, no password)

```powershell
# Step 1 - request the code. In dev the response contains "otp".
curl.exe -X POST http://127.0.0.1:8000/api/auth/citizen/request-otp `
  -H "Content-Type: application/json" -d '{\"username\":\"citizen\"}'

# Step 2 - exchange it
curl.exe -X POST http://127.0.0.1:8000/api/auth/citizen/verify-otp `
  -H "Content-Type: application/json" -d '{\"username\":\"citizen\",\"otp\":\"123456\"}'
```

A wrong OTP returns **401**.

---

## 4. Per-role test procedures

Each block lists the calls that **must** return the stated status. Anything else is a bug.

### 4.1 `system_admin` — full control, bypasses scope

```powershell
curl.exe http://127.0.0.1:8000/api/admin/users          -H "Authorization: Bearer $ADMIN"   # 200
curl.exe http://127.0.0.1:8000/api/admin/roles          -H "Authorization: Bearer $ADMIN"   # 200
curl.exe http://127.0.0.1:8000/api/admin/permissions    -H "Authorization: Bearer $ADMIN"   # 200
curl.exe http://127.0.0.1:8000/api/admin/system/config  -H "Authorization: Bearer $ADMIN"   # 200
curl.exe http://127.0.0.1:8000/api/admin/audit          -H "Authorization: Bearer $ADMIN"   # 200
curl.exe http://127.0.0.1:8000/api/workflow/audit       -H "Authorization: Bearer $ADMIN"   # 200
```

**Key behaviour to verify:** admin reads a record it is *not* assigned to and outside its
project — `GET /api/records/{any_id}` returns **200**. Admin is the only role that skips
project scope.

### 4.2 `executive` — read-only, and **not** an auditor

Read what it should see:

```powershell
curl.exe http://127.0.0.1:8000/api/acquisition/projects  -H "Authorization: Bearer $EXEC"  # 200
curl.exe http://127.0.0.1:8000/api/gis/parcels           -H "Authorization: Bearer $EXEC"  # 200
```

Refuse every write (all **403**):

```powershell
curl.exe -X POST   .../api/acquisition/projects                        -H "Authorization: Bearer $EXEC"  # 403
curl.exe -X POST   .../api/acquisition/records/LR-ASSIGNED/freeze     -H "Authorization: Bearer $EXEC"  # 403
curl.exe -X POST   .../api/workflow/records/LR-ASSIGNED/assign        -H "Authorization: Bearer $EXEC"  # 403
curl.exe -X PATCH  .../api/records/LR-ASSIGNED -d '{\"status\":\"VERIFIED\"}' -H "Authorization: Bearer $EXEC"  # 403
curl.exe -X POST   .../api/admin/users                                -H "Authorization: Bearer $EXEC"  # 403
```

Two refusals that are easy to get wrong:

```powershell
curl.exe .../api/admin/audit  -H "Authorization: Bearer $EXEC"   # 403 - AUDIT.READ is admin-only
curl.exe .../api/admin/users  -H "Authorization: Bearer $EXEC"   # 403
```

> **Executive is read-only but is deliberately *not* an auditor.** Being able to read
> dashboards and reports does not grant access to the audit trail. `AUDIT.READ` belongs to
> `system_admin` alone.

### 4.3 `pia` — creates and submits, never approves

```powershell
curl.exe -X POST .../api/acquisition/projects/PRJ-DRAFT/submit   -H "Authorization: Bearer $PIA"  # 200
curl.exe -X POST .../api/acquisition/projects/PRJ-PEND/approve   -H "Authorization: Bearer $PIA"  # 403
curl.exe -X POST .../api/acquisition/records/LR-ASSIGNED/freeze  -H "Authorization: Bearer $PIA"  # 403
curl.exe -X POST .../api/workflow/records/LR-ASSIGNED/assign     -H "Authorization: Bearer $PIA"  # 403
curl.exe      .../api/admin/users                                 -H "Authorization: Bearer $PIA"  # 403
```

`403` on `/approve` is the separation-of-duties rule: the agency that raises the case
cannot sign it off.

### 4.4 `field_officer` — only records assigned to it

This is the **assignment scope** test, and it is the one most often broken.

```powershell
# assigned to u-field  -> 200
curl.exe .../api/records/LR-ASSIGNED    -H "Authorization: Bearer $FIELD"   # 200
# NOT assigned to u-field -> 404, not 403
curl.exe .../api/records/LR-UNASSIGNED  -H "Authorization: Bearer $FIELD"   # 404
curl.exe .../api/gis/parcels            -H "Authorization: Bearer $FIELD"   # 200
curl.exe -X POST .../api/acquisition/projects -H "Authorization: Bearer $FIELD"  # 403
```

> Out-of-scope returns **404, not 403**. A 403 would confirm the record exists, leaking
> information to a user who has no right to know it. Assert 404 specifically.

### 4.5 `desk_validator` — assignment and correction, no approval

```powershell
# assign a real principal -> 200
curl.exe -X POST ".../api/workflow/records/LR-UNASSIGNED/assign?assignee_id=u-field" `
  -H "Authorization: Bearer $VAL"      # 200

# assign a user that does not exist -> 404 ASSIGNEE_NOT_FOUND
curl.exe -X POST ".../api/workflow/records/LR-UNASSIGNED/assign?assignee_id=u-ghost" `
  -H "Authorization: Bearer $VAL"      # 404

curl.exe -X PATCH .../api/records/LR-UNASSIGNED -d '{\"status\":\"VALIDATED\"}' `
  -H "Authorization: Bearer $VAL"      # 200

# no approval or freeze rights
curl.exe -X POST .../api/acquisition/projects/PRJ-PEND/approve  -H "Authorization: Bearer $VAL"  # 403
curl.exe -X POST .../api/acquisition/records/LR-UNASSIGNED/freeze -H "Authorization: Bearer $VAL"  # 403
```

`assignee_id=u-ghost` → **404 `ASSIGNEE_NOT_FOUND`**: the endpoint validates that the
assignee is a real, active principal rather than storing an arbitrary string.

### 4.6 `approver` — the only role that can approve or freeze

```powershell
curl.exe -X POST .../api/acquisition/projects/PRJ-PEND/approve `
  -H "Authorization: Bearer $APPROVER"    # 200

# freeze a record where this approver holds authority -> 200
curl.exe -X POST .../api/acquisition/records/LR-ASSIGNED/freeze `
  -H "Content-Type: application/json" -H "Authorization: Bearer $APPROVER" `
  -d '{\"text\":\"court order\"}'         # 200

# freeze where the authority list is EMPTY -> 404, never 200
curl.exe -X POST .../api/acquisition/records/LR-UNASSIGNED/freeze `
  -H "Content-Type: application/json" -H "Authorization: Bearer $APPROVER" `
  -d '{\"text\":\"court order\"}'         # 404

curl.exe .../api/admin/audit -H "Authorization: Bearer $APPROVER"   # 403 - not an admin
```

Three rules to assert:

1. **Empty authority list grants nobody freeze rights.** Freezing is a legal hold, so an
   approver who is not explicitly listed is refused. It fails *closed*.
2. **Refusal is 404, not 403**, so it does not disclose that the record exists.
3. **A body is mandatory.** Omitting it returns `422 INVALID_INPUT` — a client error, not
   an authorization decision. Order matters: validation → permission → scope.

### 4.7 `citizen` — OTP, and ownership-scoped reads

```powershell
# a record the citizen does not own -> 404
curl.exe .../api/records/LR-ASSIGNED      -H "Authorization: Bearer $CITIZEN"   # 404
curl.exe .../api/admin/users              -H "Authorization: Bearer $CITIZEN"   # 403
curl.exe .../api/acquisition/projects     -H "Authorization: Bearer $CITIZEN"   # 200
```

The citizen's seeded scope is `LR-2026-000002`. Any other record id returns **404**.

> The scope grants access, but the probe still sees 404 for `LR-2026-000002` itself —
> the scope names a record that does not exist in a fresh dev database. To prove the
> *positive* citizen path you must first create that record, then confirm the citizen
> gets 200. The 404-on-everything behaviour above proves isolation but not access.

---

## 5. The cross-role workflow chain

The strongest single RBAC test is the project lifecycle, because **each state admits a
different role**. Walk it in order and watch the same endpoints change their answers.

```
DRAFT ──submit──▶ SUBMITTED ──▶ UNDER_VERIFICATION ──▶ VERIFIED
       (pia)        (validator)     (validator)

VERIFIED ──▶ PENDING_APPROVAL ──▶ APPROVED ──▶ NOTIFICATION
            (validator)          (approver)    (approver)

NOTIFICATION ──▶ COMPENSATION ──▶ POSSESSION ──▶ COMPLETED
              (approver)          (approver)    (approver)
```

`REJECTED` and `COMPLETED` are terminal — every further move returns
`422 INVALID_TRANSITION`.

The decisive test: **the permission gate fires before the state gate.**

| Project state | `pia` | `executive` | `validator` | `approver` |
|---|---|---|---|---|
| `DRAFT` + `/submit` | **200** | 403 | 403 | — |
| `SUBMITTED` + `/submit` | 403 | 403 | **403** | — |
| `PENDING_APPROVAL` + `/approve` | 403 | 403 | 403 | **200** |
| `APPROVED` + `/approve` | — | — | — | **422** `INVALID_TRANSITION` |

The `SUBMITTED` row is the important one. The project is in a state where `/submit` is
already invalid, yet a validator still receives **403 rather than 422** — authorization is
evaluated first, so the API never reveals workflow internals to a role that has no
business in the workflow at all.

---

## 6. The freeze lifecycle

Freeze is the highest-consequence operation in the system, so it has its own rules.

| Step | Actor | Endpoint | Expected |
|---|---|---|---|
| 1. freeze, authority held | `approver` | `POST /api/acquisition/records/{id}/freeze` | **200** |
| 2. edit a frozen record | `validator` (in scope, has `LAND_RECORD.UPDATE`) | `PATCH /api/records/{id}` | **423** `RECORD_FROZEN` |
| 3. freeze without authority | `approver` (empty list) | `POST .../freeze` | **404** |
| 4. freeze with no body | anyone | `POST .../freeze` | **422** `INVALID_INPUT` |
| 5. freeze state unreadable | anyone | `POST .../freeze` | **503** `FREEZE_STATE_UNAVAILABLE` |

Step 2 is the one to check carefully: the editor **has** the permission and **is** in
scope, and is still refused — with 423, not 403, because the blocker is record state, not
identity. If step 2 returns 403, the role is missing `LAND_RECORD.UPDATE` and the test is
proving the wrong thing. (`approver` itself cannot perform step 2: it holds
`LAND_RECORD.APPROVE`/`REJECT`, not `LAND_RECORD.UPDATE`.)

Step 5 is fail-closed: if the freeze state cannot be read, the write is refused rather
than allowed on an unknown state.

---

## 7. Error code reference

| Status | Code | Meaning |
|---|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | no token, expired, or bad credentials |
| 401 | — | wrong OTP |
| 403 | `PERMISSION_DENIED` | role lacks the required permission |
| 403 | `SELF_DISABLE_DENIED` | admin tried to disable their own account |
| 404 | `RESOURCE_NOT_FOUND` | **or** out of scope — deliberately indistinguishable |
| 404 | `ASSIGNEE_NOT_FOUND` | assignment target is not a real active principal |
| 400 | `JUSTIFICATION_REQUIRED` | unfreeze without a reason |
| 422 | `INVALID_INPUT` | request body failed validation |
| 422 | `INVALID_TRANSITION` | edge is not in the lifecycle map |
| 422 | `ROLE_NOT_ALLOWED` | role cannot enter that target state |
| 423 | `RECORD_FROZEN` | edit refused; record is under legal hold |
| 429 | `RATE_LIMITED` | too many login attempts |
| 503 | `FREEZE_STATE_UNAVAILABLE` | freeze state unreadable — write refused |
| 503 | `DB_UNAVAILABLE` / `BROKER_UNAVAILABLE` | dependency down |
| 500 | `INTERNAL_ERROR` | unexpected failure |

All errors share one envelope:

```json
{ "error": { "code": "RECORD_FROZEN", "message": "Record is frozen; request unfreeze first",
             "status": 423, "request_id": "8dca0d10-..." } }
```

Quote the `code`, not the `message`, in assertions — messages are for humans and may be
reworded.

---

## 8. Manual UI testing per role

Login at `http://127.0.0.1:5173` and walk the role-specific home route.

| Role | Lands on | Verify |
|---|---|---|
| `admin` | Admin dashboard | user management, role list, audit log, system config all reachable |
| `pia` | PIA workspace | create + submit a case; **no** Approve or Freeze button anywhere |
| `field` | Field mobile view | only assigned records; no acquisition creation |
| `validator` | Validation desk | review side-by-side, assign records, edit extractions; no approval |
| `approver` | Approver console | Approve / Reject / Freeze present |
| `executive` | Analytics dashboard | all data visible, **every** action button hidden or disabled |
| `citizen` | Citizen portal | only own record; read-only |

Two UI-specific checks:

1. **Navigation follows the authenticated role.** Log in, then switch accounts — the landing
   route must change. A stale-context redirect that keeps the previous role's home is a bug.
2. **The permission mirror must stay in sync.** `permission_drift.py` compares the frontend
   `hasPermission()` table against the backend registry. It must report `0` missing and
   `0` invented. A *missing* entry hides buttons the user is entitled to use, which is the
   most common RBAC defect in the UI layer.

---

## 9. Automated regression suites

```powershell
cd D:\ZameenAI\backend

python scripts\verify_rbac.py                                          # 42 static checks
python scripts\probe_roles.py                                          # 77 live probes
python scripts\permission_drift.py                                     # 87 vs 87

python -m pytest tests\test_rbac_security.py tests\test_acquisition_authz.py `
                 tests\test_backend_integration.py -q                   # 56 tests
```

| File | Covers |
|---|---|
| `scripts/probe_roles.py` | live matrix across all 7 roles — start here |
| `scripts/verify_rbac.py` | static contract checks, no server needed |
| `scripts/permission_drift.py` | backend ↔ frontend permission parity |
| `scripts/show_matrix.py` | prints the live matrix |
| `scripts/list_routes.py` | prints every route and method |
| `tests/test_rbac_security.py` | 401/403 paths, citizen isolation, role aliases |
| `tests/test_acquisition_authz.py` | scope, assignment, freeze, lifecycle |
| `tests/test_backend_integration.py` | cross-module integration |

**Full suite status:** `723 passed, 46 skipped`, plus 4 pre-existing environment failures
unrelated to RBAC (missing `google.genai` `TranslationConfig`, an OCR fixture returning
zero words, and an unavailable Surya/Docker dependency).

---

## 10. Known gaps

1. **Citizen can authenticate with a password in dev.** `citizen` is present in
   `DEV_USERS`, so `/api/auth/login` accepts the shared dev password for the citizen
   account, where the specification requires OTP only. Production is unaffected — there is
   no `DEV_USERS` outside development — but the seeded identity does not model the
   production flow. Fix: reject `CITIZEN` in `authenticate_user` and update the 25 test
   references that use the `_h("citizen")` login helper to go through the OTP endpoints.
2. **Scope assignments are in memory.** `seed_assignment` / `assign_record` state lives in a
   process-level dict and resets on restart. This is the main production blocker: restart
   the API and every field officer's assignment scope disappears. Persist it, and add a
   migration (no Alembic chain exists yet).
3. **No frontend test runner.** The UI permission behaviour is covered by `tsc`, the build,
   and `permission_drift.py` — not by executable UI tests. Roles cannot be regression-tested
   in the browser automatically yet.
4. **Only two roles are exercised end-to-end for the freeze lifecycle.** `pia` and `field`
   freeze denials are asserted, but the unfreeze path and the contested/sub-judice flow have
   no live probe.
5. **Test fixtures are probe-owned.** `probe_roles.py` creates `PRJ-*` and `LR-*` rows in the
   dev database and does not clean up after itself. Delete them if you want a pristine
   dataset.
