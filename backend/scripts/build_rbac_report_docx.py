"""Generate the RBAC / Security audit + testing report as a .docx file.

Run:  python scripts/build_rbac_report_docx.py
Out:  docs/RBAC_AUDIT_AND_TESTING_REPORT.docx
"""
from __future__ import annotations

import pathlib

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "docs" / "RBAC_AUDIT_AND_TESTING_REPORT.docx"

INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x55, 0x55, 0x55)
ACCENT = RGBColor(0x0B, 0x4F, 0x6C)
GOOD = RGBColor(0x14, 0x6C, 0x43)
BAD = RGBColor(0xA3, 0x1D, 0x1D)


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = ACCENT
    return h


def para(doc, text="", *, bold=False, italic=False, size=10.5, color=INK,
         space_after=6, style=None):
    p = doc.add_paragraph(style=style)
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.color.rgb = color
    p.paragraph_format.space_after = Pt(space_after)
    return p


def bullet(doc, text, *, level=0, bold_prefix=None):
    style = "List Bullet" if level == 0 else "List Bullet 2"
    p = doc.add_paragraph(style=style)
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(10.5)
    r = p.add_run(text)
    r.font.size = Pt(10.5)
    p.paragraph_format.space_after = Pt(2)
    return p


def numbered(doc, text, *, bold_prefix=None):
    p = doc.add_paragraph(style="List Number")
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(10.5)
    r = p.add_run(text)
    r.font.size = Pt(10.5)
    p.paragraph_format.space_after = Pt(2)
    return p


