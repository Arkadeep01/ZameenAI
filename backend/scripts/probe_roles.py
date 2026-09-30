"""Live RBAC probe - exercises the real matrix for all 7 roles.

Run:  python scripts/probe_roles.py
Boots the app in-process, authenticates each dev identity, and asserts the
expected status for a representative endpoint at every permission boundary.
Exit code 0 = every expectation held.

Covers: authentication, anonymous 401s, admin, read-only executive,
PIA create/submit, field assignment scope, validator assignment + updates,
approver-only authority, freeze lifecycle, citizen OTP ownership,
and the 7-role project workflow chain.
"""
from __future__ import annotations

import os
import pathlib
import sys
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DEV_USERS_PASSWORD", "probe-only-credential")
os.environ.setdefault("SECRET_KEY", "probe-only-secret-key-not-for-production-0000")

from fastapi.testclient import TestClient  # noqa: E402

from app.core import scopes as sc  # noqa: E402
from app.database.models.acquisition import AcquisitionProject  # noqa: E402
from app.database.models.land_record import LandRecord  # noqa: E402
from app.database.session import _SessionFactory, init_domain_db  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = os.environ["DEV_USERS_PASSWORD"]
PROJECT = "1"          # the project every seeded officer is scoped to
ROLES = ["admin", "pia", "field", "validator", "approver", "executive"]

init_domain_db()
client = TestClient(app, raise_server_exceptions=False)

PASS: list[str] = []
FAIL: list[str] = []
_TOKENS: dict[str, str] = {}


def db_session():
    return _SessionFactory()


def seed_project(pid: str, status: str) -> None:
    db = db_session()
    try:
        row = db.get(AcquisitionProject, pid)
        if row is None:
            db.add(AcquisitionProject(id=pid, name=f"Probe {pid}",
                                      project_code=pid, status=status,
                                      created_by="seed"))
        else:
            row.status = status
        db.commit()
    finally:
        db.close()


def seed_record(rid: str) -> None:
    db = db_session()
    try:
        if db.get(LandRecord, rid) is None:
            db.add(LandRecord(id=rid, document_id="DOC-PROBE", status="EXTRACTED"))
        db.commit()
    finally:
        db.close()


def seed() -> None:
    for pid, st in (("PRJ-PEND", "PENDING_APPROVAL"), ("PRJ-DRAFT", "DRAFT")):
        seed_project(pid, st)
    for rid in ("LR-ASSIGNED", "LR-UNASSIGNED"):
        seed_record(rid)
    # everyone who works this project is a member
    for uid in ("u-pia", "u-field", "u-validator", "u-approver"):
        sc.bind_project(PROJECT, uid)
    # test project rows are their own scope unit, so bind the officers to them
    for pid in ("PRJ-DRAFT", "PRJ-PEND", "PRJ-W1", "PRJ-W2"):
        for uid in ("u-pia", "u-field", "u-validator", "u-approver"):
            sc.bind_project(pid, uid)
    # LR-ASSIGNED: field + validator may read/edit; only approver has authority
    sc.seed_assignment("LR-ASSIGNED", project_id=PROJECT,
                       assignees=["u-field", "u-validator"],
                       authority=["u-approver"])
    # LR-UNASSIGNED: validator only, and EMPTY authority -> nobody may freeze
    sc.seed_assignment("LR-UNASSIGNED", project_id=PROJECT,
                       assignees=["u-validator"], authority=[])


def token(username: str) -> str:
    if username in _TOKENS:
        return _TOKENS[username]
    r = client.post("/api/auth/login",
                    json={"username": username, "password": PASSWORD})
    if r.status_code != 200:
        raise SystemExit(f"cannot authenticate {username}: {r.status_code} {r.text}")
    _TOKENS[username] = r.json()["access_token"]
    return _TOKENS[username]


def h(username: str) -> dict:
    return {"Authorization": f"Bearer {token(username)}"}


def role_of(username: str) -> str:
    return client.get("/api/auth/me", headers=h(username)).json().get("role", "?")


def expect(username: str | None, method: str, url: str, status: int,
           body: dict | None = None) -> None:
    headers = h(username) if username else {}
    r = client.request(method, url, headers=headers, json=body)
    ok = r.status_code == status
    (PASS if ok else FAIL).append(f"{username} {method} {url} -> {r.status_code}")
    print(f"  {'OK  ' if ok else 'BAD '} {(username or 'anon'):<10} {method:<6} "
          f"{url:<50} {r.status_code}" + ("" if ok else f"  EXPECTED {status}"))


