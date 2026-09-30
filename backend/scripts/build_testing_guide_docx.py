"""Build docs/RBAC_TESTING_GUIDE.docx from a curated structure.

Kept deliberately close to build_rbac_report_docx.py so both documents share
one visual language. Run:  python scripts/build_testing_guide_docx.py
"""
from __future__ import annotations

import pathlib

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, RGBColor, Inches

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "docs" / "RBAC_TESTING_GUIDE.docx"

MONO = "Consolas"
ACCENT = RGBColor(0x1F, 0x4E, 0x79)
RED = RGBColor(0xB0, 0x1C, 0x1C)
GREY = RGBColor(0x59, 0x59, 0x59)


def style_doc(doc: Document) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    for name, size, color in (("Heading 1", 16, ACCENT), ("Heading 2", 13, ACCENT),
                              ("Heading 3", 11.5, ACCENT)):
        st = doc.styles[name]
        st.font.name = "Calibri"
        st.font.size = Pt(size)
        st.font.color.rgb = color
        st.font.bold = True


def h(doc: Document, text: str, level: int = 1) -> None:
    doc.add_heading(text, level=level)


def p(doc: Document, text: str = "", *, italic: bool = False,
      bold: bool = False, grey: bool = False) -> None:
    par = doc.add_paragraph()
    run = par.add_run(text)
    run.italic = italic
    run.bold = bold
    if grey:
        run.font.color.rgb = GREY
    par.paragraph_format.space_after = Pt(4)


def code(doc: Document, text: str) -> None:
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Inches(0.25)
    par.paragraph_format.space_after = Pt(6)
    for i, line in enumerate(text.strip("\n").split("\n")):
        run = par.add_run(("\n" if i else "") + line)
        run.font.name = MONO
        run.font.size = Pt(9)


def bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        doc.add_paragraph(item, style="List Bullet")


def table(doc: Document, headers: list[str], rows: list[list[str]]) -> None:
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Light Grid Accent 1"
    for i, head in enumerate(headers):
        cell = t.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(head)
        run.bold = True
        run.font.size = Pt(9.5)
    for row in rows:
        cells = t.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = ""
            run = cells[i].paragraphs[0].add_run(value)
            run.font.size = Pt(9)
    doc.add_paragraph()


def note(doc: Document, label: str, text: str, color: RGBColor = ACCENT) -> None:
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Inches(0.2)
    par.paragraph_format.space_before = Pt(4)
    head = par.add_run(f"{label} ")
    head.bold = True
    head.font.color.rgb = color
    body = par.add_run(text)
    body.font.size = Pt(10)
    doc.add_paragraph()


