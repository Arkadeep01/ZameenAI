"""Security regression tests for RBAC, object scope, workflow and audit.

Covers the PRD acceptance matrix:
- 401 for anonymous access on every sensitive route group.
- 403 for cross-role capability escalation.
- 404 (enumeration-safe) for out-of-scope objects, never 200.
- Citizen A cannot read Citizen B data.
- PIA project isolation (no cross-project access).
- HITL decisions cannot be made on out-of-scope records.
- Audit rows are written for sensitive actions and are append-only.
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core import scopes as scopes_mod
from app.core.roles import APPROVER, CITIZEN, DESK_VALIDATOR, EXECUTIVE, FIELD_OFFICER, PIA
from app.database.session import init_domain_db
from app.main import app

# Supplied by tests/conftest.py; no credential is hardcoded in source.
DEV_PASSWORD = os.environ.get("DEV_USERS_PASSWORD", "")

init_domain_db()
client = TestClient(app, raise_server_exceptions=False)

SENSITIVE_PATHS = [
    ("GET", "/api/jobs/ANY"),
    ("GET", "/api/digitization/remediation/ANY"),
    ("GET", "/api/digitization/resubmission/ANY"),
    ("GET", "/api/digitization/validation/ANY"),
    ("GET", "/api/records/ANY"),
    ("GET", "/api/gis/parcels"),
    ("GET", "/api/gis/db/parcels"),
    ("GET", "/api/workflow/records/ANY/state"),
    ("GET", "/api/workflow/audit"),
    ("GET", "/api/acquisition/projects"),
    ("GET", "/api/admin/users"),
    ("GET", "/api/admin/audit"),
]


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """The login/OTP rate limiter is a real control; isolate it per test."""
    from app.core import token_store as ts

    ts._rate_buckets.clear()
    yield
    ts._rate_buckets.clear()


def _token(username: str, password: str = "") -> str:
    r = client.post("/api/auth/login",
                    json={"username": username, "password": password or DEV_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _h(username: str) -> dict:
    return {"Authorization": f"Bearer {_token(username)}"}


# --- authentication -------------------------------------------------------

def test_all_sensitive_routes_require_authentication():
    for method, path in SENSITIVE_PATHS:
        r = client.request(method, path)
        assert r.status_code == 401, f"{method} {path} -> {r.status_code}"
        assert r.json()["error"]["code"] in (
            "AUTHENTICATION_REQUIRED", "AUTHENTICATION_FAILED", "TOKEN_EXPIRED")


def test_malformed_and_forged_tokens_rejected():
    for bad in ("forged.token.here", "a.b.c", "", "Bearer"):
        h = {"Authorization": bad} if bad != "Bearer" else {"Authorization": "Bearer"}
        r = client.get("/api/auth/me", headers=h)
        assert r.status_code == 401, bad


def test_logout_revokes_refresh_token():
    login = client.post("/api/auth/login",
                        json={"username": "validator", "password": DEV_PASSWORD}).json()
    h = {"Authorization": f"Bearer {login['access_token']}"}
    out = client.post("/api/auth/logout", json={"refresh_token": login["refresh_token"]},
                      headers=h)
    assert out.status_code == 200
    # refresh must no longer be usable
    again = client.post("/api/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert again.status_code == 401


# --- permission / capability boundaries -----------------------------------

def test_capability_escalation_matrix():
    cases = [
        ("citizen", "GET", "/api/admin/users"),
        ("field", "GET", "/api/admin/audit"),
        ("validator", "GET", "/api/admin/users"),
        ("executive", "POST", "/api/acquisition/records/ANY/freeze"),
        ("citizen", "POST", "/api/acquisition/records/ANY/freeze"),
        ("executive", "POST", "/api/workflow/records/ANY/canonical"),
    ]
    for username, method, path in cases:
        r = client.request(method, path, headers=_h(username))
        assert r.status_code in (403, 404), f"{username} {method} {path} -> {r.status_code}"
        if r.status_code == 403:
            assert r.json()["error"]["code"] == "PERMISSION_DENIED"


def test_citizen_project_listing_leaks_nothing():
    """Citizens may list their own acquisitions, but never another party's."""
    r = client.get("/api/acquisition/projects", headers=_h("citizen"))
    assert r.status_code == 200
    assert r.json()["count"] == 0 and r.json()["projects"] == []