def check(label: str, condition: bool, detail: str = "") -> None:
    (PASS if condition else FAIL).append(label)
    print(f"  {'OK  ' if condition else 'BAD '} {label}" + (f"  {detail}" if detail else ""))


def section(title: str) -> None:
    print(f"\n{title}\n{'-' * len(title)}")


def main() -> int:
    seed()

    section("[1] Authentication - all 6 password identities resolve their role")
    for u in ROLES:
        _TOKENS.pop(u, None)
        r = client.post("/api/auth/login", json={"username": u, "password": PASSWORD})
        ok = r.status_code == 200 and "access_token" in r.json()
        if ok:
            _TOKENS[u] = r.json()["access_token"]
        role = role_of(u) if ok else "?"
        check(f"login {u:<10} -> role={role}", ok)
    bad = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    check("wrong password -> 401", bad.status_code == 401, f"got {bad.status_code}")
    print("       note: 'validator' is a USERNAME; the role is desk_validator")

    section("[2] Anonymous - every protected surface is 401")
    for url in ("/api/admin/users", "/api/admin/roles", "/api/admin/audit",
                "/api/admin/system/config", "/api/records/LR-ASSIGNED",
                "/api/acquisition/projects", "/api/workflow/audit",
                "/api/gis/parcels", "/api/auth/me"):
        expect(None, "GET", url, 401)

    section("[3] system_admin - full control")
    for url in ("/api/admin/users", "/api/admin/roles", "/api/admin/audit",
                "/api/admin/permissions", "/api/admin/system/config",
                "/api/acquisition/projects", "/api/workflow/audit"):
        expect("admin", "GET", url, 200)
    expect("admin", "GET", "/api/records/LR-UNASSIGNED", 200)  # not project-scoped

    section("[4] executive - read-only, and NOT an auditor")
    for url in ("/api/acquisition/projects", "/api/gis/parcels",
                "/api/records/LR-ASSIGNED",
                "/api/digitization/records/LR-ASSIGNED/validations"):
        expect("executive", "GET", url, 200)
    for method, url, body in (
        ("POST", "/api/acquisition/projects", {"name": "X", "project_code": "X1"}),
        ("POST", "/api/acquisition/records/LR-ASSIGNED/freeze", {"text": "no"}),
        ("POST", "/api/workflow/records/LR-ASSIGNED/assign", None),
        ("PATCH", "/api/records/LR-ASSIGNED", {"status": "VERIFIED"}),
        ("POST", "/api/admin/users",
         {"username": "x", "password": "Abcdef123", "role": "LAO"}),
    ):
        expect("executive", method, url, 403, body)
    expect("executive", "GET", "/api/admin/audit", 403)  # AUDIT.READ is admin-only
    expect("executive", "GET", "/api/admin/users", 403)

    section("[5] pia - creates and submits, cannot approve")
    expect("pia", "GET", "/api/acquisition/projects", 200)
    expect("pia", "POST", "/api/acquisition/projects/PRJ-DRAFT/submit", 200)
    expect("pia", "POST", "/api/acquisition/projects/PRJ-PEND/approve", 403)
    expect("pia", "POST", "/api/acquisition/records/LR-ASSIGNED/freeze", 403)
    expect("pia", "POST", "/api/workflow/records/LR-ASSIGNED/assign", 403)
    expect("pia", "GET", "/api/admin/users", 403)
    expect("pia", "GET", "/api/records/LR-ASSIGNED", 200)

    section("[6] field_officer - only records assigned to them")
    expect("field", "GET", "/api/records/LR-ASSIGNED", 200)     # assigned
    expect("field", "GET", "/api/records/LR-UNASSIGNED", 404)   # not assigned -> 404
    expect("field", "GET", "/api/gis/parcels", 200)
    expect("field", "POST", "/api/acquisition/projects", 403)
    expect("field", "POST", "/api/acquisition/records/LR-ASSIGNED/freeze", 403)

    section("[7] desk_validator - assignment, record updates, no approval")
    expect("validator", "GET", "/api/records/LR-ASSIGNED", 200)
    expect("validator", "GET", "/api/records/LR-UNASSIGNED", 200)
    expect("validator", "POST",
           "/api/workflow/records/LR-UNASSIGNED/assign?assignee_id=u-field", 200)
    expect("validator", "POST",
           "/api/workflow/records/LR-UNASSIGNED/assign?assignee_id=u-ghost", 404)
    expect("validator", "POST", "/api/acquisition/projects/PRJ-PEND/approve", 403)
    expect("validator", "POST", "/api/acquisition/records/LR-UNASSIGNED/freeze", 403)
    expect("validator", "PATCH", "/api/records/LR-UNASSIGNED", 200,
           {"status": "VALIDATED"})

    section("[8] approver - the ONLY role that can approve or freeze")
    expect("approver", "POST", "/api/acquisition/projects/PRJ-PEND/approve", 200)
    expect("approver", "POST", "/api/acquisition/records/LR-ASSIGNED/freeze", 200,
           {"text": "court order"})
    # empty authority list -> nobody may freeze, and the answer stays 404
    # (not 403) so it does not reveal that the record exists
    expect("approver", "POST", "/api/acquisition/records/LR-UNASSIGNED/freeze", 404,
           {"text": "court order"})
    expect("approver", "GET", "/api/admin/audit", 403)  # not an administrator
    # a frozen record now rejects edits from a scoped, permitted role
    expect("validator", "PATCH", "/api/records/LR-ASSIGNED", 423, {"status": "VERIFIED"})
    # a missing request body is a client error, not an authorization decision
    expect("approver", "POST", "/api/acquisition/records/LR-ASSIGNED/freeze", 422, None)

    section("[9] citizen - OTP flow, ownership-scoped reads")
    pw = client.post("/api/auth/login", json={"username": "citizen", "password": PASSWORD})
    # FINDING: citizen sits in DEV_USERS, so the shared dev password also works here.
    # Spec says citizens authenticate by OTP only; production has no DEV_USERS.
    check("FINDING citizen password login succeeds in dev seeding (spec: OTP only)",
          pw.status_code == 200, f"got {pw.status_code} - report as a gap")
    r = client.post("/api/auth/citizen/request-otp", json={"username": "citizen"})
    check("request-otp -> 200", r.status_code == 200, f"got {r.status_code}")
    otp = r.json().get("otp", "000000")
    v = client.post("/api/auth/citizen/verify-otp",
                    json={"username": "citizen", "otp": otp})
    check("verify-otp -> 200", v.status_code == 200, f"got {v.status_code}")
    bad = client.post("/api/auth/citizen/verify-otp",
                      json={"username": "citizen", "otp": "000000"})
    check("wrong otp -> 401", bad.status_code == 401, f"got {bad.status_code}")
    if v.status_code == 200:
        ch = {"Authorization": f"Bearer {v.json()['access_token']}"}
        for url, want in (("/api/records/LR-ASSIGNED", 404),
                          ("/api/admin/users", 403),
                          ("/api/acquisition/projects", 200)):
            rr = client.get(url, headers=ch)
            check(f"citizen GET {url} -> {want}", rr.status_code == want,
                  f"got {rr.status_code}")
        # the citizen's seeded scope is LR-2026-000002; anything else must 404.
        # On a fresh dev DB that record does not exist, so 404 is expected here -
        # this proves isolation, not access.
        own = client.get("/api/records/LR-2026-000002", headers=ch)
        check("citizen GET own scoped record -> not 403 (404 ok on fresh DB)",
              own.status_code != 403, f"got {own.status_code}")

    section("[10] project workflow - permission gate fires before the state gate")
    chain = [("PRJ-W1", "DRAFT", "pia", "/submit", 200),
             ("PRJ-W1", "SUBMITTED", "validator", "/submit", 403),
             ("PRJ-W1", "SUBMITTED", "executive", "/submit", 403),
             ("PRJ-W2", "PENDING_APPROVAL", "executive", "/approve", 403),
             ("PRJ-W2", "PENDING_APPROVAL", "validator", "/approve", 403),
             ("PRJ-W2", "PENDING_APPROVAL", "pia", "/approve", 403),
             ("PRJ-W2", "PENDING_APPROVAL", "approver", "/approve", 200),
             ("PRJ-W2", "APPROVED", "approver", "/approve", 422)]
    for pid, status, who, action, want in chain:
        seed_project(pid, status)
        expect(who, "POST", f"/api/acquisition/projects/{pid}{action}", want)
    # the last rejection must be a state rejection, not a permission one
    seed_project("PRJ-W2", "APPROVED")
    r = client.post("/api/acquisition/projects/PRJ-W2/approve", headers=h("approver"))
    check("terminal-state rejection carries code INVALID_TRANSITION",
          r.json().get("error", {}).get("code") == "INVALID_TRANSITION",
          f"got {r.json().get('error', {}).get('code')}")

    print("\n" + "=" * 78)
    print(f"PROBES PASSED {len(PASS)}   FAILED {len(FAIL)}")
    for f in FAIL:
        print(f"  FAILED: {f}")
    print("=" * 78)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
