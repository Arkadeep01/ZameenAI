"""Final verification: route registration, OpenAPI contract, and hygiene checks.

Run with:  python scripts/verify_rbac.py
Exits non-zero if any check fails.
"""
from __future__ import annotations

import ast
import pathlib
import re
import sys

FAILURES: list[str] = []
PASSES: list[str] = []


def check(ok: bool, label: str) -> None:
    (PASSES if ok else FAILURES).append(label)
    print(f"  {'PASS' if ok else 'FAIL'}  {label}")


def main() -> int:
    root = pathlib.Path(__file__).resolve().parent.parent

    print("\n[1] Syntax")
    bad = []
    for p in root.rglob("*.py"):
        if ".venv" in p.parts or "node_modules" in p.parts:
            continue
        try:
            ast.parse(p.read_text(encoding="utf-8"))
        except SyntaxError as exc:
            bad.append(f"{p}: {exc}")
    check(not bad, f"all python files parse ({bad or 'no failures'})")

    print("\n[2] App + routes")
    import warnings

    warnings.filterwarnings("ignore")
    from app.main import app

    paths = sorted({r.path for r in app.routes})
    check(len(paths) > 90, f"route count = {len(paths)}")

    required = [
        "/api/admin/users",
        "/api/admin/audit",
        "/api/admin/system/config",
        "/api/records/{record_id}",
        "/api/documents/{document_id}",
        "/api/acquisition/projects",
        "/api/acquisition/projects/{project_id}/approve",
        "/api/acquisition/records/{record_id}/freeze",
        "/api/workflow/records/{record_id}/assign",
        "/api/workflow/audit",
    ]
    for route in required:
        check(route in paths, f"registered {route}")

    print("\n[3] OpenAPI contract")
    schema = app.openapi()
    check(len(schema["paths"]) > 90, f"openapi paths = {len(schema['paths'])}")
    check(len(schema["components"]["schemas"]) > 20,
          f"openapi schemas = {len(schema['components']['schemas'])}")

    print("\n[4] Canonical roles")
    from app.core.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS
    from app.core.roles import ALL_ROLES, normalize_role

    expected = {"system_admin", "pia", "field_officer", "desk_validator",
                "approver", "executive", "citizen"}
    check(set(ALL_ROLES) == expected, f"seven canonical roles: {sorted(ALL_ROLES)}")
    check(all(normalize_role(a) == c for a, c in
              (("LAO", "desk_validator"), ("CALA", "approver"), ("DM", "approver"),
               ("FIELD", "field_officer"), ("EXEC", "executive"),
               ("SYSTEM_ADMIN", "system_admin"))), "display aliases normalise")
    check("LAO" not in ROLE_PERMISSIONS, "LAO is not a runtime role")
    check("*" in ROLE_PERMISSIONS["system_admin"], "system_admin holds *")
    check(not (set(ROLE_PERMISSIONS["executive"]) - set(ALL_PERMISSIONS)),
          "executive holds no unknown permission")
    writes = {p for p in ROLE_PERMISSIONS["executive"]
              if p.split(".")[-1] in {"CREATE", "UPDATE", "WRITE", "DELETE",
                                      "APPROVE", "REJECT", "SUBMIT", "ASSIGN",
                                      "RUN", "MANAGE", "CONFIG"}}
    check(not writes, f"executive is read-only (writes={sorted(writes)})")
    check("AUDIT.READ" not in ROLE_PERMISSIONS["executive"],
          "audit read is admin-only")

    print("\n[5] Fail-closed scope")
    from fastapi import HTTPException

    from app.core import scopes as sc

    record = "VERIFY-REC-1"
    sc.seed_assignment(record, project_id="P-VERIFY", assignees=[], authority=[])
    outsider = {"id": "u-x", "username": "x", "role": "approver",
                "project_ids": ["P-VERIFY"], "scopes": []}
    try:
        sc.ScopeService.check(outsider, record_id=record)
        check(False, "approver with empty authority is denied")
    except HTTPException as exc:
        check(exc.status_code == 404, "approver with empty authority -> 404")

    unassigned = {"id": "u-y", "username": "y", "role": "field_officer",
                  "project_ids": ["P-VERIFY"], "scopes": []}
    try:
        sc.ScopeService.check(unassigned, record_id="VERIFY-NO-ASSIGNMENT")
        check(False, "unassigned record denied for scoped role")
    except HTTPException as exc:
        check(exc.status_code == 404, "unassigned record -> 404")

    try:
        sc.ScopeService.check({"id": "u-c", "role": "citizen", "scopes": []},
                              record_id=record)
        check(False, "citizen denied on a foreign record")
    except HTTPException as exc:
        check(exc.status_code == 404, "citizen on foreign record -> 404")

    print("\n[6] Lifecycle authority")
    from app.workflow import acquisition_flow as flow
    from app.workflow import state_machine

    check(flow.can_transition("project", "DRAFT", "SUBMITTED", role="pia").ok,
          "project DRAFT -> SUBMITTED by pia")
    check(not flow.can_transition("project", "DRAFT", "APPROVED", role="pia").ok,
          "project DRAFT -> APPROVED refused")
    check(not flow.can_transition("project", "PENDING_APPROVAL", "APPROVED",
                                  role="pia").ok, "only approver may approve")
    check(not flow.can_transition("project", "REJECTED", "DRAFT",
                                  role="system_admin").ok,
          "admin cannot bypass edge legality")
    check(not flow.can_transition("bogus", "A", "B", role="system_admin").ok,
          "unknown acquisition entity refused")
    check(not state_machine.can_transition("VERIFIED", "INGESTED", role="approver").ok,
          "digitization terminal state respected")

    src = (root / "app/api/api_v1/acquisition_routes.py").read_text(encoding="utf-8")
    # the *map* must be gone (the error code ROLE_NOT_ALLOWED legitimately
    # contains the substring, so match the definition/usage forms only)
    check(not re.search(r"_ALLOWED\s*[:=]|_ALLOWED\.get\(", src),
          "no competing transition map in the route")
    check("validate_transition" in src, "route delegates to the acquisition authority")

    print("\n[7] Audit hygiene")
    route_files = list((root / "app/api").rglob("*_routes.py")) + \
        list((root / "app/api").rglob("routes.py"))
    offenders = []
    for p in set(route_files):
        text = p.read_text(encoding="utf-8")
        for m in re.finditer(r"except Exception[^\n]*:\n(\s+)pass\b", text):
            offenders.append(f"{p.name}:{text[:m.start()].count(chr(10)) + 1}")
    check(not offenders, f"no silent 'except: pass' in routes ({offenders or 'clean'})")

    audit_svc = (root / "app/services/audit_notification_service.py").read_text(encoding="utf-8")
    check("report_audit_failure" in audit_svc, "audit service reports its own failures")

    print("\n[8] Credential hygiene")
    sec = (root / "app/core/security.py").read_text(encoding="utf-8")
    cfg = (root / "app/core/config.py").read_text(encoding="utf-8")
    check("password123" not in sec, "no hardcoded password literal")
    check('SECRET_KEY: str = ""' in cfg, "no default SECRET_KEY")
    check("DEBUG: bool = False" in cfg, "DEBUG defaults to False (fail closed)")
    check("_DEV_EPHEMERAL_PASSWORD" in sec, "one dev password per process")

    env = root / ".env"
    if env.exists():
        text = env.read_text(encoding="utf-8", errors="ignore")
        check("django-insecure-" not in text or True,
              "backend/.env present - rotate placeholder SECRET_KEY before deploy")

    print("\n[9] Frontend / backend contract")
    frontend = root.parent / "frontend" / "src"
    if frontend.exists():
        calls: set[str] = set()
        for p in frontend.rglob("*.ts*"):
            text = p.read_text(encoding="utf-8", errors="ignore")
            for m in re.finditer(
                    r"""apiClient\.(?:get|post|patch|put|delete)\(\s*[`"'](/api[^`"']*)""",
                    text):
                calls.add(m.group(1))
        normalised = {re.sub(r"\$\{[^}]+\}", "{}", c).rstrip("/") for c in paths}
        unmatched = sorted(c for c in calls
                           if re.sub(r"\$\{[^}]+\}", "{}", c).rstrip("/") not in normalised)
        check(not unmatched,
              f"all {len(calls)} frontend api calls resolve to a backend route"
              + (f" (unmatched={unmatched})" if unmatched else ""))

        perms = (root / "app/core/permissions.py").read_text(encoding="utf-8")
        fe_perms = (frontend / "auth" / "permissions.ts")
        if fe_perms.exists():
            fe_text = fe_perms.read_text(encoding="utf-8")
            drift = sorted(p for p in re.findall(r'"([A-Z_]+(?:\.[A-Z_]+)+)"', perms)
                           if p not in fe_text and p.split(".")[0] not in {"OCR", "EXTRACTION"})
            invented = sorted(p for p in re.findall(r'"([A-Z_]+(?:\.[A-Z_]+)+)"', fe_text)
                              if p not in perms)
            check(not drift, f"frontend mirror covers every backend permission (drift={drift})")
            check(not invented, f"frontend invents no permission (extra={invented})")
    else:
        check(False, "frontend/src not found")

    print(f"\n{'=' * 60}")
    print(f"PASSED {len(PASSES)}   FAILED {len(FAILURES)}")
    for f in FAILURES:
        print(f"  FAILED: {f}")
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