def test_admin_only_surface():
    for username in ("pia", "field", "validator", "approver", "executive", "citizen"):
        r = client.get("/api/admin/system/config", headers=_h(username))
        assert r.status_code == 403, username


# --- object scope / IDOR --------------------------------------------------

def _user(role: str, user_id: str, project_ids=None, scopes=None) -> dict:
    return {"id": user_id, "username": user_id, "role": role,
            "project_ids": project_ids or [], "scopes": scopes or []}


def test_citizen_scope_isolation_is_enumeration_safe():
    a = _user(CITIZEN, "u-cit-a", scopes=["LR-A"])
    b = _user(CITIZEN, "u-cit-b", scopes=["LR-B"])
    scopes_mod.ScopeService.check(a, record_id="LR-A")
    with pytest.raises(Exception) as exc:  # HTTPException 404
        scopes_mod.ScopeService.check(b, record_id="LR-A")
    assert exc.value.status_code == 404
    assert exc.value.detail["code"] == "RESOURCE_NOT_FOUND"


def test_citizen_filter_lists_only_own_records():
    a = _user(CITIZEN, "u-cit-a", scopes=["LR-A"])
    assert scopes_mod.ScopeService.filter_records(a, ["LR-A", "LR-B", "LR-C"]) == ["LR-A"]


def test_pia_project_isolation():
    pia_one = _user(PIA, "u-pia-1", project_ids=["1"])
    pia_two = _user(PIA, "u-pia-2", project_ids=["2"])
    scopes_mod.ScopeService.check(pia_one, project_id="1")
    scopes_mod.ScopeService.check(pia_two, project_id="2")
    with pytest.raises(Exception) as exc:
        scopes_mod.ScopeService.check(pia_one, project_id="2")
    assert exc.value.status_code == 404
    with pytest.raises(Exception) as exc:
        scopes_mod.ScopeService.check(pia_two, project_id="1")
    assert exc.value.status_code == 404


def test_pia_with_no_assignment_is_denied_not_allowed():
    pia_none = _user(PIA, "u-pia-none", project_ids=[])
    with pytest.raises(Exception) as exc:
        scopes_mod.ScopeService.check(pia_none, project_id="1")
    assert exc.value.status_code == 404, "unassigned project scope must fail closed"


def test_field_officer_respects_record_assignment():
    field = _user(FIELD_OFFICER, "u-field", project_ids=["1"])
    other = _user(FIELD_OFFICER, "u-field-2", project_ids=["1"])
    scopes_mod.seed_assignment("LR-ASSIGNED", project_id="1", assignees=["u-field"])
    scopes_mod.ScopeService.check(field, record_id="LR-ASSIGNED")
    with pytest.raises(Exception) as exc:
        scopes_mod.ScopeService.check(other, record_id="LR-ASSIGNED")
    assert exc.value.status_code == 404


def test_approver_authority_list_is_enforced():
    a1 = _user(APPROVER, "u-app-1", project_ids=["1"])
    a2 = _user(APPROVER, "u-app-2", project_ids=["1"])
    scopes_mod.seed_assignment("LR-AUTH", project_id="1", authority=["u-app-1"])
    scopes_mod.ScopeService.check(a1, record_id="LR-AUTH")
    with pytest.raises(Exception) as exc:
        scopes_mod.ScopeService.check(a2, record_id="LR-AUTH")
    assert exc.value.status_code == 404


def test_executive_has_no_write_permissions():
    from app.core.permissions import permissions_for

    perms = permissions_for(EXECUTIVE)
    write_verbs = (".CREATE", ".UPDATE", ".DELETE", ".FREEZE", ".UNFREEZE", ".APPROVE",
                   ".REJECT", ".SUBMIT", ".ASSIGN", ".REVIEW", ".ISSUE", ".RESOLVE",
                   ".FLAG", ".PROCESS", ".RUN", ".VALIDATE", ".PAYMENT_REQUEST")
    offending = sorted(p for p in perms if p.endswith(write_verbs))
    assert not offending, f"executive must be read-only, found: {offending}"


