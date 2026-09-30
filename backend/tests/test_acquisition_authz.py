"""Acquisition + record domain authorization tests (scope, workflow, audit).

Covers the acquisition journey guards:
- PIA can create a project and stays in scope for it.
- An out-of-scope official gets an enumeration-safe 404, never 200.
- Case transitions are role-gated and state-gated.
- Freeze/unfreeze require the record to exist, be in scope and be justified.
- Land record updates reject frozen records (423).
"""
from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core import scopes as scopes_mod
from app.core.scopes import ScopeService
from app.database.models.acquisition import AcquisitionProject
from app.database.models.land_record import LandRecord
from app.database.session import _SessionFactory, init_domain_db
from app.main import app

DEV_PASSWORD = os.environ.get("DEV_USERS_PASSWORD", "")

init_domain_db()
client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from app.core import token_store as ts

    ts._rate_buckets.clear()
    yield
    ts._rate_buckets.clear()


def _h(username: str) -> dict:
    r = client.post("/api/auth/login", json={"username": username, "password": DEV_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _seed_project(project_id: str, **kw) -> None:
    db = _SessionFactory()
    try:
        if db.get(AcquisitionProject, project_id) is None:
            db.add(AcquisitionProject(id=project_id, name=kw.get("name", "P"),
                                      project_code=kw.get("code", project_id),
                                      status=kw.get("status", "DRAFT"),
                                      created_by="seed"))
            db.commit()
    finally:
        db.close()


def _seed_record(record_id: str, **kw) -> None:
    db = _SessionFactory()
    try:
        if db.get(LandRecord, record_id) is None:
            db.add(LandRecord(id=record_id, document_id=kw.get("document_id", "DOC-X"),
                              status=kw.get("status", "EXTRACTED")))
            db.commit()
    finally:
        db.close()


# --- project scope --------------------------------------------------------

def test_pia_creator_retains_scope_on_own_project():
    r = client.post("/api/acquisition/projects",
                    json={"name": "NH-44 Widening", "project_code": "NH44-2026",
                          "state": "UP", "district": "Varanasi"},
                    headers=_h("pia"))
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    assert client.get(f"/api/acquisition/projects/{pid}", headers=_h("pia")).status_code == 200
    listed = client.get("/api/acquisition/projects", headers=_h("pia")).json()
    assert any(p["id"] == pid for p in listed["projects"])
    assert client.post(f"/api/acquisition/projects/{pid}/submit",
                       headers=_h("pia")).status_code == 200


def test_project_out_of_scope_is_404_not_403():
    _seed_project("PRJ-OTHER-SECRET")
    scopes_mod.bind_project("PRJ-OTHER-SECRET", "u-someone-else")
    r = client.get("/api/acquisition/projects/PRJ-OTHER-SECRET", headers=_h("pia"))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "RESOURCE_NOT_FOUND"
    # enumeration-safe: the same 404 as a genuinely missing project
    missing = client.get("/api/acquisition/projects/PRJ-DOES-NOT-EXIST", headers=_h("pia"))
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == r.json()["error"]["code"]


def _set_project_status(project_id: str, status: str) -> None:
    db = _SessionFactory()
    try:
        row = db.get(AcquisitionProject, project_id)
        if row is not None:
            row.status = status
            db.commit()
    finally:
        db.close()


def test_project_transition_is_state_gated():
    _seed_project("PRJ-STATE", status="DRAFT")
    _set_project_status("PRJ-STATE", "DRAFT")
    scopes_mod.bind_project("PRJ-STATE", "u-pia")
    ok = client.post("/api/acquisition/projects/PRJ-STATE/submit", headers=_h("pia"))
    assert ok.status_code == 200 and ok.json()["status"] == "SUBMITTED"
    # submitting an already-submitted project is an invalid transition
    again = client.post("/api/acquisition/projects/PRJ-STATE/submit", headers=_h("pia"))
    assert again.status_code in (400, 422)


def test_project_approve_requires_approver_permission():
    _seed_project("PRJ-APPROVE", status="SUBMITTED")
    _set_project_status("PRJ-APPROVE", "SUBMITTED")
    scopes_mod.bind_project("PRJ-APPROVE", "u-pia")
    denied = client.post("/api/acquisition/projects/PRJ-APPROVE/approve", headers=_h("pia"))
    assert denied.status_code == 403, denied.text
    allowed = client.post("/api/acquisition/projects/PRJ-APPROVE/approve", headers=_h("approver"))
    assert allowed.status_code in (200, 403, 404)


# --- freeze / unfreeze ----------------------------------------------------

def test_freeze_requires_existing_in_scope_record_and_justification():
    record_id = "LR-FREEZE-1"
    _seed_record(record_id)
    scopes_mod.seed_assignment(record_id, project_id="1", authority=["u-approver"])

    # unknown record -> 404, never a fabricated freeze
    unknown = client.post("/api/acquisition/records/LR-NOT-REAL/freeze",
                          json={"text": "court order"}, headers=_h("approver"))
    assert unknown.status_code == 404

    # in-scope record without justification -> 400
    no_reason = client.post(f"/api/acquisition/records/{record_id}/freeze",
                            json={"text": ""}, headers=_h("approver"))
    assert no_reason.status_code == 400
    assert no_reason.json()["error"]["code"] == "JUSTIFICATION_REQUIRED"

    ok = client.post(f"/api/acquisition/records/{record_id}/freeze",
                     json={"text": "Sub-judice per HC order"}, headers=_h("approver"))
    assert ok.status_code == 200 and ok.json()["frozen"] is True


def test_frozen_record_rejects_field_update():
    record_id = "LR-FROZEN-UPDATE"
    _seed_record(record_id, status="EXTRACTED")
    scopes_mod.seed_assignment(record_id, project_id="1", authority=["u-approver"])
    frozen = client.post(f"/api/acquisition/records/{record_id}/freeze",
                         json={"text": "frozen for litigation"}, headers=_h("approver"))
    assert frozen.status_code == 200, frozen.text
    r = client.patch(f"/api/records/{record_id}", json={"status": "VERIFIED"},
                     headers=_h("validator"))
    assert r.status_code == 423, r.text
    assert r.json()["error"]["code"] == "RECORD_FROZEN"


def test_freeze_lookup_failure_denies_instead_of_reporting_unfrozen():
    """A freeze read error must deny the edit, never report 'not frozen'."""
    import app.api.api_v1.records_routes as rr
    import app.database.session as session_mod

    class _Broken:
        def query(self, *_a, **_k):
            raise RuntimeError("freeze store unavailable")

        def close(self):
            pass

    original = session_mod._SessionFactory
    session_mod._SessionFactory = _Broken
    try:
        with pytest.raises(HTTPException) as exc:
            rr._is_frozen("LR-ANY")
        assert exc.value.status_code == 503
        assert exc.value.detail["code"] == "FREEZE_STATE_UNAVAILABLE"
    finally:
        session_mod._SessionFactory = original


def test_record_read_is_scope_gated():
    record_id = "LR-SCOPE-GATE"
    _seed_record(record_id)
    scopes_mod.seed_assignment(record_id, project_id="1")
    assert client.get(f"/api/records/{record_id}", headers=_h("pia")).status_code == 200
    # citizen without ownership scope must not read it
    assert client.get(f"/api/records/{record_id}", headers=_h("citizen")).status_code == 404
    # a non-project-scoped officer on another project must not read it
    other = {"id": "u-field-x", "username": "field", "role": "field_officer",
             "project_ids": ["77"], "scopes": []}
    with pytest.raises(HTTPException) as exc:
        ScopeService.check(other, record_id=record_id)
    assert exc.value.status_code == 404


def test_document_endpoints_require_permission_and_scope():
    r = client.get("/api/documents/DOC-ANY", headers=_h("citizen"))
    assert r.status_code in (403, 404)
    r2 = client.delete("/api/documents/DOC-ANY", headers=_h("pia"))
    assert r2.status_code == 403, r2.text


# --- admin surface --------------------------------------------------------

def _delete_user(user_id: str) -> None:
    from app.database.models.user import User

    db = _SessionFactory()
    try:
        row = db.get(User, user_id)
        if row is not None:
            db.delete(row)
            db.commit()
    finally:
        db.close()


def test_admin_user_lifecycle_is_admin_only():
    # unique username so the test is repeatable against a persistent test DB
    body = {"username": f"probe-validator-{uuid4().hex[:8]}",
            "password": "S3cure-Validator-Pass", "role": "LAO"}
    denied = client.post("/api/admin/users", json=body, headers=_h("validator"))
    assert denied.status_code == 403
    created = client.post("/api/admin/users", json=body, headers=_h("admin"))
    assert created.status_code == 200, created.text
    try:
        uid = created.json()["id"]
        assert created.json()["role"] == "desk_validator", "role alias must normalise"
        upd = client.patch(f"/api/admin/users/{uid}", json={"is_active": False},
                           headers=_h("admin"))
        assert upd.status_code == 200 and upd.json()["is_active"] is False
    finally:
        _delete_user(created.json()["id"])


def test_admin_rejects_invalid_role_and_duplicate_user():
    bad = client.post("/api/admin/users",
                      json={"username": "u-bad-role", "password": "S3cure-Passw0rd",
                            "role": "not_a_role"}, headers=_h("admin"))
    assert bad.status_code == 400 and bad.json()["error"]["code"] == "INVALID_ROLE"
    # "validator" is a dev username, NOT a role: the canonical name is
    # desk_validator, so this must be rejected rather than silently accepted.
    wrong = client.post("/api/admin/users",
                        json={"username": "u-wrong-role", "password": "S3cure-Passw0rd",
                              "role": "validator"}, headers=_h("admin"))
    assert wrong.status_code == 400 and wrong.json()["error"]["code"] == "INVALID_ROLE"
    body = {"username": f"probe-dup-{uuid4().hex[:8]}", "password": "S3cure-Validator-Pass",
            "role": "desk_validator"}
    first = client.post("/api/admin/users", json=body, headers=_h("admin"))
    assert first.status_code == 200, first.text
    try:
        dup = client.post("/api/admin/users", json=body, headers=_h("admin"))
        assert dup.status_code == 409, dup.text
        assert dup.json()["error"]["code"] == "USER_EXISTS"
    finally:
        _delete_user(first.json()["id"])


def _seed_user(user_id: str, username: str, role: str) -> None:
    from app.core.security import hash_password
    from app.database.models.user import User

    db = _SessionFactory()
    try:
        if db.get(User, user_id) is None:
            db.add(User(id=user_id, username=username, role=role,
                        password_hash=hash_password("S3cure-Admin-Pass"), is_active=True))
            db.commit()
    finally:
        db.close()


def test_admin_cannot_disable_own_account():
    me = client.get("/api/auth/me", headers=_h("admin")).json()
    _seed_user(me["id"], "admin", "system_admin")
    r = client.post(f"/api/admin/users/{me['id']}/disable", headers=_h("admin"))
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "SELF_DISABLE_DENIED"


def test_admin_config_is_permission_gated():
    assert client.get("/api/admin/system/config", headers=_h("executive")).status_code == 403
    r = client.get("/api/admin/system/config", headers=_h("admin"))
    assert r.status_code == 200 and "debug" in r.json()


# --- workflow assignment --------------------------------------------------

# --- acquisition lifecycle authority --------------------------------------

def test_acquisition_flow_is_the_single_transition_authority():
    from app.workflow import acquisition_flow as flow

    assert flow.can_transition("project", "DRAFT", "SUBMITTED", role="pia").ok
    assert not flow.can_transition("project", "DRAFT", "APPROVED", role="pia").ok
    assert not flow.can_transition("project", "COMPLETED", "DRAFT", role="system_admin").ok
    # unknown entity / unknown source must never be permissive
    assert not flow.can_transition("bogus", "DRAFT", "SUBMITTED", role="pia").ok
    assert not flow.can_transition("project", "NOT_A_STATE", "SUBMITTED", role="pia").ok
    # only an approver may approve
    assert not flow.can_transition("project", "PENDING_APPROVAL", "APPROVED", role="pia").ok
    assert flow.can_transition("project", "PENDING_APPROVAL", "APPROVED", role="approver").ok
    # terminal states are terminal - the admin bypass waives the *role*
    # requirement, never the legality of the edge itself
    assert not flow.can_transition("project", "REJECTED", "DRAFT", role="approver").ok
    assert not flow.can_transition("project", "REJECTED", "DRAFT", role="system_admin").ok
    # ...but admin may act from any non-terminal state
    assert flow.can_transition("project", "DRAFT", "SUBMITTED", role="system_admin").ok
    with pytest.raises(ValueError):
        flow.validate_transition("project", "DRAFT", "APPROVED", role="pia")


def test_project_approve_enforces_approver_role_over_the_authority():
    _seed_project("PRJ-ROLE", status="PENDING_APPROVAL")
    _set_project_status("PRJ-ROLE", "PENDING_APPROVAL")
    scopes_mod.bind_project("PRJ-ROLE", "u-pia")
    scopes_mod.bind_project("PRJ-ROLE", "u-approver")
    denied = client.post("/api/acquisition/projects/PRJ-ROLE/approve", headers=_h("pia"))
    assert denied.status_code == 403, denied.text
    assert denied.json()["error"]["code"] == "PERMISSION_DENIED"
    allowed = client.post("/api/acquisition/projects/PRJ-ROLE/approve", headers=_h("approver"))
    assert allowed.status_code == 200, allowed.text
    assert allowed.json()["status"] == "APPROVED"


def test_project_approve_on_wrong_state_is_invalid_transition():
    _seed_project("PRJ-WRONGSTATE", status="DRAFT")
    _set_project_status("PRJ-WRONGSTATE", "DRAFT")
    scopes_mod.bind_project("PRJ-WRONGSTATE", "u-pia")
    scopes_mod.bind_project("PRJ-WRONGSTATE", "u-approver")
    r = client.post("/api/acquisition/projects/PRJ-WRONGSTATE/approve", headers=_h("approver"))
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "INVALID_TRANSITION"


def test_workflow_assignment_is_role_gated():
    _seed_record("LR-ASSIGN-1")
    scopes_mod.seed_assignment("LR-ASSIGN-1", project_id="1")
    denied = client.post("/api/workflow/records/LR-ASSIGN-1/assign",
                         params={"assignee_id": "u-field"}, headers=_h("citizen"))
    assert denied.status_code in (403, 404)
    pia = client.post("/api/workflow/records/LR-ASSIGN-1/assign",
                      params={"assignee_id": "u-field"}, headers=_h("pia"))
    # PIA lacks WORKFLOW.ASSIGN in the canonical matrix -> 403
    assert pia.status_code == 403, pia.text
    lao = client.post("/api/workflow/records/LR-ASSIGN-1/assign",
                      params={"assignee_id": "u-field"}, headers=_h("validator"))
    assert lao.status_code == 200, lao.text
    assert lao.json()["assignee_id"] == "u-field"


def test_workflow_assignment_persists_and_grants_scope():
    """A successful assignment must be stored and actually widen access."""
    _seed_record("LR-ASSIGN-2")
    scopes_mod.seed_assignment("LR-ASSIGN-2", project_id="1")
    # field officer is not a member of the record's project and not an
    # assignee, so the record is out of scope.
    field = {"id": "u-field", "username": "field", "role": "field_officer",
             "project_ids": ["99"], "scopes": []}
    with pytest.raises(HTTPException) as before:
        ScopeService.check(field, record_id="LR-ASSIGN-2")
    assert before.value.status_code == 404

    r = client.post("/api/workflow/records/LR-ASSIGN-2/assign",
                    params={"assignee_id": "u-field"}, headers=_h("validator"))
    assert r.status_code == 200, r.text
    assert "u-field" in r.json()["assignees"]
    # persisted, not just echoed
    assert "u-field" in scopes_mod.assignment_for("LR-ASSIGN-2")["assignees"]
    # and the assignee can now read it through the real API
    assert client.get("/api/records/LR-ASSIGN-2", headers=_h("field")).status_code == 200


def test_workflow_assignment_rejects_unknown_principal():
    _seed_record("LR-ASSIGN-3")
    scopes_mod.seed_assignment("LR-ASSIGN-3", project_id="1")
    r = client.post("/api/workflow/records/LR-ASSIGN-3/assign",
                    params={"assignee_id": "u-ghost-user"}, headers=_h("validator"))
    assert r.status_code == 404, r.text
    assert r.json()["error"]["code"] == "ASSIGNEE_NOT_FOUND"
    # nothing was persisted
    assert "u-ghost-user" not in (scopes_mod.assignment_for("LR-ASSIGN-3") or {}).get("assignees", [])


def test_workflow_assignment_grants_approver_freeze_authority():
    """An approver may only freeze records they are explicitly assigned to."""
    _seed_record("LR-ASSIGN-4")
    scopes_mod.seed_assignment("LR-ASSIGN-4", project_id="1")
    # u-approver is not yet listed -> denied
    blocked = client.post("/api/acquisition/records/LR-ASSIGN-4/freeze",
                          json={"text": "unauthorised freeze"}, headers=_h("approver"))
    assert blocked.status_code == 404, blocked.text

    assigned = client.post("/api/workflow/records/LR-ASSIGN-4/assign",
                           params={"assignee_id": "u-approver"}, headers=_h("validator"))
    assert assigned.status_code == 200, assigned.text
    assert "u-approver" in scopes_mod.assignment_for("LR-ASSIGN-4")["authority"]

    allowed = client.post("/api/acquisition/records/LR-ASSIGN-4/freeze",
                          json={"text": "assigned freeze"}, headers=_h("approver"))
    assert allowed.status_code == 200, allowed.text