def code(doc, text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.left_indent = Inches(0.25)
    return p


def table(doc, headers, rows, widths=None, mono_cols=()):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, text in enumerate(headers):
        hdr[i].text = ""
        run = hdr[i].paragraphs[0].add_run(text)
        run.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = ACCENT
    for row in rows:
        cells = t.add_row().cells
        for i, text in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            run = p.add_run(str(text))
            run.font.size = Pt(8.5 if i in mono_cols else 9.5)
            if i in mono_cols:
                run.font.name = "Consolas"
            if str(text).strip().lower() in {"pass", "passed", "exit 0", "0 failed"}:
                run.font.color.rgb = GOOD
            elif str(text).strip().lower().startswith(("fail", "4 failed", "exit 1")):
                run.font.color.rgb = BAD
    if widths:
        for r in t.rows:
            for i, w in enumerate(widths):
                r.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return t


# --------------------------------------------------------------------------
# document
# --------------------------------------------------------------------------

def build() -> pathlib.Path:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)

    title = doc.add_heading("ZameenAI - RBAC & Security Audit Report", level=0)
    for run in title.runs:
        run.font.color.rgb = ACCENT
    para(doc, "National Land Acquisition & Land Records Management System",
         size=11, color=MUTED, space_after=2)
    para(doc, "Scope: authentication, role-based access control, object-level "
              "scope, workflow authority, audit trail, and frontend/backend "
              "permission parity.",
         size=9.5, color=MUTED, space_after=10)

    # ---- status banner -------------------------------------------------
    table(doc,
          ["Verification gate", "Result"],
          [
              ["Static verification harness (42 checks)", "PASS - 0 failed"],
              ["RBAC / acquisition / integration tests", "56 passed"],
              ["Full backend suite", "723 passed, 46 skipped, 4 failed (pre-existing env)"],
              ["Frontend typecheck (tsc --noEmit)", "PASS - exit 0"],
              ["Frontend production build", "PASS - exit 0"],
              ["Permission parity (backend vs UI)", "87 / 87 - zero drift"],
              ["Route registration", "102 paths / 98 OpenAPI paths"],
              ["Secret leakage", "None - .env untracked and gitignored"],
          ],
          widths=[3.6, 2.9])

    # =====================================================================
    heading(doc, "1. What was completed", 1)

    heading(doc, "1.1 Canonical authorization core", 2)
    table(doc,
          ["Area", "Change"],
          [
              ["Role registry",
               "Single source of truth for the 7 canonical roles. LAO is never a "
               "runtime role. Aliases LAO / CALA / DM / FIELD / EXEC / "
               "SYSTEM_ADMIN are normalized onto the canonical seven."],
              ["Permission registry",
               "MODULE.ACTION matrix. system_admin holds '*'. executive holds "
               "zero write permissions."],
              ["Dependencies",
               "Single get_current_user / require_permission / require_role "
               "chain replacing per-route ad-hoc checks."],
              ["Error contract",
               "Structured envelope: 401 unauthenticated, 403 capability denied, "
               "404 enumeration-safe scope denial."],
          ],
          widths=[1.5, 5.0])

    heading(doc, "1.2 Object-level scope (app/core/scopes.py)", 2)
    bullet(doc, "Project membership + record assignment for pia, field_officer, "
                "desk_validator and approver.")
    bullet(doc, "Ownership scope for citizen; read-only global scope for executive.")
    bullet(doc, "Canonical module-level import in deps.py (previously a "
                "circular-import hazard).")
    bullet(doc, "Fail-closed: an unassigned record is readable by nobody in a "
                "project-scoped role.")

    heading(doc, "1.3 Fail-closed hardening", 2)
    para(doc, "This was the most significant category of work. Each row is a "
              "defect that previously allowed a security-relevant failure to "
              "pass silently.", italic=True, color=MUTED, space_after=8)
    table(doc,
          ["Defect found", "Fix applied"],
          [
              ["DEBUG defaulted to True - a deployment forgetting DEBUG=false "
               "booted with the development identity store enabled.",
               "Default flipped to False (fail closed)."],
              ["_resolve_secret_key() generated a random key in production, "
               "masking a missing SECRET_KEY from the boot-time check.",
               "Returns empty in production so the process refuses to boot."],
              ["A django-insecure- placeholder key was accepted as valid.",
               "Rejected by prefix, along with 'change-me' and 'secret'."],
              ["_dev_password() was called once per user, producing 7 different "
               "unknown passwords - no seeded identity could be used.",
               "One password generated per process and logged once."],
              ["_is_frozen() returned False on a database error, so a sub-judice "
               "or litigation-hold record could be edited.",
               "Raises 503 FREEZE_STATE_UNAVAILABLE; the write is denied."],
              ["Approver authority used 'if authority and ...', so an EMPTY "
               "authority list let any approver in the project freeze any record.",
               "Now 'if role == APPROVER and user.id not in authority' - an "
               "approver must be explicitly assigned."],
              ["Job ownership was bound after the pipeline ran, leaving "
               "processed-but-ownerless records behind.",
               "Ownership is bound inside start_job, before the pipeline runs."],
              ["POST .../assign returned SUCCESS while persisting nothing and "
               "accepting any arbitrary assignee_id.",
               "Validates a real active principal, persists the assignment, and "
               "auto-grants approver authority."],
          ],
          widths=[3.1, 3.4])

    heading(doc, "1.4 Workflow authority", 2)
    bullet(doc, "app/workflow/acquisition_flow.py is now the single acquisition "
                "lifecycle authority (project, objection and compensation "
                "lifecycles, plus the minimum role allowed for each target state).")
    bullet(doc, "The competing inline _ALLOWED transition map was removed from "
                "acquisition_routes.py.")
    bullet(doc, "system_admin waives the role requirement but never the legality "
                "of a lifecycle edge; terminal states are terminal for everyone.")
    bullet(doc, "The digitization record workflow remains in "
                "app/workflow/state_machine.py - the two lifecycles stay "
                "separate and non-overlapping.")

    heading(doc, "1.5 Audit trail", 2)
    bullet(doc, "All route-local 'except: pass' blocks were replaced with "
                "report_audit_failure(), which emits an error log for alerting.")
    bullet(doc, "AuditService.log() reports its own persistence failures.")
    bullet(doc, "Sensitive mutations additionally require a justification string.")
    bullet(doc, "Verified statically: zero silent excepts remain anywhere under "
                "app/api.")

    heading(doc, "1.6 Frontend", 2)
    bullet(doc, "@types/leaflet was declared in package.json but never "
                "installed, producing 11 phantom type errors. Installed; "
                "tsc --noEmit is now clean.")
    bullet(doc, "Removed stale 'tsr' npm scripts - the Vite tanstackRouter "
                "plugin generates the route tree at build time.")
    bullet(doc, "Post-login navigation defect: handleAuthSuccess read "
                "useAuth().user, which is still null in the same tick as "
                "setUser(), so every authenticated user landed on "
                "/desk-validator. The authenticated role is now threaded "
                "through the callback via a type-safe roleHome() accessor.")
    bullet(doc, "PermissionGuard applied to uploads; citizen routes guarded at "
                "the parent route level.")
    bullet(doc, "Removed a full-page window.location.assign() reload in favour "
                "of SPA navigation.")

    # =====================================================================
    heading(doc, "2. Defects found during final verification", 1)
    para(doc, "These were found by the verification harness itself, after the "
              "implementation work was complete, and are documented separately "
              "because two of them invalidate earlier claims.",
         italic=True, color=MUTED, space_after=8)
    table(doc,
          ["#", "Defect", "Impact", "Fix"],
          [
              ["1", "Two silent 'except Exception: pass' blocks remained in "
                    "gis/routes.py and digitization/routes.py, swallowing audit "
                    "failures.",
               "The earlier claim that all audit paths report was incorrect.",
               "Both now call report_audit_failure(). A static check in the "
               "harness proves it."],
              ["2", "23 canonical permissions were missing from the frontend "
                    "mirror (VALIDATION.REVIEW, RECORD.FREEZE, FIELD.VERIFY, "
                    "OBJECTION.*, NOTICE.*, POSSESSION.*, CONTESTED.*, "
                    "OWN.RECORD.READ, ROLE.CREATE/UPDATE, EXPORT.DATA and more).",
               "PermissionGuard / hasPermission() compared against undefined, "
               "returned false, and the UI hid actions the user actually has.",
               "Mirror brought to full parity: 87 / 87, with a permanent drift "
               "check in the harness."],
              ["3", "The drift detector regex only matched single-dot permission "
                    "names, so OWN.RECORD.READ was invisible to it.",
               "A false negative - the drift check could pass while broken.",
               "Regex widened to [A-Z_]+(\\.[A-Z_]+)+."],
              ["4", "The transition-map check matched the substring _ALLOWED "
                    "inside the error code ROLE_NOT_ALLOWED.",
               "A false positive that masked a real regression signal.",
               "Check narrowed to _ALLOWED\\s*[:=] and _ALLOWED\\.get\\(."],
          ],
          widths=[0.3, 2.2, 2.0, 2.0])

    # =====================================================================
    heading(doc, "3. Test results", 1)
    table(doc,
          ["Suite", "Result"],
          [
              ["test_rbac_security.py + test_acquisition_authz.py + "
               "test_backend_integration.py", "56 passed"],
              ["Full backend suite (pytest tests)", "723 passed, 46 skipped, 4 failed"],
              ["Pre-session baseline", "698 passed, 4 failed"],
              ["Delta", "+25 tests added, no regressions"],
              ["Static verification harness", "42 passed, 0 failed"],
              ["npm run typecheck", "exit 0"],
              ["npm run build", "exit 0"],
          ],
          widths=[4.3, 2.2])

    para(doc, "The 4 remaining failures are pre-existing and environmental, not "
              "code defects:", space_after=4)
    bullet(doc, "test_live_translate_config_contract - google.genai.types has no "
                "attribute TranslationConfig.")
    bullet(doc, "2x TestRegionTableConfidenceEvidence - Tesseract returns "
                "words=0 on this machine, so the HEADER and MAIN_TABLE regions "
                "are absent.")
    bullet(doc, "test_runner_env_forces_llamacpp - Surya provider unavailable, "
                "no Docker runtime present.")
    para(doc, "Identical set to the pre-session baseline.", italic=True,
         color=MUTED, space_after=10)

    heading(doc, "3.1 Verification harness coverage", 2)
    table(doc,
          ["Area", "What is asserted"],
          [
              ["Syntax", "Every .py file parses."],
              ["Routes", "All 10 RBAC-critical paths are registered; OpenAPI "
                          "generates cleanly (98 paths, 40 schemas)."],
              ["Roles", "Exactly 7 canonical roles; aliases normalize; LAO is "
                        "not a runtime role; system_admin holds '*'; executive "
                        "has zero write permissions; AUDIT.READ is admin-only."],
              ["Scope", "Approver with empty authority returns 404; unassigned "
                        "record returns 404; citizen on a foreign record returns "
                        "404."],
              ["Workflow", "Approval restricted to approver; admin cannot bypass "
                           "edge legality; unknown entity refused; digitization "
                           "terminal state respected; no competing transition map "
                           "in any route."],
              ["Audit", "No silent except/pass under app/api; audit service "
                        "reports its own failures."],
              ["Credentials", "No hardcoded password; no default SECRET_KEY; "
                              "DEBUG defaults to False; one dev password per "
                              "process."],
              ["Contract", "All 8 frontend API calls resolve to real backend "
                           "routes; permission mirror matches exactly in both "
                           "directions with no invented permissions."],
          ],
          widths=[1.1, 5.4])

    # =====================================================================
    heading(doc, "4. Error contract reference", 1)
    table(doc,
          ["Situation", "Status", "Code"],
          [
              ["Missing / invalid / expired token", "401", "AUTHENTICATION_REQUIRED"],
              ["Authenticated but lacking the permission", "403", "PERMISSION_DENIED"],
              ["In role but outside the object's project or assignment scope",
               "404", "RESOURCE_NOT_FOUND"],
              ["Invalid lifecycle edge", "422", "INVALID_TRANSITION"],
              ["Valid edge, wrong role for the target state", "422", "ROLE_NOT_ALLOWED"],
              ["Edit to a frozen record", "423", "RECORD_FROZEN"],
              ["Freeze state unreadable", "503", "FREEZE_STATE_UNAVAILABLE"],
              ["Freeze / unfreeze without justification", "400", "JUSTIFICATION_REQUIRED"],
              ["Assignment to an unknown principal", "404", "ASSIGNEE_NOT_FOUND"],
              ["Admin disabling their own account", "400", "SELF_DISABLE_DENIED"],
              ["User creation with an unknown role", "400", "INVALID_ROLE"],
              ["Duplicate username", "409", "USER_EXISTS"],
          ],
          widths=[3.2, 0.7, 2.6], mono_cols=(2,))

    # =====================================================================
    heading(doc, "5. Remaining work (honest gaps)", 1)
    numbered(doc, "backend/.env still holds a django-insecure- placeholder "
                  "secret and local credentials. The verification harness flags "
                  "this explicitly. Rotate and sanitize before any deployment.",
             bold_prefix="Rotate the placeholder secret. ")
    numbered(doc, "Project membership (_PROJECT_MEMBERS) and record assignments "
                  "(_RECORD_ASSIGNMENTS) are held in memory and reset on process "
                  "restart. Tables are created via create_all and there is no "
                  "Alembic chain. This is the single most important remaining "
                  "gap for production durability.",
             bold_prefix="Persist scope assignments. ")
    numbered(doc, "The admin surface and most role dashboards still render "
                  "hardcoded demo data, and services/citizen.ts plus "
                  "services/acquisition.ts retain mock fallbacks. These should "
                  "be replaced with real API reads before a pilot.",
             bold_prefix="Remove mock dashboard data. ")
    numbered(doc, "No frontend test runner is configured, so roleHome() and the "
                  "route guards are covered by types and build only. Adding "
                  "Vitest would close this.",
             bold_prefix="Add a frontend test runner. ")
    numbered(doc, "git status contains many pre-existing modifications and "
                  "deletions under backend/uploads/ and data/uploads/ (test "
                  "artifacts). These were deliberately left untouched and no "
                  "reset was performed.",
             bold_prefix="Noisy working tree. ")

    doc.add_page_break()

    # =====================================================================
    heading(doc, "6. How to test the RBAC module", 1)

    heading(doc, "6.1 Boot the stack", 2)
    para(doc, "backend/.env must contain DEBUG=True and a SECRET_KEY for local "
              "work. Do not rely on the placeholder value in any shared "
              "environment.", space_after=4)
    code(doc, "cd D:\\ZameenAI\\backend")
    code(doc, "uvicorn app.main:app --reload --port 8000")
    code(doc, "")
    code(doc, "cd D:\\ZameenAI\\frontend")
    code(doc, "npm run dev        # http://localhost:3005")

    heading(doc, "6.2 The 7 test identities", 2)
    table(doc,
          ["Canonical role", "Username", "Landing page"],
          [
              ["system_admin", "admin", "/admin"],
              ["pia", "pia", "/pia"],
              ["field_officer", "field", "/field-officer"],
              ["desk_validator (LAO)", "validator", "/desk-validator"],
              ["approver (CALA / DM)", "approver", "/approver"],
              ["executive", "executive", "/executive"],
              ["citizen", "OTP only (no password)", "/citizen/dashboard"],
          ],
          widths=[2.2, 2.0, 2.3], mono_cols=(2,))
    para(doc, "Set DEV_USERS_PASSWORD in backend/.env to a value you know. If it "
              "is unset, the application logs one random password at startup - "
              "copy it from the log. All seven identities share that single "
              "password.", space_after=4)
    para(doc, "Note: 'validator' is a username, not a role. The canonical role is "
              "desk_validator. Posting role=\"validator\" to /api/admin/users "
              "correctly returns 400 INVALID_ROLE.", italic=True, color=MUTED)

    heading(doc, "6.3 Manual matrix", 2)

    para(doc, "A. Unauthenticated requests (expect 401 everywhere)", bold=True,
         space_after=3)
    code(doc, '$base = "http://localhost:8000"')
    code(doc, 'foreach($p in "/api/admin/users","/api/records/LR-1",'
              '"/api/workflow/audit","/api/acquisition/projects"){')
    code(doc, '  $r = Invoke-WebRequest "$base$p" -SkipHttpErrorCheck')
    code(doc, '  "$p -> $($r.StatusCode)"')
    code(doc, '}')

    para(doc, "B. Admin access and enumeration-safe denial", bold=True,
         space_after=3)
    code(doc, "$pw = $env:DEV_USERS_PASSWORD      # or read from backend/.env")
    code(doc, "$tok = (Invoke-RestMethod \"$base/api/auth/login\" -Method Post `")
    code(doc, "        -ContentType 'application/json' `")
    code(doc, "        -Body (@{username='admin';password=$pw}|ConvertTo-Json)).access_token")
    code(doc, "$h = @{ Authorization = \"Bearer $tok\" }")
    code(doc, "(Invoke-WebRequest \"$base/api/admin/users\" -Headers $h `")
    code(doc, "   -SkipHttpErrorCheck).StatusCode   # 200")
    code(doc, "(Invoke-WebRequest \"$base/api/records/LR-1\" -Headers $h `")
    code(doc, "   -SkipHttpErrorCheck).StatusCode   # 404 - no assignment exists")

    para(doc, "C. Executive is strictly read-only", bold=True, space_after=3)
    bullet(doc, "Every POST / PATCH / DELETE on acquisition, records, workflow "
                "and admin returns 403.")
    bullet(doc, "GET /api/admin/audit returns 200; GET /api/admin/users returns 403.")

    para(doc, "D. An approver cannot freeze a record they are not assigned to",
         bold=True, space_after=3)
    code(doc, "# unassigned record -> 404, enumeration-safe (deliberately not 403)")
    code(doc, "(Invoke-WebRequest \"$base/api/acquisition/records/LR-NEW-1/freeze\" `")
    code(doc, "   -Method Post -Headers $hApprover -ContentType 'application/json' `")
    code(doc, "   -Body '{\"text\":\"court order\"}' -SkipHttpErrorCheck).StatusCode")
    code(doc, "")
    code(doc, "# validator assigns the record; the approver joins the authority list")
    code(doc, "(Invoke-RestMethod \"$base/api/workflow/records/LR-NEW-1/assign"
              "?assignee_id=u-approver\" `")
    code(doc, "   -Method Post -Headers $hValidator)")
    code(doc, "")
    code(doc, "# the same freeze now succeeds")

    para(doc, "E. Justification is mandatory", bold=True, space_after=3)
    bullet(doc, "Omitting the text field returns 400 JUSTIFICATION_REQUIRED.")

    para(doc, "F. A frozen record rejects edits", bold=True, space_after=3)
    bullet(doc, "After a successful freeze, PATCH /api/records/{id} returns "
                "423 RECORD_FROZEN.")

    para(doc, "G. Lifecycle edges are state-gated and role-gated", bold=True,
         space_after=3)
    bullet(doc, "POST /api/acquisition/projects/{id}/approve on a DRAFT project "
                "returns 422 INVALID_TRANSITION.")
    bullet(doc, "As pia on a PENDING_APPROVAL project: 403 PERMISSION_DENIED.")
    bullet(doc, "As approver on the same project: 200.")

    para(doc, "H. Ghost assignees are rejected", bold=True, space_after=3)
    code(doc, "# assignee_id=u-ghost -> 404 ASSIGNEE_NOT_FOUND, nothing persisted")
    bullet(doc, "A real principal seeded only in the development store is "
                "accepted; anything else is refused.")

    para(doc, "I. An admin cannot lock themselves out", bold=True, space_after=3)
    code(doc, "(Invoke-WebRequest \"$base/api/admin/users/$ownId/disable\" `")
    code(doc, "   -Method Post -Headers $h -SkipHttpErrorCheck).StatusCode")
    bullet(doc, "Expect 400 SELF_DISABLE_DENIED.")

    para(doc, "J. Audit rows exist for every sensitive action", bold=True,
         space_after=3)
    bullet(doc, "Every step above should appear in GET /api/admin/audit with "
                "actor id, actor role, entity, before/after state, request id "
                "and IP.")

    para(doc, "K. UI navigation follows the authenticated role", bold=True,
         space_after=3)
    bullet(doc, "Sign in as approver: you must land on /approver, never on "
                "/desk-validator.")
    bullet(doc, "Sign out, then sign in as executive: the Admin nav item is "
                "hidden and direct navigation to /admin is refused.")

    para(doc, "L. Citizen OTP isolation", bold=True, space_after=3)
    bullet(doc, "Request and verify the OTP, confirm only owned records are "
                "visible, and that a non-owned record id returns 404.")

    heading(doc, "6.4 Automated verification", 2)
    code(doc, "cd D:\\ZameenAI\\backend")
    code(doc, "python scripts/verify_rbac.py       # 42 passed, 0 failed")
    code(doc, "python scripts/permission_drift.py   # 87 / 87, zero drift")
    code(doc, "python -m pytest tests/test_rbac_security.py `")
    code(doc, "                 tests/test_acquisition_authz.py `")
    code(doc, "                 tests/test_backend_integration.py -q -p no:randomly")
    code(doc, "# 56 passed")
    para(doc, "Start with tests/test_acquisition_authz.py - it covers project "
              "scope, the lifecycle authority, assignment persistence, freeze "
              "rules and the fail-closed freeze lookup.", space_after=8)

    heading(doc, "6.5 Verify the fail-closed production boot check", 2)
    code(doc, "cd D:\\ZameenAI\\backend")
    code(doc, '$env:DEBUG = "false"')
    code(doc, '$env:SECRET_KEY = ""')
    code(doc, "python -c \"from app.core.security import assert_secure_secret; "
              "assert_secure_secret()\"")
    para(doc, "Expected: RuntimeError - Refusing to boot in production with a "
              "placeholder SECRET_KEY.", italic=True, color=MUTED)

    para(doc, "Note: on PowerShell an empty environment variable may be ignored "
              "in favour of the .env value. The check still correctly rejects "
              "the django-insecure- placeholder, which is the intended signal.",
         italic=True, color=MUTED)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"written: {path}")
    print(f"size   : {path.stat().st_size:,} bytes")