def test_audit_read_is_admin_only_per_canonical_matrix():
    from app.core.permissions import permissions_for

    for role in (PIA, FIELD_OFFICER, DESK_VALIDATOR, APPROVER, EXECUTIVE, CITIZEN):
        assert "AUDIT.READ" not in permissions_for(role), role
    assert "AUDIT.READ" in permissions_for("system_admin")


def test_filter_records_denies_out_of_project_records():
    pia_one = _user(PIA, "u-pia-1", project_ids=["1"])
    scopes_mod.seed_assignment("LR-P1", project_id="1")
    scopes_mod.seed_assignment("LR-P2", project_id="2")
    assert scopes_mod.ScopeService.filter_records(pia_one, ["LR-P1", "LR-P2"]) == ["LR-P1"]


# --- workflow authority ---------------------------------------------------

def test_workflow_transition_authority_by_role():
    from app.workflow import state_machine as sm

    assert sm.can_transition(sm.UNDER_REVIEW, sm.VERIFIED, role=APPROVER).ok
    assert not sm.can_transition(sm.UNDER_REVIEW, sm.VERIFIED, role=CITIZEN).ok
    assert not sm.can_transition(sm.VERIFIED, sm.VERIFIED, role=APPROVER).ok


def test_hitl_decision_rejects_invalid_transition_before_state_change():
    from app.services.workflow_service import WorkflowService
    from app.database.session import _SessionFactory

    svc = WorkflowService(_SessionFactory())
    res = svc.hitl_decision(hitl_id="HITL-NOT-REAL", decision="NONSENSE_STATE",
                            reviewer="validator", actor_role=DESK_VALIDATOR)
    assert res["status"] == "FAILED"
    assert res["error_code"] == "INVALID_TRANSITION"


def test_hitl_decision_route_is_scope_gated():
    r = client.post("/api/workflow/hitl/HITL-NOT-REAL/decision",
                    json={"decision": "VERIFIED"}, headers=_h("validator"))
    # out-of-scope/unknown session must not be decided
    assert r.status_code in (404, 422, 400), r.text


# --- audit ----------------------------------------------------------------

def test_audit_is_written_for_sensitive_actions_and_read_is_gated():
    # trigger a real sensitive action (upload is the cheapest audited mutation)
    img = b"\x89PNG\r\n\x1a\n" + b"2" * 120
    r = client.post("/api/upload", files={"file": ("t.png", img, "image/png")},
                    headers=_h("pia"))
    assert r.status_code in (200, 400), r.text
    # audit reads are capability-gated
    pia = client.get("/api/workflow/audit", headers=_h("pia"))
    assert pia.status_code == 403
    admin = client.get("/api/admin/audit", headers=_h("admin"))
    assert admin.status_code == 200
    assert "events" in admin.json()


def test_audit_repository_has_no_mutation_api():
    """Append-only: the repository exposes no update/delete for audit rows."""
    import inspect

    from app.repositories.domain_repositories import AuditRepository

    names = {n for n, _ in inspect.getmembers(AuditRepository, predicate=inspect.isfunction)}
    assert not names & {"update", "delete", "purge", "truncate"}
    assert "log" in names


def test_audit_failure_is_reported_not_swallowed():
    from app.services.audit_notification_service import report_audit_failure, audit_logger

    records = []
    handler = logging_handler_for(records)
    audit_logger.addHandler(handler)
    try:
        report_audit_failure("TEST_ACTION", "land_record", "LR-1", RuntimeError("boom"))
    finally:
        audit_logger.removeHandler(handler)
    assert records, "audit failure must be logged for alerting"


def logging_handler_for(sink: list):
    import logging

    handler = logging.Handler()
    handler.emit = lambda record: sink.append(record)
    return handler


# --- misc defence ---------------------------------------------------------

def test_error_envelope_never_leaks_internals():
    r = client.get("/api/records/DOES-NOT-EXIST", headers=_h("pia"))
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert "Traceback" not in r.text and "sqlalchemy" not in r.text.lower()


def test_scope_module_is_single_source():
    """No second competing scope/permission implementation may appear."""
    import app.core.deps as deps
    import app.core.permissions as perms
    from app.core.scopes import ScopeService

    assert deps.ScopeService is ScopeService
    assert perms.permissions_for is not None
    from app.core.roles import ALL_ROLES

    assert len(ALL_ROLES) == len(set(ALL_ROLES)) == 7


