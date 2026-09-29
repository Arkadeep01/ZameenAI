# RBAC Matrix (server-side enforced)

Roles: `system_admin`, `pia`, `field_officer`, `desk_validator` (=LAO),
`approver`, `executive`, `citizen`. Identity comes only from the verified
JWT (`app/core/deps.py:get_current_user`); client-supplied role/user/project
ids are never trusted.

| Capability | admin | pia | field | validator | approver | exec | citizen |
|---|---|---|---|---|---|---|---|
| system/user/config, audit read | ✓ | | | | | | |
| project/acquisition mgmt, reports | ✓ | ✓ | | | | | |
| upload, assigned records, field verify | ✓ | ✓ | ✓ | | | | |
| validation/doc review/HITL/corrections | ✓ | | | ✓ | | | |
| approve/reject workflow transitions | ✓ | | | (verify) | ✓ | | |
| read/report/dashboard | ✓ | ✓ | | ✓ | ✓ | ✓ | own only |
| own record/status/grievance | ✓ | | | | | | ✓ (scoped) |

Permission strings (`MODULE.ACTION`): `DOCUMENT.CREATE/READ`,
`DIGITIZATION.RUN/READ`, `VALIDATION.REVIEW`, `HITL.REVIEW`,
`CORRECTION.REQUEST`, `WORKFLOW.READ/APPROVE/REJECT`, `FIELD.VERIFY`,
`GIS.READ`, `REPORT.READ`, `DASHBOARD.READ`, `OWN.RECORD.READ`,
`PROJECT.READ/WRITE`. `system_admin` holds `*`.

Endpoint guards: jobs `RUN`/`READ`, HITL decision `HITL.REVIEW`, canonical
`WORKFLOW.APPROVE`, GIS links `GIS.READ`, audit `WORKFLOW.READ`.

IDOR/BOLA: `enforce_ownership` denies cross-user citizen access and
cross-project access for scoped roles (tested: forged project/record ids →
403; unauthenticated → 401; bad credentials → 401).