def build() -> None:
    doc = Document()
    style_doc(doc)

    # ---- title ----------------------------------------------------------
    title = doc.add_heading("ZameenAI - How to Test the RBAC Module", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p(doc, "All 7 roles, both authentication flows, and every authorization boundary.",
      italic=True, grey=True)
    p(doc, "Verified against the running application on 2026-09-30.", grey=True)

    table(doc, ["Gate", "Result"], [
        ["Live probe, all 7 roles (scripts/probe_roles.py)", "77 / 77 pass"],
        ["Static contract checks (scripts/verify_rbac.py)", "42 / 42 pass"],
        ["Backend / frontend permission parity", "87 / 87, zero drift"],
        ["Security regression tests", "56 / 56 pass"],
        ["Full backend suite", "723 passed, 46 skipped, 4 pre-existing env failures"],
    ])

    # ---- 1. fastest way -------------------------------------------------
    h(doc, "1. The fastest way to test", 1)
    p(doc, "Everything below is reproducible from these four commands. Start here.")
    code(doc, """
cd D:\\ZameenAI\\backend

python scripts\\probe_roles.py        # live end-to-end probe of all 7 roles
python scripts\\verify_rbac.py        # static checks, no server needed
python scripts\\permission_drift.py   # backend vs frontend permissions
python scripts\\show_matrix.py        # print the live role x permission matrix
python scripts\\list_routes.py        # print every route and method
""")
    note(doc, "CI-READY:",
         "probe_roles.py exits non-zero if any expectation breaks, so it can gate a "
         "pipeline today without modification.")

    # ---- 2. identities --------------------------------------------------
    h(doc, "2. The 7 roles and their test identities", 1)
    p(doc, "Six identities share one password. The citizen authenticates by OTP.")
    table(doc, ["Username", "Role (canonical)", "User id", "Project scope", "Auth"], [
        ["admin", "system_admin", "u-admin", "none - global", "password"],
        ["pia", "pia", "u-pia", "project 1", "password"],
        ["field", "field_officer", "u-field", "project 1", "password"],
        ["validator", "desk_validator", "u-validator", "project 1", "password"],
        ["approver", "approver", "u-approver", "project 1", "password"],
        ["executive", "executive", "u-executive", "none - read-only", "password"],
        ["citizen", "citizen", "u-citizen", "own record", "OTP"],
    ])
    note(doc, "COMMON TRAP:",
         "'validator' is a USERNAME, not a role. The role is desk_validator. This "
         "trips up anyone grepping the codebase for \"validator\".", RED)

    h(doc, "2.1 Permission footprint", 2)
    table(doc, ["Role", "Total", "Write", "Read", "Note"], [
        ["system_admin", "*", "all", "all", "wildcard, bypasses scope"],
        ["pia", "28", "11", "17", "creates and submits, never approves"],
        ["field_officer", "16", "5", "11", "narrowest government role"],
        ["desk_validator", "31", "9", "22", "assigns records, updates extractions"],
        ["approver", "43", "21", "22", "the only role that can freeze or approve"],
        ["executive", "23", "0", "23", "strictly read-only"],
        ["citizen", "14", "2", "12", "only GRIEVANCE.CREATE, OBJECTION.CREATE"],
    ])

    # ---- 3. boot --------------------------------------------------------
    h(doc, "3. Boot the stack", 1)
    code(doc, """
# Backend - http://127.0.0.1:8000
cd D:\\ZameenAI\\backend
$env:DEV_USERS_PASSWORD = "your-dev-password"
python -m uvicorn app.main:app --reload

# Frontend - http://127.0.0.1:5173   (separate terminal)
cd D:\\ZameenAI\\frontend
npm run dev
""")
    note(doc, "IMPORTANT:",
         "If DEV_USERS_PASSWORD is unset the backend generates an EPHEMERAL password at "
         "boot and prints it. Tokens from a previous process then fail with 401. Pin the "
         "value for stable testing.", RED)

    # ---- 4. log in ------------------------------------------------------
    h(doc, "4. Log in as each role", 1)
    p(doc, "The token response contains no user object. Take the role from /api/auth/me.")
    code(doc, """
curl.exe -X POST http://127.0.0.1:8000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"approver","password":"your-dev-password"}'

curl.exe http://127.0.0.1:8000/api/auth/me -H "Authorization: Bearer $TOKEN"
""")
    p(doc, "Citizen - two-call OTP flow, no password:", bold=True)
    code(doc, """
curl.exe -X POST http://127.0.0.1:8000/api/auth/citizen/request-otp \\
  -H "Content-Type: application/json" -d '{"username":"citizen"}'

curl.exe -X POST http://127.0.0.1:8000/api/auth/citizen/verify-otp \\
  -H "Content-Type: application/json" -d '{"username":"citizen","otp":"123456"}'
""")
    p(doc, "A wrong OTP returns 401.", italic=True)

    # ---- 5. per role ----------------------------------------------------
    doc.add_page_break()
    h(doc, "5. Per-role test procedures", 1)
    p(doc, "Each block lists the calls that MUST return the stated status. Anything "
           "else is a bug.")

    h(doc, "5.1 system_admin - full control, bypasses scope", 2)
    code(doc, """
GET  /api/admin/users            -> 200
GET  /api/admin/roles            -> 200
GET  /api/admin/permissions      -> 200
GET  /api/admin/system/config    -> 200
GET  /api/admin/audit            -> 200
GET  /api/workflow/audit         -> 200
GET  /api/records/{any_id}       -> 200   (not assigned, outside its project)
""")
    note(doc, "KEY BEHAVIOUR:",
         "Admin is the only role that skips project scope. It reads a record it is not "
         "assigned to. Every other role is constrained.")

    h(doc, "5.2 executive - read-only, and NOT an auditor", 2)
    p(doc, "Reads that must succeed:", bold=True)
    code(doc, """
GET  /api/acquisition/projects   -> 200
GET  /api/gis/parcels            -> 200
""")
    p(doc, "Every write that must be refused with 403:", bold=True)
    code(doc, """
POST  /api/acquisition/projects                    -> 403
POST  /api/acquisition/records/{id}/freeze         -> 403
POST  /api/workflow/records/{id}/assign            -> 403
PATCH /api/records/{id}                            -> 403
POST  /api/admin/users                             -> 403
GET   /api/admin/audit                             -> 403   (AUDIT.READ is admin-only)
GET   /api/admin/users                             -> 403
""")
    note(doc, "DO NOT GET THIS WRONG:",
         "Executive is read-only but is deliberately NOT an auditor. Seeing dashboards "
         "and reports does not grant the audit trail. AUDIT.READ belongs to "
         "system_admin alone.", RED)

    h(doc, "5.3 pia - creates and submits, never approves", 2)
    code(doc, """
POST  /api/acquisition/projects/{id}/submit        -> 200
POST  /api/acquisition/projects/{id}/approve       -> 403
POST  /api/acquisition/records/{id}/freeze         -> 403
POST  /api/workflow/records/{id}/assign            -> 403
GET   /api/admin/users                             -> 403
""")
    note(doc, "SEPARATION OF DUTIES:",
         "The 403 on /approve is the point. The agency that raises the case cannot sign "
         "it off.")

    h(doc, "5.4 field_officer - only records assigned to it", 2)
    p(doc, "This is the assignment-scope test, and the one most often broken.", italic=True)
    code(doc, """
GET  /api/records/{assigned}       -> 200
GET  /api/records/{not-assigned}   -> 404   (NOT 403)
GET  /api/gis/parcels              -> 200
POST  /api/acquisition/projects     -> 403
""")
    note(doc, "ASSERT 404, NOT 403:",
         "A 403 would confirm the record exists, leaking information to a user with no "
         "right to know it. Out-of-scope must be indistinguishable from absent.", RED)

    h(doc, "5.5 desk_validator - assignment and correction, no approval", 2)
    code(doc, """
POST  /api/workflow/records/{id}/assign?assignee_id=u-field   -> 200
POST  /api/workflow/records/{id}/assign?assignee_id=u-ghost  -> 404
                                                           ASSIGNEE_NOT_FOUND
PATCH /api/records/{id}   {"status":"VALIDATED"}             -> 200
POST  /api/acquisition/projects/{id}/approve                  -> 403
POST  /api/acquisition/records/{id}/freeze                    -> 403
""")
    note(doc, "ASSIGNEE VALIDATION:",
         "assignee_id=u-ghost returning 404 ASSIGNEE_NOT_FOUND proves the endpoint "
         "validates a real, active principal rather than storing an arbitrary string.")

    h(doc, "5.6 approver - the only role that can approve or freeze", 2)
    code(doc, """
POST  /api/acquisition/projects/{id}/approve        -> 200
POST  /api/acquisition/records/{id}/freeze          -> 200   (authority held)
POST  /api/acquisition/records/{id}/freeze          -> 404   (authority list EMPTY)
GET   /api/admin/audit                              -> 403   (not an admin)
""")
    p(doc, "Three rules to assert:", bold=True)
    bullets(doc, [
        "An EMPTY authority list grants nobody freeze rights. Freezing is a legal hold, "
        "so an unlisted approver is refused. It fails CLOSED.",
        "That refusal is 404, not 403, so it does not disclose that the record exists.",
        "A request body is mandatory. Omitting it returns 422 INVALID_INPUT - a client "
        "error, not an authorization decision. Order: validation, then permission, "
        "then scope.",
    ])

    h(doc, "5.7 citizen - OTP, and ownership-scoped reads", 2)
    code(doc, """
GET  /api/records/{not-owned}     -> 404
GET  /api/admin/users             -> 403
GET  /api/acquisition/projects    -> 200
""")
    note(doc, "LIMITS OF THIS TEST:",
         "The citizen's seeded scope names LR-2026-000002, which does not exist in a "
         "fresh dev database, so it also returns 404. That proves isolation but not "
         "access. To prove the positive path, create that record first and confirm 200.")

    # ---- 6. workflow ----------------------------------------------------
    doc.add_page_break()
    h(doc, "6. The cross-role workflow chain", 1)
    p(doc, "The strongest single RBAC test, because each state admits a different role. "
           "Walk it in order and watch the same endpoints change their answers.")
    code(doc, """
DRAFT --submit--> SUBMITTED --> UNDER_VERIFICATION --> VERIFIED
      (pia)        (validator)     (validator)

VERIFIED --> PENDING_APPROVAL --> APPROVED --> NOTIFICATION
          (validator)          (approver)    (approver)

NOTIFICATION --> COMPENSATION --> POSSESSION --> COMPLETED
              (approver)          (approver)    (approver)

REJECTED and COMPLETED are terminal.
""")
    h(doc, "6.1 The permission gate fires before the state gate", 2)
    table(doc, ["Project state", "Endpoint", "pia", "executive", "validator", "approver"], [
        ["DRAFT", "/submit", "200", "403", "403", "-"],
        ["SUBMITTED", "/submit", "403", "403", "403", "-"],
        ["PENDING_APPROVAL", "/approve", "403", "403", "403", "200"],
        ["APPROVED", "/approve", "-", "-", "-", "422 INVALID_TRANSITION"],
    ])
    note(doc, "WHY THE SECOND ROW MATTERS:",
         "The project is in a state where /submit is already invalid, yet a validator "
         "still receives 403 rather than 422. Authorization is evaluated first, so the "
         "API never reveals workflow internals to a role with no business in the "
         "workflow at all.", RED)

    # ---- 7. freeze ------------------------------------------------------
    h(doc, "7. The freeze lifecycle", 1)
    p(doc, "Freeze is the highest-consequence operation in the system, so it has its "
           "own rules.")
    table(doc, ["#", "Action", "Actor", "Expected"], [
        ["1", "freeze, authority held", "approver", "200"],
        ["2", "edit a frozen record", "validator (in scope)", "423 RECORD_FROZEN"],
        ["3", "freeze without authority", "approver (empty list)", "404"],
        ["4", "freeze with no body", "any", "422 INVALID_INPUT"],
        ["5", "freeze state unreadable", "any", "503 FREEZE_STATE_UNAVAILABLE"],
    ])
    note(doc, "STEP 2 IS THE TRAP:",
         "The editor HAS the permission and IS in scope, and is still refused - with "
         "423, not 403, because the blocker is record state, not identity. If step 2 "
         "returns 403 the role is missing LAND_RECORD.UPDATE and the test is proving "
         "the wrong thing. The approver itself cannot perform step 2: it holds "
         "LAND_RECORD.APPROVE / REJECT, not LAND_RECORD.UPDATE.")
    note(doc, "STEP 5 FAILS CLOSED:",
         "If the freeze state cannot be read, the write is refused rather than allowed "
         "on an unknown state.")

    # ---- 8. errors ------------------------------------------------------
    h(doc, "8. Error code reference", 1)
    table(doc, ["Status", "Code", "Meaning"], [
        ["401", "AUTHENTICATION_REQUIRED", "no token, expired, or bad credentials"],
        ["401", "-", "wrong OTP"],
        ["403", "PERMISSION_DENIED", "role lacks the required permission"],
        ["403", "SELF_DISABLE_DENIED", "admin tried to disable their own account"],
        ["404", "RESOURCE_NOT_FOUND", "or out of scope - deliberately identical"],
        ["404", "ASSIGNEE_NOT_FOUND", "assignment target is not a real principal"],
        ["400", "JUSTIFICATION_REQUIRED", "unfreeze without a reason"],
        ["422", "INVALID_INPUT", "request body failed validation"],
        ["422", "INVALID_TRANSITION", "edge is not in the lifecycle map"],
        ["422", "ROLE_NOT_ALLOWED", "role cannot enter that target state"],
        ["423", "RECORD_FROZEN", "edit refused; record under legal hold"],
        ["429", "RATE_LIMITED", "too many login attempts"],
        ["503", "FREEZE_STATE_UNAVAILABLE", "freeze state unreadable - write refused"],
        ["503", "DB_UNAVAILABLE", "dependency down"],
        ["500", "INTERNAL_ERROR", "unexpected failure"],
    ])
    p(doc, "All errors share one envelope:", bold=True)
    code(doc, """
{"error": {"code": "RECORD_FROZEN",
           "message": "Record is frozen; request unfreeze first",
           "status": 423, "request_id": "8dca0d10-..."}}
""")
    note(doc, "ASSERT ON code, NOT message:",
         "Messages are written for humans and may be reworded. The code is the contract.")

    # ---- 9. UI ----------------------------------------------------------
    h(doc, "9. Manual UI testing per role", 1)
    p(doc, "Log in at http://127.0.0.1:5173 and walk the role-specific home route.")
    table(doc, ["Role", "Lands on", "Verify"], [
        ["admin", "Admin dashboard", "user mgmt, roles, audit log, system config"],
        ["pia", "PIA workspace", "create + submit; NO Approve or Freeze button"],
        ["field", "Field mobile view", "only assigned records; no acquisition creation"],
        ["validator", "Validation desk", "review, assign, edit; no approval"],
        ["approver", "Approver console", "Approve / Reject / Freeze present"],
        ["executive", "Analytics dashboard", "all data visible, every action hidden"],
        ["citizen", "Citizen portal", "only own record, read-only"],
    ])
    p(doc, "Two UI-specific checks:", bold=True)
    bullets(doc, [
        "Navigation must follow the AUTHENTICATED role. Log in, then switch accounts - "
        "the landing route must change. A stale-context redirect that keeps the previous "
        "role's home is a bug.",
        "The permission mirror must stay in sync. permission_drift.py must report 0 "
        "missing and 0 invented. A MISSING entry hides buttons the user is entitled to "
        "use - the most common RBAC defect in the UI layer.",
    ])

    # ---- 10. suites -----------------------------------------------------
    h(doc, "10. Automated regression suites", 1)
    code(doc, """
cd D:\\ZameenAI\\backend

python scripts\\verify_rbac.py            # 42 static checks
python scripts\\probe_roles.py            # 77 live probes
python scripts\\permission_drift.py       # 87 vs 87

python -m pytest tests\\test_rbac_security.py \\
                 tests\\test_acquisition_authz.py \\
                 tests\\test_backend_integration.py -q      # 56 tests
""")
    table(doc, ["File", "Covers"], [
        ["scripts/probe_roles.py", "live matrix across all 7 roles - start here"],
        ["scripts/verify_rbac.py", "static contract checks, no server needed"],
        ["scripts/permission_drift.py", "backend vs frontend permission parity"],
        ["scripts/show_matrix.py", "prints the live matrix"],
        ["scripts/list_routes.py", "prints every route and method"],
        ["tests/test_rbac_security.py", "401/403 paths, citizen isolation, aliases"],
        ["tests/test_acquisition_authz.py", "scope, assignment, freeze, lifecycle"],
        ["tests/test_backend_integration.py", "cross-module integration"],
    ])
    p(doc, "Full suite: 723 passed, 46 skipped, plus 4 pre-existing environment "
           "failures unrelated to RBAC (missing google.genai TranslationConfig, an OCR "
           "fixture returning zero words, and an unavailable Surya/Docker dependency).",
      italic=True, grey=True)

    # ---- 11. gaps -------------------------------------------------------
    h(doc, "11. Known gaps", 1)
    gaps = [
        ("Citizen can authenticate with a password in dev. ",
         "citizen sits in DEV_USERS, so /api/auth/login accepts the shared dev password "
         "where the spec requires OTP only. Production is unaffected - there is no "
         "DEV_USERS outside development - but the seeded identity does not model the "
         "production flow. Fix: reject CITIZEN in authenticate_user and update the 25 "
         "test references using the _h(\"citizen\") helper to go through OTP."),
        ("Scope assignments are in memory. ",
         "seed_assignment / assign_record state lives in a process-level dict and resets "
         "on restart. This is the main production blocker: restart the API and every "
         "field officer's assignment scope disappears. Persist it and add a migration "
         "- no Alembic chain exists yet."),
        ("No frontend test runner. ",
         "UI permission behaviour is covered by tsc, the build, and permission_drift.py, "
         "not by executable UI tests. Roles cannot be regression-tested in a browser "
         "automatically yet."),
        ("Only part of the freeze lifecycle is probed live. ",
         "pia and field freeze denials are asserted, but the unfreeze path and the "
         "contested / sub-judice flow have no live probe."),
        ("Test fixtures are probe-owned. ",
         "probe_roles.py creates PRJ-* and LR-* rows in the dev database and does not "
         "clean up. Delete them for a pristine dataset."),
    ]
    for label, text in gaps:
        par = doc.add_paragraph(style="List Number")
        head = par.add_run(label)
        head.bold = True
        head.font.color.rgb = RED
        par.add_run(text)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(f"written: {OUT}")
    print(f"size   : {OUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