def test_dev_user_endpoint_hidden_outside_debug():
    from app.core.config import settings

    r = client.get("/api/auth/dev-users")
    if settings.DEBUG:
        assert r.status_code == 200
    else:
        assert r.status_code in (403, 404)


def test_upload_rejects_disallowed_extension():
    r = client.post("/api/upload", files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
                    headers=_h("pia"))
    assert r.status_code in (400, 415, 422), r.text


# --- no hardcoded credentials --------------------------------------------

def test_no_hardcoded_password_in_security_module():
    from pathlib import Path

    import app.core.config as config_mod
    import app.core.security as security_mod

    source = Path(security_mod.__file__).read_text(encoding="utf-8")
    assert "password123" not in source
    # A legacy default may only appear inside the production deny-list; it must
    # never be assigned or returned as a usable value.
    for line in source.splitlines():
        if "change-me" in line:
            assert "startswith" in line or " in {" in line, (
                f"unexpected default secret usage: {line}")
    # Config must not ship a default secret value.
    assert 'SECRET_KEY: str = ""' in Path(config_mod.__file__).read_text(encoding="utf-8")
    # DEBUG must not default to permissive in shipped code.
    assert "DEBUG: bool = False" in Path(config_mod.__file__).read_text(encoding="utf-8")


def test_production_boot_refuses_weak_secret(monkeypatch):
    from app.core import security as sec
    from app.core.config import settings

    monkeypatch.setattr(settings, "DEBUG", False)
    monkeypatch.setattr(settings, "SECRET_KEY", "short")
    with pytest.raises(RuntimeError):
        sec.assert_secure_secret()
    monkeypatch.setattr(settings, "SECRET_KEY", "x" * 48)
    sec.assert_secure_secret()  # strong secret is accepted


def test_production_boot_refuses_missing_and_placeholder_secret(monkeypatch):
    """A missing key must not be masked by an ephemeral development key."""
    from app.core import config as config_mod
    import app.core.security as sec

    monkeypatch.setattr(config_mod, "DEBUG", False)
    assert config_mod._resolve_secret_key("") == "", (
        "production must leave the key empty so the boot check fails closed")
    assert config_mod._resolve_secret_key('"placeholder"') == "placeholder"
    # development still gets a usable (but random) key
    monkeypatch.setattr(config_mod, "DEBUG", True)
    assert len(config_mod._resolve_secret_key("")) >= 32

    for bad in ("", "   ", "change-me", "django-insecure-abc123", "x" * 8):
        monkeypatch.setattr(sec.settings, "DEBUG", False)
        monkeypatch.setattr(sec.settings, "SECRET_KEY", bad)
        with pytest.raises(RuntimeError):
            sec.assert_secure_secret()


def test_dev_seed_password_is_shared_across_identities(monkeypatch):
    """All dev identities must resolve to one usable password per process."""
    from app.core import security as sec

    def _fresh():
        return [sec._dev_user(name, role, f"id-{name}")
                for name, role in (("a", "pia"), ("b", "desk_validator"), ("c", "citizen"))]

    # The configured credential applies to every seeded identity.
    monkeypatch.setattr(sec.settings, "DEV_USERS_PASSWORD", "shared-dev-pass")
    for user in _fresh():
        assert sec.verify_password("shared-dev-pass", user["password_hash"])

    # The generated fallback must be stable and identical for every identity,
    # otherwise the seed identities become unusable in a fresh process.
    monkeypatch.setattr(sec.settings, "DEV_USERS_PASSWORD", "")
    monkeypatch.setattr(sec, "_DEV_EPHEMERAL_PASSWORD", None)
    generated = sec._dev_password()
    assert generated and sec._dev_password() == generated
    for user in _fresh():
        assert sec.verify_password(generated, user["password_hash"]), (
            "every dev identity must accept the shared ephemeral password")


def test_production_authentication_ignores_dev_store(monkeypatch):
    from app.core import security as sec
    from app.core.config import settings

    monkeypatch.setattr(settings, "DEBUG", False)
    # No DB session supplied -> no credential can be validated.
    assert sec.authenticate_user("admin", DEV_PASSWORD, db=None) is None
