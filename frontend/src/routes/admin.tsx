import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Activity,
  KeyRound,
  FileCheck2,
  TableProperties,
  Building2,
  MapPin,
  FolderGit2,
  GitFork,
  FileText,
  Boxes,
  ClipboardList,
  Server,
  Bell,
  Sliders,
  UserCircle,
  ChevronDown,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  RotateCcw,
  Building,
  X,
  Plus,
  Lock,
  Printer,
  Save,
} from "lucide-react";
import PortalLayout, {
  PortalCard,
  GreetingHeader,
} from "../components/portal/PortalLayout";
import { INDIA_STATES, INDIA_DISTRICTS, ALL_DISTRICTS } from "../utils/indiaGeo";

export const Route = createFileRoute("/admin")({
  component: AdminPortal,
});

type ViewKey =
  | "dashboard" | "users" | "users-new" | "user-activity" | "roles"
  | "permissions" | "permission-matrix" | "departments" | "states"
  | "districts" | "jurisdictions" | "projects" | "workflows" | "documents"
  | "integrations" | "audit-logs" | "system-monitor" | "notifications"
  | "settings" | "profile";

type Role = "SYSTEM_ADMIN" | "PIA" | "FIELD_OFFICER" | "LAO" | "APPROVER" | "EXECUTIVE" | "CITIZEN";
type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "INACTIVE";
type AccessLevel = "ALLOWED" | "RESTRICTED" | "NOT_ALLOWED";

interface AdminUser {
  id: string; fullName: string; email: string; phone: string; officialId: string;
  role: Role; departmentId: string; departmentName: string; state: string; district: string;
  status: UserStatus; lastLogin: string; createdAt: string;
  accessStartDate: string; accessExpiryDate: string; twoFactorEnabled: boolean;
}

interface ConfirmRequest {
  title: string; message: string; impactWarning: string;
  confirmButtonText?: string; dangerLevel?: "danger" | "warning" | "primary";
  requiresReason?: boolean; onConfirm: (reason?: string) => void;
}

const ADMIN = {
  name: "Shri Rajeshwar Sen",
  initials: "RS",
  email: "rajeshwar.sen@gov.in",
  designation: "Senior Technical Director (ITS) · System Administrator",
  badge: "SYSADMIN-001",
  jurisdiction: "National (All Jurisdictions)",
};

/* ================= MOCK DATA ================= */

const INITIAL_USERS: AdminUser[] = [
  { id: "usr_adm_01", fullName: "Shri Rajeshwar Sen, ITS", email: "rajeshwar.sen@gov.in", phone: "+91 98110 24680", officialId: "ITS-2016-044", role: "SYSTEM_ADMIN", departmentId: "dept_nic", departmentName: "NIC Platform Cell", state: "Central", district: "Statewide / HQ", status: "ACTIVE", lastLogin: "2026-09-26 11:30 UTC", createdAt: "2024-04-02", accessStartDate: "2024-04-02", accessExpiryDate: "2027-03-31", twoFactorEnabled: true },
  { id: "usr_lao_02", fullName: "Shri S. K. Mukherjee", email: "sk.mukherjee@wb.gov.in", phone: "+91 98301 44521", officialId: "WB-LAO-2018-094", role: "LAO", departmentId: "dept_rev_hooghly", departmentName: "Office of DM & LA Collector, Hooghly", state: "West Bengal", district: "Hooghly", status: "ACTIVE", lastLogin: "2026-09-26 10:02 UTC", createdAt: "2024-06-11", accessStartDate: "2024-06-11", accessExpiryDate: "2027-03-31", twoFactorEnabled: true },
  { id: "usr_pia_03", fullName: "Er. Rajeshwar Singhal", email: "ro4.lao@nhidcl.gov.in", phone: "+91 54225 84491", officialId: "PIA-OFFICER-7741", role: "PIA", departmentId: "dept_nhidcl", departmentName: "NHIDCL Regional Office IV", state: "Uttar Pradesh", district: "Varanasi", status: "ACTIVE", lastLogin: "2026-09-25 16:44 UTC", createdAt: "2024-07-02", accessStartDate: "2024-07-02", accessExpiryDate: "2026-12-31", twoFactorEnabled: true },
  { id: "usr_apr_04", fullName: "Smt. Ananya Deshmukh, IAS", email: "cala.dadri@up.gov.in", phone: "+91 98765 11223", officialId: "CALA-UP-GBN-84", role: "APPROVER", departmentId: "dept_cala", departmentName: "Office of CALA, Gautam Buddha Nagar", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", status: "ACTIVE", lastLogin: "2026-09-26 09:15 UTC", createdAt: "2024-05-19", accessStartDate: "2024-05-19", accessExpiryDate: "2027-03-31", twoFactorEnabled: true },
  { id: "usr_fld_05", fullName: "Shri Rajesh Kumar Verma", email: "r.verma.rev@up.gov.in", phone: "+91 98765 43210", officialId: "FO-UP-2024-089", role: "FIELD_OFFICER", departmentId: "dept_rev_varanasi", departmentName: "Tehsil Revenue Office, Pindra", state: "Uttar Pradesh", district: "Varanasi", status: "ACTIVE", lastLogin: "2026-09-25 23:15 UTC", createdAt: "2024-08-07", accessStartDate: "2024-08-07", accessExpiryDate: "2026-12-31", twoFactorEnabled: false },
  { id: "usr_exe_06", fullName: "Shri Vinod K. Saxena, IAS", email: "ss.land@nic.in", phone: "+91 98100 77889", officialId: "EXEC-DOLR-011", role: "EXECUTIVE", departmentId: "dept_dolr", departmentName: "Dept. of Land Resources & PM GatiShakti Cell", state: "Central", district: "Statewide / HQ", status: "ACTIVE", lastLogin: "2026-09-26 09:15 UTC", createdAt: "2024-04-02", accessStartDate: "2024-04-02", accessExpiryDate: "2027-03-31", twoFactorEnabled: true },
  { id: "usr_lao_07", fullName: "Shri R. K. Sharma", email: "rk.sharma@up.gov.in", phone: "+91 94120 33445", officialId: "UP-LAO-2020-113", role: "LAO", departmentId: "dept_rev_dadri", departmentName: "Office of Special LAO (NH-19), Varanasi", state: "Uttar Pradesh", district: "Varanasi", status: "PENDING_VERIFICATION", lastLogin: "Never (Pending First Login)", createdAt: "2026-09-20", accessStartDate: "2026-09-20", accessExpiryDate: "2027-03-31", twoFactorEnabled: true },
  { id: "usr_fld_08", fullName: "Shri Ramesh Patwari", email: "ramesh.patwari@jh.gov.in", phone: "+91 94311 90876", officialId: "FLD-RNC-KNK-221", role: "FIELD_OFFICER", departmentId: "dept_rev_kanke", departmentName: "Kanke Circle, Ranchi", state: "Jharkhand", district: "Ranchi", status: "SUSPENDED", lastLogin: "2026-08-30 14:22 UTC", createdAt: "2024-09-15", accessStartDate: "2024-09-15", accessExpiryDate: "2026-09-30", twoFactorEnabled: false },
  { id: "usr_cit_09", fullName: "Shri Dhananjay Singh (Demo)", email: "citizen.demo@example.in", phone: "+91 90000 11111", officialId: "CIT-DEMO-0001", role: "CITIZEN", departmentId: "dept_nic", departmentName: "NIC Platform Cell", state: "Uttar Pradesh", district: "Varanasi", status: "INACTIVE", lastLogin: "2026-07-11 08:00 UTC", createdAt: "2025-01-05", accessStartDate: "2025-01-05", accessExpiryDate: "2026-01-05", twoFactorEnabled: false },
];

const ROLES: { id: Role; name: string; desc: string; users: number; operational: boolean; locked?: boolean }[] = [
  { id: "SYSTEM_ADMIN", name: "System Administrator", desc: "Platform control, RBAC governance, integrations & audit. Barred from operational approvals.", users: 4, operational: false, locked: true },
  { id: "PIA", name: "Project Implementing Agency", desc: "Initiates requisitions, uploads dossiers, responds to LAO returns.", users: 312, operational: true },
  { id: "FIELD_OFFICER", name: "Field Officer", desc: "Ground verification, JMS surveys, geo-tagged evidence, mismatch reports.", users: 1240, operational: true },
  { id: "LAO", name: "LAO Desk Validator", desc: "Human-in-the-loop OCR validation, returns, rejections.", users: 486, operational: true },
  { id: "APPROVER", name: "Acquisition Approver (CALA/DM)", desc: "Quasi-judicial awards, sanctions, possession orders.", users: 128, operational: true },
  { id: "EXECUTIVE", name: "Executive / Dept Head", desc: "Read-only national oversight, MIS digests, forecasts.", users: 46, operational: false },
  { id: "CITIZEN", name: "Citizen / Landowner", desc: "Self-service land, compensation & grievance tracking.", users: 202, operational: false },
];

const PERM_GROUPS: { group: string; perms: { id: string; code: string; name: string; operational: boolean }[] }[] = [
  { group: "User Management", perms: [
    { id: "p_create_user", code: "CREATE_USER", name: "Provision official user accounts", operational: false },
    { id: "p_suspend_user", code: "SUSPEND_USER", name: "Suspend / reinstate access", operational: false },
    { id: "p_reset_cred", code: "RESET_CREDENTIALS", name: "Issue MFA & credential resets", operational: false },
  ]},
  { group: "Role Management", perms: [
    { id: "p_assign_role", code: "ASSIGN_ROLE", name: "Bind roles to officials", operational: false },
    { id: "p_edit_matrix", code: "EDIT_ROLE_MATRIX", name: "Edit RBAC permission matrix", operational: false },
  ]},
  { group: "Platform Configuration", perms: [
    { id: "p_config_dept", code: "CONFIGURE_DEPARTMENT", name: "Create / edit departments", operational: false },
    { id: "p_config_proj", code: "CONFIGURE_PROJECT", name: "Configure acquisition projects", operational: false },
    { id: "p_config_flow", code: "CONFIGURE_WORKFLOW", name: "Toggle workflow stages & SLAs", operational: false },
    { id: "p_config_doc", code: "SET_RETENTION_POLICY", name: "Set document retention & archival", operational: false },
    { id: "p_config_int", code: "TOGGLE_INTEGRATION", name: "Enable / disable integrations", operational: false },
  ]},
  { group: "Audit & Monitoring", perms: [
    { id: "p_view_audit", code: "VIEW_AUDIT_LOG", name: "Read tamper-evident audit trail", operational: false },
    { id: "p_export_audit", code: "EXPORT_AUDIT_BUNDLE", name: "Export audit bundles", operational: false },
    { id: "p_view_health", code: "VIEW_SYSTEM_HEALTH", name: "View infrastructure telemetry", operational: false },
  ]},
  { group: "Operational Approval", perms: [
    { id: "p_approve_acq", code: "APPROVE_ACQUISITION", name: "Grant acquisition awards (CALA/DM)", operational: true },
    { id: "p_validate_ocr", code: "VALIDATE_OCR_FIELDS", name: "Validate OCR extractions (LAO)", operational: true },
  ]},
  { group: "Field Verification", perms: [
    { id: "p_field_verify", code: "RECORD_FIELD_VERIFICATION", name: "Submit ground verification (Field)", operational: true },
    { id: "p_edit_cadastral", code: "EDIT_CADASTRAL_DATA", name: "Alter cadastral geometry (Survey)", operational: true },
  ]},
];

const ALL_PERM_IDS = PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id));
const OPERATIONAL_IDS = new Set(PERM_GROUPS.flatMap((g) => g.perms.filter((p) => p.operational).map((p) => p.id)));

function defaultMatrix(): Record<Role, Record<string, AccessLevel>> {
  const roles: Role[] = ["SYSTEM_ADMIN", "PIA", "FIELD_OFFICER", "LAO", "APPROVER", "EXECUTIVE", "CITIZEN"];
  const m = {} as Record<Role, Record<string, AccessLevel>>;
  for (const r of roles) {
    m[r] = {};
    for (const pid of ALL_PERM_IDS) {
      const op = OPERATIONAL_IDS.has(pid);
      if (r === "SYSTEM_ADMIN") m[r][pid] = op ? "NOT_ALLOWED" : "ALLOWED";
      else if (r === "CITIZEN") m[r][pid] = "NOT_ALLOWED";
      else if (r === "EXECUTIVE") m[r][pid] = ["p_view_audit", "p_view_health"].includes(pid) ? "ALLOWED" : "RESTRICTED";
      else m[r][pid] = "RESTRICTED";
    }
  }
  m["LAO"]["p_validate_ocr"] = "ALLOWED";
  m["APPROVER"]["p_approve_acq"] = "ALLOWED";
  m["FIELD_OFFICER"]["p_field_verify"] = "ALLOWED";
  m["PIA"]["p_config_proj"] = "ALLOWED";
  return m;
}

const INITIAL_DEPTS = [
  { id: "dept_nic", name: "NIC Platform Cell", code: "NIC-PLT", state: "Central", district: "HQ", head: "Shri Rajeshwar Sen", users: 12, projects: 0, status: "ACTIVE", category: "PLATFORM" },
  { id: "dept_rev_hooghly", name: "Office of DM & LA Collector, Hooghly", code: "WB-REV-HGY", state: "West Bengal", district: "Hooghly", head: "District Magistrate", users: 86, projects: 4, status: "ACTIVE", category: "REVENUE" },
  { id: "dept_nhidcl", name: "NHIDCL Regional Office IV", code: "NHIDCL-RO4", state: "Uttar Pradesh", district: "Varanasi", head: "Er. Rajeshwar Singhal", users: 64, projects: 6, status: "ACTIVE", category: "HIGHWAYS" },
  { id: "dept_cala", name: "Office of CALA, Gautam Buddha Nagar", code: "UP-CALA-GBN", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", head: "Smt. Ananya Deshmukh", users: 32, projects: 3, status: "ACTIVE", category: "REVENUE" },
  { id: "dept_dolr", name: "Dept. of Land Resources & PM GatiShakti Cell", code: "DOLR-GS", state: "Central", district: "HQ", head: "Shri Vinod K. Saxena", users: 46, projects: 10, status: "ACTIVE", category: "SURVEY_SETTLEMENT" },
  { id: "dept_rev_varanasi", name: "Tehsil Revenue Office, Pindra", code: "UP-REV-PIN", state: "Uttar Pradesh", district: "Varanasi", head: "Tehsildar, Pindra", users: 118, projects: 2, status: "ACTIVE", category: "REVENUE" },
];

const INITIAL_JURISDICTIONS = [
  { id: "jur_01", state: "Uttar Pradesh", district: "Varanasi", tehsil: "Pindra", villages: 142, dept: "Tehsil Revenue Office, Pindra", status: "ACTIVE" },
  { id: "jur_02", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", tehsil: "Dadri", villages: 118, dept: "Office of CALA, Gautam Buddha Nagar", status: "ACTIVE" },
  { id: "jur_03", state: "West Bengal", district: "Hooghly", tehsil: "Serampore", villages: 96, dept: "Office of DM & LA Collector, Hooghly", status: "ACTIVE" },
  { id: "jur_04", state: "West Bengal", district: "Hooghly", tehsil: "Singur", villages: 64, dept: "Office of DM & LA Collector, Hooghly", status: "UNDER_REVIEW" },
  { id: "jur_05", state: "Jharkhand", district: "Ranchi", tehsil: "Kanke", villages: 88, dept: "Kanke Circle, Ranchi", status: "ACTIVE" },
  { id: "jur_06", state: "Bihar", district: "Kaimur", tehsil: "Bhabua", villages: 124, dept: "DLR Office, Kaimur", status: "UNDER_REVIEW" },
];

const INITIAL_PROJECTS = [
  { id: "PRJ-NH-048", name: "NH-19 6-Laning Varanasi Bypass", dept: "NHIDCL Regional Office IV", state: "Uttar Pradesh", district: "Varanasi", type: "HIGHWAY", status: "ACTIVE_PIPELINE", workflow: "Land Acquisition v3.2" },
  { id: "PRJ-DFCC-102", name: "Western DFC Dadri–Rewari Feeder", dept: "Office of CALA, Gautam Buddha Nagar", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", type: "RAILWAY_CORRIDOR", status: "ACTIVE_PIPELINE", workflow: "Land Acquisition v3.2" },
  { id: "PRJ-REN-512", name: "Vindhya 1200MW Solar Transmission", dept: "NHIDCL Regional Office IV", state: "Uttar Pradesh", district: "Mirzapur", type: "ENERGY_CORRIDOR", status: "CONFIGURED", workflow: "Land Acquisition v3.2" },
  { id: "PRJ-EDFC-201", name: "Eastern DFC Dankuni–Gomoh", dept: "Office of DM & LA Collector, Hooghly", state: "West Bengal", district: "Hooghly", type: "RAILWAY_CORRIDOR", status: "ACTIVE_PIPELINE", workflow: "Land Acquisition v3.1" },
  { id: "PRJ-RNC-077", name: "Ranchi Ring Road Phase-II", dept: "Kanke Circle, Ranchi", state: "Jharkhand", district: "Ranchi", type: "HIGHWAY", status: "DRAFT", workflow: "Digitization v2.8" },
];

const INITIAL_WORKFLOWS = [
  { id: "wf_acq", name: "Land Acquisition Pipeline", category: "LAND_ACQUISITION", version: "v3.2", status: "ACTIVE", updated: "2026-08-14",
    stages: [
      { id: "st_draft", n: 1, name: "Draft (PIA)", role: "PIA" as Role, sla: 72, enabled: true },
      { id: "st_submit", n: 2, name: "Submitted / Gateway", role: "PIA" as Role, sla: 24, enabled: true },
      { id: "st_aiocr", n: 3, name: "AI / OCR Extraction", role: "SYSTEM_ADMIN" as Role, sla: 12, enabled: true },
      { id: "st_desk", n: 4, name: "Desk Validation (LAO)", role: "LAO" as Role, sla: 48, enabled: true },
      { id: "st_field", n: 5, name: "Field Verification (JMS)", role: "FIELD_OFFICER" as Role, sla: 120, enabled: true },
      { id: "st_cala", n: 6, name: "CALA Review", role: "APPROVER" as Role, sla: 96, enabled: true },
      { id: "st_dm", n: 7, name: "DM Approval", role: "APPROVER" as Role, sla: 72, enabled: true },
      { id: "st_freeze", n: 8, name: "Record Freeze", role: "SYSTEM_ADMIN" as Role, sla: 24, enabled: true },
      { id: "st_acq", n: 9, name: "Acquired & Vested", role: "APPROVER" as Role, sla: 24, enabled: true },
    ]},
  { id: "wf_digi", name: "Land Record Digitization", category: "LAND_RECORD_DIGITIZATION", version: "v2.8", status: "ACTIVE", updated: "2026-06-30",
    stages: [
      { id: "dg_up", n: 1, name: "Upload", role: "PIA" as Role, sla: 24, enabled: true },
      { id: "dg_pre", n: 2, name: "Preprocess", role: "SYSTEM_ADMIN" as Role, sla: 6, enabled: true },
      { id: "dg_cls", n: 3, name: "Classify", role: "SYSTEM_ADMIN" as Role, sla: 6, enabled: true },
      { id: "dg_ocr", n: 4, name: "OCR", role: "SYSTEM_ADMIN" as Role, sla: 12, enabled: true },
      { id: "dg_ext", n: 5, name: "Extract", role: "SYSTEM_ADMIN" as Role, sla: 12, enabled: true },
      { id: "dg_val", n: 6, name: "Validate", role: "LAO" as Role, sla: 48, enabled: true },
      { id: "dg_rev", n: 7, name: "Review", role: "LAO" as Role, sla: 24, enabled: false },
      { id: "dg_done", n: 8, name: "Complete", role: "SYSTEM_ADMIN" as Role, sla: 6, enabled: true },
    ]},
];

const DOC_CATS = [
  { name: "Project Proposal / Requisition Docket", code: "DOC-PROP", formats: "PDF/A", size: 25, retention: 12, permanent: false, versioning: "STRICT_FULL_HISTORY", access: "DEPARTMENT_ONLY", stored: 12480, gb: 412 },
  { name: "Cadastral Alignment Plan", code: "DOC-MAP", formats: "PDF, DWG, GeoJSON", size: 150, retention: 30, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "RESTRICTED", stored: 8210, gb: 1240 },
  { name: "Land Schedule (Form-A)", code: "DOC-SCHED", formats: "XLSX, PDF", size: 10, retention: 30, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "RESTRICTED", stored: 18930, gb: 96 },
  { name: "Certified RoR / Khatiyan Extract", code: "DOC-ROR", formats: "PDF/A", size: 50, retention: 99, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "CONFIDENTIAL", stored: 45210, gb: 2210 },
  { name: "Detailed Project Report", code: "DOC-DPR", formats: "PDF", size: 100, retention: 12, permanent: false, versioning: "MAJOR_ONLY", access: "DEPARTMENT_ONLY", stored: 3420, gb: 288 },
  { name: "Gazette Notification Copy", code: "DOC-GAZ", formats: "PDF/A", size: 15, retention: 99, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "PUBLIC_FACING", stored: 1960, gb: 22 },
];

const INITIAL_INTEGRATIONS = [
  { id: "int_janparichay", name: "Jan Parichay SSO", type: "AUTHENTICATION", provider: "NIC", endpoint: "https://janparichay.meripehchaan.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:20 UTC", auth: "VALID_CREDENTIAL", key: "jp_live_••••9f2a", ver: "OIDC 2.1", latency: 64, notes: "Primary admin & officer SSO" },
  { id: "int_digilocker", name: "DigiLocker Document Fetch", type: "GOVERNMENT_APIS", provider: "NeGD", endpoint: "https://api.digitallocker.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 10:58 UTC", auth: "VALID_CREDENTIAL", key: "dl_live_••••41bc", ver: "v3", latency: 112, notes: "Title deed fetch for PIA dossiers" },
  { id: "int_bhulekh_up", name: "Bhulekh UP RoR API", type: "GOVERNMENT_APIS", provider: "UP Revenue Dept", endpoint: "https://upbhulekh.gov.in/api", status: "DEGRADED", enabled: true, sync: "2026-09-25 22:14 UTC", auth: "EXPIRING_SOON", key: "bh_up_••••77e0", ver: "v2", latency: 840, notes: "Credential rotation due 05-Oct-2026" },
  { id: "int_banglar", name: "BanglarBhumi Sync", type: "GOVERNMENT_APIS", provider: "WB Land Dept", endpoint: "https://banglarbhumi.gov.in/api", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:02 UTC", auth: "VALID_CREDENTIAL", key: "bb_wb_••••c819", ver: "v2", latency: 148, notes: "Hooghly circle RoR sync" },
  { id: "int_sms", name: "NIC SMS Gateway (DLT)", type: "NOTIFICATION_SERVICES", provider: "NIC", endpoint: "https://smsgw.sms.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:29 UTC", auth: "VALID_CREDENTIAL", key: "sg_nic_••••02dd", ver: "v1", latency: 92, notes: "OTP + deadline alerts" },
  { id: "int_obj", name: "MeghRaj Object Storage (S3)", type: "STORAGE", provider: "NIC Cloud", endpoint: "https://s3.meghraj.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:30 UTC", auth: "VALID_CREDENTIAL", key: "s3_mr_••••b6f4", ver: "S3", latency: 38, notes: "Dossier + evidence bucket" },
  { id: "int_ocr", name: "ZameenAI OCR Engine", type: "OCR", provider: "Internal", endpoint: "http://ocr-cluster:8080", status: "DEGRADED", enabled: true, sync: "2026-09-26 09:41 UTC", auth: "VALID_CREDENTIAL", key: "internal", ver: "v4.2.0-rc2", latency: 1210, notes: "2 GPU workers queued > 5 min" },
  { id: "int_gis", name: "Bhunaksha Tile Service", type: "GIS", provider: "NIC", endpoint: "https://bhunaksha.nic.in/tiles", status: "HEALTHY", enabled: false, sync: "2026-09-20 18:00 UTC", auth: "VALID_CREDENTIAL", key: "bh_tile_••••9a77", ver: "WMTS 1.0", latency: 210, notes: "Disabled pending tile-cache rebuild" },
];

const INITIAL_AUDIT = [
  { id: "aud_90412", ts: "2026-09-26 11:24:10 UTC", user: "Shri Rajeshwar Sen", action: "PERMISSION_MATRIX_UPDATED", module: "Role & Permissions", entity: "RBAC_CORE_MATRIX", result: "SUCCESS", severity: "CRITICAL", reason: "Restricted VALIDATE_OCR_FIELDS for EXECUTIVE role" },
  { id: "aud_90408", ts: "2026-09-26 10:47:55 UTC", user: "Shri Rajeshwar Sen", action: "USER_SUSPENDED", module: "User Management", entity: "usr_fld_08", result: "SUCCESS", severity: "HIGH", reason: "Credential misuse flagged by Circle Officer, Kanke" },
  { id: "aud_90401", ts: "2026-09-26 09:58:02 UTC", user: "System (Scheduler)", action: "INTEGRATION_PROBE_DIAGNOSTIC", module: "Integrations", entity: "int_bhulekh_up", result: "WARNING", severity: "MEDIUM", reason: "Latency 840ms exceeds 500ms SLO" },
  { id: "aud_90397", ts: "2026-09-25 18:12:44 UTC", user: "Shri Rajeshwar Sen", action: "USER_CREATED", module: "User Management", entity: "usr_lao_07", result: "SUCCESS", severity: "HIGH", reason: "Provisioned LAO account for Special LAO (NH-19)" },
  { id: "aud_90390", ts: "2026-09-25 14:03:19 UTC", user: "Shri Rajeshwar Sen", action: "WORKFLOW_STAGE_TOGGLED", module: "Workflow Config", entity: "dg_rev", result: "SUCCESS", severity: "HIGH", reason: "Review stage disabled pending SOP revision" },
  { id: "aud_90381", ts: "2026-09-24 17:40:33 UTC", user: "Shri R. K. Sharma", action: "FIELD_CORRECTION", module: "Desk Validation", entity: "LA-2026-00109", result: "SUCCESS", severity: "LOW", reason: "Khasra 92/1 → 92/4 reconciled with Porcha" },
];

const INITIAL_SERVICES = [
  { id: "svc_api", name: "Core API Gateway", status: "HEALTHY", up: 99.98, lat: 42, err: 0.01, checked: "11:30:02", endpoint: "api.zameenai.gov.in", details: "3 replicas, autoscale armed" },
  { id: "svc_db", name: "PostgreSQL Cluster (Patroni)", status: "HEALTHY", up: 99.99, lat: 8, err: 0.0, checked: "11:30:02", endpoint: "pg-primary:5432", details: "Synchronous replica lag 0.2s" },
  { id: "svc_auth", name: "Jan Parichay Bridge", status: "HEALTHY", up: 99.95, lat: 64, err: 0.02, checked: "11:29:58", endpoint: "janparichay bridge", details: "Token cache hit 97%" },
  { id: "svc_obj", name: "Object Storage (S3)", status: "HEALTHY", up: 100.0, lat: 38, err: 0.0, checked: "11:30:00", endpoint: "s3.meghraj.gov.in", details: "4.2 TB / 20 TB used" },
  { id: "svc_ocr", name: "OCR Worker Pool", status: "DEGRADED", up: 96.4, lat: 1210, err: 2.1, checked: "11:29:55", endpoint: "ocr-cluster:8080", details: "2 GPU workers queued > 5 min" },
  { id: "svc_gis", name: "GIS Tile Server", status: "DEGRADED", up: 97.8, lat: 402, err: 1.4, checked: "11:29:57", endpoint: "tiles internal", details: "Cache rebuild at 62%" },
  { id: "svc_q", name: "SMS/Email Queue", status: "HEALTHY", up: 99.9, lat: 92, err: 0.05, checked: "11:30:01", endpoint: "queue:6379", details: "Depth 14, draining normally" },
  { id: "svc_ledger", name: "Audit Ledger Writer", status: "HEALTHY", up: 100.0, lat: 19, err: 0.0, checked: "11:30:03", endpoint: "ledger writer", details: "SHA-256 chain verified, 1.2M events" },
];

const INITIAL_NOTIFS = [
  { id: "n1", ts: "2026-09-26 11:24", title: "RBAC matrix change committed", desc: "EXECUTIVE role restricted from VALIDATE_OCR_FIELDS. Recorded as CRITICAL audit event.", cat: "SECURITY", sev: "WARNING", read: false, url: "audit-logs" as ViewKey },
  { id: "n2", ts: "2026-09-26 09:58", title: "Bhulekh UP API latency breach", desc: "P95 latency 840ms exceeds 500ms SLO. Credential rotation due 05-Oct-2026.", cat: "INTEGRATION", sev: "ERROR", read: false, url: "integrations" as ViewKey },
  { id: "n3", ts: "2026-09-25 22:14", title: "OCR worker queue backlog", desc: "2 GPU workers queued over 5 minutes. Consider scaling pool before 3E SLA window.", cat: "WORKFLOW", sev: "WARNING", read: false, url: "system-monitor" as ViewKey },
  { id: "n4", ts: "2026-09-25 18:12", title: "New LAO account provisioned", desc: "usr_lao_07 created for Special LAO (NH-19), Varanasi. MFA enforced.", cat: "ACCESS", sev: "INFO", read: true, url: "users" as ViewKey },
  { id: "n5", ts: "2026-09-24 06:00", title: "Weekly audit bundle archived", desc: "1.2M events sealed to GovCloud vault. Zero tamper flags.", cat: "MAINTENANCE", sev: "INFO", read: true, url: "audit-logs" as ViewKey },
];

const INITIAL_ACTIVITIES = [
  { id: "ua1", user: "Shri S. K. Mukherjee", action: "FIELD_CORRECTION committed", ip: "10.244.8.21", agent: "Chrome 126 / Win11", loc: "Hooghly, WB", ts: "2026-09-26 10:02 UTC", status: "SUCCESS", details: "Khasra correction on LA-2026-00109" },
  { id: "ua2", user: "Er. Rajeshwar Singhal", action: "Dossier upload (1420 KB)", ip: "10.244.9.44", agent: "Chrome 126 / Win11", loc: "Varanasi, UP", ts: "2026-09-25 23:15 UTC", status: "SUCCESS", details: "Toll plaza resubmission set" },
  { id: "ua3", user: "Shri Ramesh Patwari", action: "Login attempt (locked)", ip: "103.21.9.8", agent: "Mobile Safari", loc: "Ranchi, JH", ts: "2026-09-24 19:40 UTC", status: "FAILED", details: "Suspended credential presented" },
  { id: "ua4", user: "Smt. Ananya Deshmukh", action: "Award approval DSC-signed", ip: "10.244.4.12", agent: "Chrome 126 / Win11", loc: "Dadri, UP", ts: "2026-09-24 13:20 UTC", status: "SUCCESS", details: "NH-9 widening final approval" },
  { id: "ua5", user: "Shri R. K. Sharma", action: "MFA challenge issued", ip: "10.244.8.21", agent: "Chrome 126 / Win11", loc: "Varanasi, UP", ts: "2026-09-23 08:11 UTC", status: "CHALLENGED", details: "New device enrollment" },
];

const SETTING_FIELDS: { section: string; key: string; label: string; type: "text" | "number" | "checkbox" | "select"; options?: string[] }[] = [
  { section: "General", key: "platformTitle", label: "Platform Title", type: "text" },
  { section: "General", key: "environment", label: "Environment", type: "select", options: ["PRODUCTION", "STAGING", "SANDBOX"] },
  { section: "General", key: "timezone", label: "Primary Timezone", type: "text" },
  { section: "General", key: "supportEmail", label: "Support Email", type: "text" },
  { section: "Security", key: "enforceMfa", label: "Enforce MFA for all admins", type: "checkbox" },
  { section: "Security", key: "sessionTimeout", label: "Session Timeout (minutes)", type: "number" },
  { section: "Security", key: "maxFailed", label: "Max failed logins before lockout", type: "number" },
  { section: "Security", key: "ipWhitelist", label: "IP whitelist enabled (GovNIC VPN)", type: "checkbox" },
  { section: "Authentication", key: "sso", label: "SSO Provider", type: "select", options: ["JAN_PARICHAY", "NIC_SSO", "OIDC_ENTERPRISE"] },
  { section: "Authentication", key: "digilocker", label: "DigiLocker integration", type: "checkbox" },
  { section: "Authentication", key: "tokenHours", label: "Token expiry (hours)", type: "number" },
  { section: "Notifications", key: "emailAlerts", label: "Admin email alerts", type: "checkbox" },
  { section: "Notifications", key: "smsCritical", label: "SMS critical alerts", type: "checkbox" },
  { section: "Notifications", key: "recipients", label: "Alert recipients (CSV)", type: "text" },
  { section: "Documents", key: "maxUpload", label: "Global max upload (MB)", type: "number" },
  { section: "Documents", key: "virusScan", label: "Strict quarantine virus scan", type: "checkbox" },
  { section: "Documents", key: "archivalYears", label: "Auto-archival (years)", type: "number" },
  { section: "Audit", key: "logReads", label: "Log all admin reads", type: "checkbox" },
  { section: "Audit", key: "retentionDays", label: "Audit retention (days)", type: "number" },
  { section: "Audit", key: "govCloudExport", label: "Daily GovCloud export", type: "checkbox" },
  { section: "Maintenance", key: "maintMode", label: "Maintenance mode", type: "checkbox" },
  { section: "Maintenance", key: "maintWindow", label: "Scheduled window", type: "text" },
];

const INITIAL_SETTINGS: Record<string, string | number | boolean> = {
  platformTitle: "ZameenAI National Land Governance Platform", environment: "PRODUCTION",
  timezone: "Asia/Kolkata", supportEmail: "support-dilrmp@gov.in",
  enforceMfa: true, sessionTimeout: 20, maxFailed: 5, ipWhitelist: true,
  sso: "JAN_PARICHAY", digilocker: true, tokenHours: 8,
  emailAlerts: true, smsCritical: true, recipients: "sysadmin@nic.in, soc@cert-in.org.in",
  maxUpload: 150, virusScan: true, archivalYears: 12,
  logReads: false, retentionDays: 2555, govCloudExport: true,
  maintMode: false, maintWindow: "Sun 02:00–04:00 IST",
};

/* ================= SMALL BUILDING BLOCKS ================= */

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}
function TableShell({ children, minWidth = "min-w-[900px]" }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto"><table className={`w-full ${minWidth} text-left`}>{children}</table></div>;
}
function LabelSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-600">
        {options.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}
      </select>
    </label>
  );
}

function UserBadge({ status }: { status: UserStatus }) {
  const tone = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "SUSPENDED" ? "bg-red-50 text-red-700 border-red-200"
    : status === "PENDING_VERIFICATION" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  const label = status === "PENDING_VERIFICATION" ? "Pending" : status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

function HealthBadge({ status }: { status: string }) {
  const tone = status === "HEALTHY" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "DEGRADED" ? "bg-amber-50 text-amber-800 border-amber-200"
    : status === "DISABLED" ? "bg-slate-100 text-slate-500 border-slate-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${tone}`}><span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "HEALTHY" ? "animate-pulse" : ""}`} />{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

function SevBadge({ sev }: { sev: string }) {
  const tone = sev === "CRITICAL" ? "bg-red-100 text-red-800"
    : sev === "ERROR" || sev === "HIGH" ? "bg-orange-100 text-orange-800"
    : sev === "WARNING" || sev === "MEDIUM" ? "bg-amber-100 text-amber-800"
    : sev === "LOW" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600";
  return <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}>{sev}</span>;
}

function AccessBadge({ level, onClick }: { level: AccessLevel; onClick?: () => void }) {
  const tone = level === "ALLOWED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : level === "RESTRICTED" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-100 text-slate-400 border-slate-200";
  const label = level === "NOT_ALLOWED" ? "Denied" : level.charAt(0) + level.slice(1).toLowerCase();
  return (
    <button onClick={onClick} title={onClick ? "Click to cycle access level" : undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${tone} ${onClick ? "hover:ring-1 hover:ring-slate-300" : "cursor-default"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{label}
    </button>
  );
}

/* ================= MAIN ================= */

function AdminPortal() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [matrix, setMatrix] = useState(defaultMatrix());
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [matrixSaved, setMatrixSaved] = useState(false);
  const [departments, setDepartments] = useState(INITIAL_DEPTS);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [fRole, setFRole] = useState("ALL");
  const [fDept, setFDept] = useState("ALL");
  const [fState, setFState] = useState("ALL");
  const [fStatus, setFStatus] = useState("ALL");
  const [userPage, setUserPage] = useState(0);
  const [inspecting, setInspecting] = useState<AdminUser | null>(null);

  const [dState, setDState] = useState("All States");
  const [dPage, setDPage] = useState(0);

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", officialId: "", role: "LAO" as Role, status: "ACTIVE" as UserStatus, dept: INITIAL_DEPTS[0].id, state: "Uttar Pradesh", district: "Gautam Buddha Nagar", start: "2026-09-27", expiry: "2027-03-31", mfa: true });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const logAudit = (action: string, module: string, entity: string, severity: string, reason: string, result = "SUCCESS") => {
    setAuditLogs((prev) => [{
      id: `aud_${Date.now()}`, ts: "2026-09-27 11:30 UTC", user: ADMIN.name,
      action, module, entity, result, severity, reason,
    }, ...prev]);
  };

  const askConfirm = (req: ConfirmRequest) => {
    setConfirm(req);
    setConfirmReason("");
    setConfirmError("");
  };
  const doConfirm = () => {
    if (!confirm) return;
    if (confirm.requiresReason && !confirmReason.trim()) {
      setConfirmError("An administrative reason is mandatory for this operation under audit compliance.");
      return;
    }
    confirm.onConfirm(confirmReason);
    setConfirm(null);
  };

  const nav = (key: ViewKey) => () => {
    setView(key);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const unread = notifs.filter((n) => !n.read).length;

  /* ---------- derived ---------- */
  const filteredUsers = useMemo(() => users.filter((u) => {
    const x = query.trim().toLowerCase();
    const okQ = !x || `${u.fullName} ${u.email} ${u.officialId} ${u.phone}`.toLowerCase().includes(x);
    return okQ && (fRole === "ALL" || u.role === fRole) && (fDept === "ALL" || u.departmentId === fDept)
      && (fState === "ALL" || u.state === fState) && (fStatus === "ALL" || u.status === fStatus);
  }), [users, query, fRole, fDept, fState, fStatus]);
  const USER_PS = 8;
  const userPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PS));
  const userRows = filteredUsers.slice(userPage * USER_PS, userPage * USER_PS + USER_PS);

  const districtDir = useMemo(() => {
    const x = query.trim().toLowerCase();
    return ALL_DISTRICTS.filter(({ district, state }) =>
      (dState === "All States" || state === dState) && (!x || `${district} ${state}`.toLowerCase().includes(x)));
  }, [dState, query]);
  const D_PS = 25;
  const dPages = Math.max(1, Math.ceil(districtDir.length / D_PS));
  const dRows = districtDir.slice(dPage * D_PS, dPage * D_PS + D_PS);

  const auditRows = useMemo(() => {
    const x = query.trim().toLowerCase();
    if (!x) return auditLogs;
    return auditLogs.filter((l) => `${l.id} ${l.user} ${l.action} ${l.entity} ${l.reason}`.toLowerCase().includes(x));
  }, [auditLogs, query]);

  const cycleAccess = (role: Role, pid: string) => {
    const target = PERM_GROUPS.flatMap((g) => g.perms).find((p) => p.id === pid);
    const order: AccessLevel[] = ["ALLOWED", "RESTRICTED", "NOT_ALLOWED"];
    let blocked = false;
    setMatrix((prev) => {
      const cur = prev[role][pid];
      const next = order[(order.indexOf(cur) + 1) % order.length];
      if (role === "SYSTEM_ADMIN" && target?.operational && next === "ALLOWED") {
        blocked = true;
        return prev;
      }
      return { ...prev, [role]: { ...prev[role], [pid]: next } };
    });
    if (blocked) {
      showToast("Blocked: System Administrator cannot hold operational powers.");
      return;
    }
    setMatrixDirty(true);
    setMatrixSaved(false);
  };

  /* ---------- sidebar + crumbs ---------- */
  const sidebarGroups = [
    { title: "Platform Console", items: [
      { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: view === "dashboard", onClick: nav("dashboard") },
    ]},
    { title: "User Management", items: [
      { label: "All Users", icon: <Users size={16} />, active: view === "users", onClick: nav("users") },
      { label: "Add User", icon: <UserPlus size={16} />, active: view === "users-new", onClick: nav("users-new") },
      { label: "User Activity", icon: <Activity size={16} />, active: view === "user-activity", onClick: nav("user-activity") },
    ]},
    { title: "Access Control", items: [
      { label: "Roles", icon: <KeyRound size={16} />, active: view === "roles", onClick: nav("roles") },
      { label: "Permissions", icon: <FileCheck2 size={16} />, active: view === "permissions", onClick: nav("permissions") },
      { label: "Permission Matrix", icon: <TableProperties size={16} />, active: view === "permission-matrix", onClick: nav("permission-matrix") },
    ]},
    { title: "Organization", items: [
      { label: "Departments", icon: <Building2 size={16} />, active: view === "departments", onClick: nav("departments") },
      { label: "States", icon: <MapPin size={16} />, active: view === "states", onClick: nav("states") },
      { label: "Districts", icon: <MapPin size={16} />, active: view === "districts", onClick: nav("districts") },
      { label: "Jurisdictions", icon: <MapPin size={16} />, active: view === "jurisdictions", onClick: nav("jurisdictions") },
    ]},
    { title: "Platform Config", items: [
      { label: "Projects", icon: <FolderGit2 size={16} />, active: view === "projects", onClick: nav("projects") },
      { label: "Workflows", icon: <GitFork size={16} />, active: view === "workflows", onClick: nav("workflows") },
      { label: "Documents", icon: <FileText size={16} />, active: view === "documents", onClick: nav("documents") },
      { label: "Integrations", icon: <Boxes size={16} />, active: view === "integrations", onClick: nav("integrations") },
    ]},
    { title: "Governance & Health", items: [
      { label: "Audit Logs", icon: <ClipboardList size={16} />, active: view === "audit-logs", onClick: nav("audit-logs") },
      { label: "System Monitor", icon: <Server size={16} />, active: view === "system-monitor", onClick: nav("system-monitor") },
      { label: "Notifications", icon: <Bell size={16} />, badge: unread, active: view === "notifications", onClick: nav("notifications") },
      { label: "Settings", icon: <Sliders size={16} />, active: view === "settings", onClick: nav("settings") },
      { label: "Admin Profile", icon: <UserCircle size={16} />, active: view === "profile", onClick: nav("profile") },
    ]},
  ];

  const crumbs: Record<ViewKey, string[]> = {
    dashboard: ["Platform Console", "System Overview"],
    users: ["Platform Console", "User Directory"],
    "users-new": ["Platform Console", "User Directory", "Onboard Official"],
    "user-activity": ["Platform Console", "User Activity Log"],
    roles: ["Platform Console", "Access Control", "Configured Roles"],
    permissions: ["Platform Console", "Permissions Registry"],
    "permission-matrix": ["Platform Console", "Access Control", "RBAC Permission Matrix"],
    departments: ["Platform Console", "Organization Hierarchy"],
    states: ["Platform Console", "Organization", "States Catalog"],
    districts: ["Platform Console", "Organization", "Districts Catalog"],
    jurisdictions: ["Platform Console", "Organization", "Tehsil Jurisdictions"],
    projects: ["Platform Console", "Project Configuration"],
    workflows: ["Platform Console", "Workflow Configuration"],
    documents: ["Platform Console", "Document Repository"],
    integrations: ["Platform Console", "Integrations & External APIs"],
    "audit-logs": ["Platform Console", "Platform Audit Trail"],
    "system-monitor": ["Platform Console", "Infrastructure & System Monitor"],
    notifications: ["Platform Console", "System Alerts & Notifications"],
    settings: ["Platform Console", "Platform Settings & Governance"],
    profile: ["Platform Console", "System Administrator Profile"],
  };

  const submitNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full Name is required";
    if (!form.email.trim() || !form.email.includes("@")) errs.email = "Valid official email is required";
    if (!form.phone.trim()) errs.phone = "Contact number is required";
    if (!form.officialId.trim()) errs.officialId = "Employee / Official ID is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const dept = departments.find((d) => d.id === form.dept);
    askConfirm({
      title: "Confirm Official Onboarding",
      message: `Onboard ${form.fullName} with official role: ${form.role}?`,
      impactWarning: "An authorization record will be committed to the audit trail and credential activation dispatched via SMS/Email.",
      confirmButtonText: "Confirm & Provision User",
      dangerLevel: "primary",
      requiresReason: true,
      onConfirm: (reason) => {
        const id = `usr_${form.role.toLowerCase()}_${Date.now().toString().slice(-4)}`;
        setUsers((prev) => [{
          id, fullName: form.fullName, email: form.email, phone: form.phone, officialId: form.officialId,
          role: form.role, departmentId: form.dept, departmentName: dept?.name ?? "Revenue Department",
          state: form.state, district: form.district, status: form.status,
          lastLogin: "Never (Pending First Login)", createdAt: "2026-09-27",
          accessStartDate: form.start, accessExpiryDate: form.expiry, twoFactorEnabled: form.mfa,
        }, ...prev]);
        logAudit("USER_CREATED", "User Management", id, "HIGH", reason || `Provisioned ${form.fullName} as ${form.role}`);
        showToast(`Official account provisioned: ${form.fullName}`);
        setForm({ fullName: "", email: "", phone: "", officialId: "", role: "LAO", status: "ACTIVE", dept: INITIAL_DEPTS[0].id, state: "Uttar Pradesh", district: "Gautam Buddha Nagar", start: "2026-09-27", expiry: "2027-03-31", mfa: true });
        setView("users");
      },
    });
  };

  const exportAuditJson = () => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ZameenAI_AuditLogs_2026-09-27.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logAudit("AUDIT_LOG_EXPORTED", "Audit Log Access", "EXPORT_bundle", "MEDIUM", "Audit bundle exported by System Administrator");
    showToast("Audit bundle exported as JSON.");
  };

  const kpis = [
    { label: "Total Users", value: String(users.length), sub: "Directory catalog", to: "users" as ViewKey },
    { label: "Active Users", value: String(users.filter((u) => u.status === "ACTIVE").length), sub: "Active status", to: "users" as ViewKey },
    { label: "Suspended", value: String(users.filter((u) => u.status === "SUSPENDED").length), sub: "Access revoked", to: "users" as ViewKey },
    { label: "Roles", value: String(ROLES.length), sub: "Configured RBAC", to: "roles" as ViewKey },
    { label: "Departments", value: String(departments.length), sub: "State & Central", to: "departments" as ViewKey },
    { label: "Active Projects", value: String(projects.length), sub: "Configured pipelines", to: "projects" as ViewKey },
    { label: "Integrations", value: `${integrations.filter((i) => i.enabled).length}/${integrations.length}`, sub: "Live connectors", to: "integrations" as ViewKey },
    { label: "System Alerts", value: String(notifs.filter((n) => !n.read && n.sev !== "INFO").length), sub: "Action required", to: "notifications" as ViewKey },
  ];

  const setU = (id: string, status: UserStatus, verb: string) => {
    setUsers((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    const u = users.find((x) => x.id === id);
    logAudit(status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_ACTIVATED", "User Management", id, "HIGH", `${verb} ${u?.fullName ?? id}`);
    if (inspecting?.id === id) setInspecting({ ...inspecting, status });
  };

  return (
    <PortalLayout
      portalBadge="System Admin"
      portalSub="National Land Governance Platform · NIC / MeitY Nodal"
      userName={ADMIN.name}
      userInitials={ADMIN.initials}
      userRole="SYSTEM_ADMIN · Platform Control"
      activeContext="Production · NIC Cloud (ap-south-1)"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: ADMIN.designation,
        userLevelLabel: "ROLE: SYSTEM_ADMIN · Zero-Trust Isolation Active",
        jurisdiction: ADMIN.jurisdiction,
        orgProfileLabel: "Platform Settings",
        showOfficerProfileRow: true,
        officerProfileLabel: "Admin Profile & Credentials",
        onViewOfficerProfile: nav("profile"),
        onViewOrgProfile: nav("settings"),
        onResetDemo: () => {
          setUsers(INITIAL_USERS); setMatrix(defaultMatrix()); setMatrixDirty(false); setMatrixSaved(false);
          setDepartments(INITIAL_DEPTS); setProjects(INITIAL_PROJECTS); setWorkflows(INITIAL_WORKFLOWS);
          setIntegrations(INITIAL_INTEGRATIONS); setAuditLogs(INITIAL_AUDIT);
          setNotifs(INITIAL_NOTIFS); setSettings(INITIAL_SETTINGS);
          setView("dashboard"); window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: unread,
        onNotificationClick: nav("notifications"),
      }}
      topActions={
        <>
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-500 xl:inline-flex">
            <ShieldCheck size={13} className="text-emerald-600" /> SECURE_GOVCLOUD_NODE_01 [PROD]
          </span>
          <button onClick={nav("users-new")} className="hidden items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 lg:inline-flex">
            <Plus size={14} /> Provision Official
          </button>
        </>
      }
    >
      {/* Breadcrumbs */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {crumbs[view].map((b, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={i === arr.length - 1 ? "font-semibold text-slate-800" : ""}>{b}</span>
          </span>
        ))}
        <span className="ml-auto hidden font-mono text-[11px] text-slate-400 sm:block">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ZameenAI Core: v4.2.0-rc2
        </span>
      </nav>

      {/* ================= DASHBOARD ================= */}
      {view === "dashboard" && (
        <>
          <GreetingHeader
            eyebrow="Platform Control Mode • NIC / MeitY"
            title="System Administration Console"
            subtitle="Global governance of authentication, roles, workflows, integrations, and infrastructure telemetry."
            actions={
              <>
                <button onClick={nav("system-monitor")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">Live Telemetry</button>
                <button onClick={nav("users-new")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">+ Provision Official</button>
              </>
            }
          />
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <button key={k.label} onClick={nav(k.to)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
                <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{k.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{k.sub}</p>
              </button>
            ))}
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
            <PortalCard className="!p-0">
              <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-sm font-bold text-[#0B1F44]">Platform Infrastructure & Service Health</h2><p className="text-[11px] text-slate-500">Continuous heartbeat status of core microservices</p></div>
                <button onClick={nav("system-monitor")} className="w-fit text-xs font-bold text-emerald-700">Full Diagnostics →</button>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                {INITIAL_SERVICES.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 p-3.5 hover:border-slate-300">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{s.name}</p><p className="truncate font-mono text-[10px] text-slate-400">{s.endpoint}</p></div>
                      <HealthBadge status={s.status} />
                    </div>
                    <div className="mt-2.5 flex justify-between border-t border-slate-100 pt-2 font-mono text-[10px] text-slate-500">
                      <span>Latency: <b className="text-slate-700">{s.lat}ms</b></span>
                      <span>Uptime: <b className="text-emerald-700">{s.up}%</b></span>
                      <span>Errors: <b className="text-slate-700">{s.err}%</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </PortalCard>

            <PortalCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0B1F44]">Active Security & Platform Alerts</h2>
                <span className="font-mono text-[10px] text-slate-400">Live Guard</span>
              </div>
              <div className="space-y-2.5">
                {notifs.slice(0, 4).map((n) => (
                  <div key={n.id} className={`rounded-xl border p-3 ${n.sev === "CRITICAL" || n.sev === "ERROR" ? "border-red-200 bg-red-50/50" : n.sev === "WARNING" ? "border-amber-200 bg-amber-50/50" : "border-slate-200"}`}>
                    <p className="flex items-center justify-between gap-2"><SevBadge sev={n.sev} /><span className="font-mono text-[10px] text-slate-400">{n.ts.split(" ")[0]}</span></p>
                    <p className="mt-1.5 text-xs font-bold text-slate-800">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{n.desc}</p>
                  </div>
                ))}
              </div>
            </PortalCard>
          </div>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-bold text-[#0B1F44]">Recent Administrative Governance Activity</h2><p className="text-[11px] text-slate-500">Tamper-evident log of platform and policy modifications</p></div>
              <button onClick={nav("audit-logs")} className="w-fit text-xs font-bold text-emerald-700">Open Audit Trail →</button>
            </div>
            <TableShell minWidth="min-w-[900px]">
              <thead><tr><Th>Timestamp (UTC)</Th><Th>Administrator</Th><Th>Action</Th><Th>Module</Th><Th>Target Entity</Th><Th>Result</Th><Th>Reason / Details</Th></tr></thead>
              <tbody>
                {auditLogs.slice(0, 5).map((l) => (
                  <tr key={l.id} className="hover:bg-emerald-50/40">
                    <Td className="whitespace-nowrap font-mono text-slate-500">{l.ts}</Td>
                    <Td className="whitespace-nowrap font-semibold text-slate-800">{l.user}</Td>
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{l.action}</Td>
                    <Td className="text-slate-500">{l.module}</Td>
                    <Td className="font-mono text-slate-600">{l.entity}</Td>
                    <Td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${l.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{l.result}</span></Td>
                    <Td className="max-w-[240px] truncate text-slate-500">{l.reason}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= USERS ================= */}
      {view === "users" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">User Management Directory <span className="ml-1 rounded-md bg-slate-100 px-2 py-0.5 align-middle font-mono text-xs font-bold text-slate-600">{filteredUsers.length} Officials</span></h1>
              <p className="mt-1 text-sm text-slate-500">Administer platform credentials, designated roles, state jurisdictions, and security states.</p>
            </div>
            <button onClick={nav("users-new")} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><UserPlus size={14} /> Add Official</button>
          </div>

          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setUserPage(0); }} placeholder="Search by name, email, official ID, phone…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <LabelSelect label="Role" value={fRole} onChange={(v) => { setFRole(v); setUserPage(0); }} options={[{ v: "ALL", l: "All Roles" }, ...ROLES.map((r) => ({ v: r.id, l: r.id }))]} />
              <LabelSelect label="Department" value={fDept} onChange={(v) => { setFDept(v); setUserPage(0); }} options={[{ v: "ALL", l: "All Departments" }, ...departments.map((d) => ({ v: d.id, l: d.name }))]} />
              <LabelSelect label="State" value={fState} onChange={(v) => { setFState(v); setUserPage(0); }} options={[{ v: "ALL", l: "All States" }, { v: "Central", l: "Central / Statewide" }, ...INDIA_STATES.map((s) => ({ v: s.name, l: s.name }))]} />
              <LabelSelect label="Status" value={fStatus} onChange={(v) => { setFStatus(v); setUserPage(0); }} options={["ALL", "ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "INACTIVE"].map((s) => ({ v: s, l: s === "ALL" ? "All Statuses" : s }))} />
            </div>
            {(query || fRole !== "ALL" || fDept !== "ALL" || fState !== "ALL" || fStatus !== "ALL") && (
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span>Filtered results: {filteredUsers.length} of {users.length} users</span>
                <button onClick={() => { setQuery(""); setFRole("ALL"); setFDept("ALL"); setFState("ALL"); setFStatus("ALL"); setUserPage(0); }} className="inline-flex items-center gap-1 font-bold text-emerald-700"><RotateCcw size={12} /> Reset all filters</button>
              </div>
            )}
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <div className="hidden lg:block">
              <TableShell minWidth="min-w-[1000px]">
                <thead><tr><Th>Official / Name</Th><Th>Role</Th><Th>Department</Th><Th>Jurisdiction</Th><Th>Status</Th><Th>Last Login (UTC)</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody>
                  {userRows.map((u) => (
                    <tr key={u.id} className="hover:bg-emerald-50/40">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">{u.fullName.slice(0, 2).toUpperCase()}</span>
                          <span><span className="block font-bold text-slate-800">{u.fullName}</span><span className="block font-mono text-[10px] text-slate-400">{u.email}</span><span className="block font-mono text-[10px] text-emerald-700">{u.officialId}</span></span>
                        </div>
                      </Td>
                      <Td><span className="whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{u.role}</span></Td>
                      <Td><p className="max-w-[190px] truncate font-medium text-slate-700">{u.departmentName}</p><p className="font-mono text-[10px] text-slate-400">{u.phone}</p></Td>
                      <Td><p className="text-slate-600">{u.state}</p><p className="text-[11px] text-slate-400">{u.district}</p></Td>
                      <Td><UserBadge status={u.status} /></Td>
                      <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{u.lastLogin}</Td>
                      <Td>
                        <span className="flex justify-end gap-1">
                          <button onClick={() => setInspecting(u)} title="View profile" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye size={15} /></button>
                          <button onClick={() => askConfirm({ title: "Issue Mandatory Credential & MFA Reset", message: `Dispatch secure credential reset challenge to ${u.email}?`, impactWarning: "All active sessions across devices will be invalidated immediately.", confirmButtonText: "Dispatch Reset", dangerLevel: "warning", requiresReason: true, onConfirm: (reason) => { logAudit("USER_CREDENTIAL_CHALLENGE_ISSUED", "User Management", u.id, "HIGH", reason || `MFA reset for ${u.fullName}`); showToast(`Credential reset dispatched to ${u.email}`); } })} title="Reset MFA & credentials" className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"><KeyRound size={15} /></button>
                          {u.status === "ACTIVE" ? (
                            <button onClick={() => askConfirm({ title: "Suspend Official Account Access", message: `Suspend access for ${u.fullName} (${u.officialId})?`, impactWarning: "The official will be immediately locked out of all operational portals, APIs, and mobile kits.", confirmButtonText: "Confirm Suspension", dangerLevel: "danger", requiresReason: true, onConfirm: (reason) => { setU(u.id, "SUSPENDED", "Suspended"); logAudit("USER_SUSPENDED", "User Management", u.id, "HIGH", reason || `Suspended ${u.fullName}`); showToast(`${u.fullName} suspended.`); } })} title="Suspend account" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><XCircle size={15} /></button>
                          ) : (
                            <button onClick={() => askConfirm({ title: "Reinstate User Account Access", message: `Reinstate active platform privileges for ${u.fullName}?`, impactWarning: "User will regain access according to their configured RBAC role permissions.", confirmButtonText: "Activate Account", dangerLevel: "warning", requiresReason: true, onConfirm: (reason) => { setU(u.id, "ACTIVE", "Reinstated"); logAudit("USER_ACTIVATED", "User Management", u.id, "HIGH", reason || `Reinstated ${u.fullName}`); showToast(`${u.fullName} reinstated.`); } })} title="Reinstate account" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle size={15} /></button>
                          )}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
            <div className="space-y-3 p-4 lg:hidden">
              {userRows.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">{u.fullName}</p>
                    <UserBadge status={u.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">{u.officialId} · {u.role}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{u.departmentName} · {u.state} / {u.district}</p>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => setInspecting(u)} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">Inspect</button>
                    {u.status === "ACTIVE"
                      ? <button onClick={() => { setU(u.id, "SUSPENDED", "Suspended"); logAudit("USER_SUSPENDED", "User Management", u.id, "HIGH", `Suspended ${u.fullName}`); }} className="flex-1 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-700">Suspend</button>
                      : <button onClick={() => { setU(u.id, "ACTIVE", "Reinstated"); logAudit("USER_ACTIVATED", "User Management", u.id, "HIGH", `Reinstated ${u.fullName}`); }} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white">Activate</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>Page <b className="text-slate-800">{userPage + 1}</b> of <b className="text-slate-800">{userPages}</b></span>
              <span className="flex gap-1.5">
                <button disabled={userPage === 0} onClick={() => setUserPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40">Previous</button>
                <button disabled={userPage + 1 >= userPages} onClick={() => setUserPage((p) => Math.min(userPages - 1, p + 1))} className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40">Next</button>
              </span>
            </div>
          </PortalCard>

          {inspecting && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" onClick={() => setInspecting(null)}>
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-base font-black text-white">{inspecting.fullName.slice(0, 2).toUpperCase()}</span>
                    <div><h3 className="text-base font-black text-slate-900">{inspecting.fullName}</h3><p className="font-mono text-xs text-emerald-700">{inspecting.officialId}</p></div>
                  </div>
                  <button onClick={() => setInspecting(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs sm:grid-cols-3">
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Designated Role</p><p className="mt-0.5 font-mono font-bold text-slate-800">{inspecting.role}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Account Status</p><span className="mt-0.5 inline-block"><UserBadge status={inspecting.status} /></span></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Two-Factor MFA</p><p className="mt-0.5 font-semibold text-emerald-700">{inspecting.twoFactorEnabled ? "Hardware / OTP Enforced" : "Disabled"}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Email</p><p className="mt-0.5 break-all font-mono text-[11px] text-slate-700">{inspecting.email}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Phone</p><p className="mt-0.5 font-mono text-slate-700">{inspecting.phone}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Department ID</p><p className="mt-0.5 font-mono text-slate-700">{inspecting.departmentId}</p></div>
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 p-3.5 text-xs">
                  <p className="flex items-center gap-1.5 font-bold text-slate-800"><Building size={13} className="text-slate-400" /> Department & Jurisdiction Boundary</p>
                  <p className="mt-1 font-semibold text-slate-700">{inspecting.departmentName}</p>
                  <p className="font-mono text-[11px] text-slate-500">State: {inspecting.state} | District: {inspecting.district}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs">
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Access Start</p><p className="font-mono font-semibold">{inspecting.accessStartDate}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Access Expiry</p><p className="font-mono font-semibold text-amber-700">{inspecting.accessExpiryDate}</p></div>
                </div>
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500"><b className="text-slate-700">Role Boundary Confirmation:</b> This user operates within the scoped capabilities of <b>{inspecting.role}</b>. System Administrator oversees account lifecycle, but cannot perform operational approvals on their behalf.</p>
                <div className="mt-4 flex justify-end"><button onClick={() => setInspecting(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Close</button></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= ADD USER ================= */}
      {view === "users-new" && (
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
            <button onClick={nav("users")} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"><ArrowLeft size={15} /></button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Provision Official User Account</h1>
              <p className="text-xs text-slate-500">Bind government official credentials to designated RBAC role and state jurisdiction</p>
            </div>
          </div>

          <form onSubmit={submitNewUser} className="space-y-4">
            <PortalCard>
              <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">1. Official Identity & Credentials</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Full Name & Title <span className="text-red-500">*</span></label>
                  <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Ramesh Chandra Sharma, PCS" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  {formErrors.fullName && <p className="mt-1 text-[11px] text-red-600">{formErrors.fullName}</p>}</div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Official Government Email <span className="text-red-500">*</span></label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. ramesh.sharma@gov.in" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  {formErrors.email && <p className="mt-1 text-[11px] text-red-600">{formErrors.email}</p>}</div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Official Mobile (DLT Registered) <span className="text-red-500">*</span></label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  {formErrors.phone && <p className="mt-1 text-[11px] text-red-600">{formErrors.phone}</p>}</div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Employee / Official ID <span className="text-red-500">*</span></label>
                  <input value={form.officialId} onChange={(e) => setForm({ ...form, officialId: e.target.value })} placeholder="e.g. UP-PCS-LAO-882" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  {formErrors.officialId && <p className="mt-1 text-[11px] text-red-600">{formErrors.officialId}</p>}</div>
              </div>
            </PortalCard>

            <PortalCard>
              <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">2. Designated Role & Security Scope</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Designated System Role <span className="text-red-500">*</span></label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-600">
                    <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (Platform Control & Governance)</option>
                    <option value="PIA">PIA (Project Implementing Agency)</option>
                    <option value="FIELD_OFFICER">FIELD_OFFICER (Ground Verification Officer)</option>
                    <option value="LAO">LAO (Land Acquisition Officer - Desk Validator)</option>
                    <option value="APPROVER">APPROVER (Acquisition Approver - CALA / DM)</option>
                    <option value="EXECUTIVE">EXECUTIVE (Department Head / Principal Secretary)</option>
                    <option value="CITIZEN">CITIZEN (Landowner Portal Access)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">Roles are strictly controlled by the system RBAC policy. Arbitrary titles are banned.</p></div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Initial Account Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600">
                    <option value="ACTIVE">Active (Provision Immediate Access)</option>
                    <option value="PENDING_VERIFICATION">Pending Verification (Wait for nodal sign-off)</option>
                    <option value="INACTIVE">Inactive (Staged account)</option>
                  </select></div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={form.mfa} onChange={(e) => setForm({ ...form, mfa: e.target.checked })} className="h-3.5 w-3.5 accent-emerald-700" />
                Enforce Multi-Factor Authentication (MFA / Jan Parichay OTP)
              </label>
            </PortalCard>

            <PortalCard>
              <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">3. Department & Jurisdiction Assignment</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Department / Authority <span className="text-red-500">*</span></label>
                  <select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600">
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select></div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">State Location</label>
                  <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, district: "Statewide / HQ" })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600">
                    <option value="Central">Central (National Scope)</option>
                    {INDIA_STATES.map((s) => (<option key={s.code} value={s.name}>{s.name}</option>))}
                  </select></div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">District Jurisdiction</label>
                  <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600">
                    <option value="Statewide / HQ">Statewide / HQ</option>
                    {(form.state === "Central" ? [] : (INDIA_DISTRICTS[form.state] ?? [])).map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select></div>
              </div>
            </PortalCard>

            <PortalCard>
              <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">4. Access Validity & Lifecycle Bounds</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Access Start Date</label>
                  <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-600" /></div>
                <div><label className="mb-1 block text-xs font-bold text-slate-600">Access Expiry Date (Contractual / Deputation Bound)</label>
                  <input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-600" />
                  <p className="mt-1 text-[11px] text-slate-400">System will automatically suspend access upon reaching the expiry date.</p></div>
              </div>
            </PortalCard>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={nav("users")} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><CheckCircle2 size={14} /> Provision Official Account</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= USER ACTIVITY ================= */}
      {view === "user-activity" && (
        <>
          <GreetingHeader
            eyebrow="Identity Telemetry • Jan Parichay Bridge"
            title="User Activity Log"
            subtitle="Authentication, authorization and session telemetry across all operational portals."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[960px]">
              <thead><tr><Th>Officer</Th><Th>Action</Th><Th>IP Address</Th><Th>Device</Th><Th>Location</Th><Th>Timestamp</Th><Th>Status</Th><Th>Details</Th></tr></thead>
              <tbody>
                {INITIAL_ACTIVITIES.map((a) => (
                  <tr key={a.id} className="hover:bg-emerald-50/40">
                    <Td className="font-bold text-slate-800">{a.user}</Td>
                    <Td className="text-slate-600">{a.action}</Td>
                    <Td className="font-mono text-slate-500">{a.ip}</Td>
                    <Td className="text-slate-500">{a.agent}</Td>
                    <Td className="text-slate-500">{a.loc}</Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{a.ts}</Td>
                    <Td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${a.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : a.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{a.status}</span></Td>
                    <Td className="max-w-[220px] truncate text-slate-500">{a.details}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= ROLES ================= */}
      {view === "roles" && (
        <>
          <GreetingHeader
            eyebrow="Access Control • 7 System Roles"
            title="Configured Roles Catalog"
            subtitle="Statutory role boundaries. SYSTEM_ADMIN is locked out of operational powers by design."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ROLES.map((r) => (
              <PortalCard key={r.id} className={r.locked ? "!border-emerald-300" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{r.id}</span>
                  {r.locked
                    ? <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"><Lock size={11} /> SYSTEM_LOCKED</span>
                    : <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.operational ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{r.operational ? "OPERATIONAL" : "GOVERNANCE"}</span>}
                </div>
                <p className="mt-2 text-sm font-black text-slate-900">{r.name}</p>
                <p className="mt-1 min-h-[36px] text-[11px] leading-relaxed text-slate-500">{r.desc}</p>
                <p className="mt-2 border-t border-slate-100 pt-2 font-mono text-[11px] text-slate-500">{r.users} officials · {ALL_PERM_IDS.filter((p) => defaultMatrix()[r.id][p] === "ALLOWED").length} allowed powers</p>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= PERMISSIONS ================= */}
      {view === "permissions" && (
        <>
          <GreetingHeader
            eyebrow="Access Control • Capability Registry"
            title="Permissions Registry"
            subtitle="Every grantable capability. Operational powers are sealed from governance roles."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PERM_GROUPS.map((g) => (
              <PortalCard key={g.group} className="!p-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">{g.group} <span className="ml-1 font-mono font-medium normal-case text-slate-400">({g.perms.length})</span></h2>
                <div className="mt-2.5 space-y-1.5">
                  {g.perms.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2">
                      <span><span className="block font-mono text-[11px] font-bold text-slate-800">{p.code}</span><span className="block text-[11px] text-slate-500">{p.name}</span></span>
                      {p.operational
                        ? <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">OPERATIONAL</span>
                        : <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-500">GOVERNANCE</span>}
                    </div>
                  ))}
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= PERMISSION MATRIX ================= */}
      {view === "permission-matrix" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">RBAC Permission Matrix</h1>
              <p className="mt-1 text-sm text-slate-500">Click any cell to cycle Allowed → Restricted → Denied. Changes stage in-memory until saved.</p>
            </div>
            <div className="flex items-center gap-2">
              {matrixDirty && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-800"><AlertTriangle size={13} /> Unsaved changes</span>}
              {matrixSaved && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={13} /> Saved to ledger</span>}
              <button onClick={() => askConfirm({ title: "Commit RBAC Matrix to Audit Ledger", message: "Persist all staged permission changes as the enforced platform policy?", impactWarning: "This rewrites authorization checks across all portals on next token refresh.", confirmButtonText: "Save Matrix", dangerLevel: "warning", requiresReason: true, onConfirm: (reason) => { setMatrixDirty(false); setMatrixSaved(true); logAudit("PERMISSION_MATRIX_UPDATED", "Role & Permissions", "RBAC_CORE_MATRIX", "CRITICAL", reason || "Committed RBAC matrix updates"); showToast("Permission matrix saved to audit ledger."); } })} disabled={!matrixDirty} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"><Save size={14} /> Save Matrix</button>
            </div>
          </div>
          <PortalCard className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <Th className="min-w-[220px]">Permission</Th>
                    {ROLES.map((r) => (<th key={r.id} className="min-w-[110px] border-l border-slate-200 px-2 py-2 text-center font-mono text-[9px] font-black text-slate-600">{r.id}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {PERM_GROUPS.map((g) => (
                    <>
                      <tr key={g.group}><td colSpan={ROLES.length + 1} className="border-t border-slate-200 bg-slate-50/70 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">{g.group}</td></tr>
                      {g.perms.map((p) => (
                        <tr key={p.id} className="hover:bg-emerald-50/30">
                          <Td><p className="font-mono text-[11px] font-bold text-slate-800">{p.code} {p.operational && <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[8px] font-black text-amber-800">OP</span>}</p><p className="text-[10px] text-slate-400">{p.name}</p></Td>
                          {ROLES.map((r) => (
                            <td key={r.id} className="border-l border-slate-100 px-2 py-2 text-center">
                              <AccessBadge level={matrix[r.id][p.id]} onClick={() => cycleAccess(r.id, p.id)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </PortalCard>
          <p className="mt-2 text-[11px] text-slate-500">Guardrail: SYSTEM_ADMIN + operational power → ALLOWED is rejected and logged. Matrix saves are CRITICAL audit events.</p>
        </>
      )}

      {/* ================= DEPARTMENTS ================= */}
      {view === "departments" && (
        <>
          <GreetingHeader
            eyebrow="Organization Hierarchy • Revenue & Line Departments"
            title="Departments Directory"
            subtitle="Administrative departments bound to jurisdictions, officials and project pipelines."
          />
          <PortalCard className="!p-4">
            <p className="mb-2 text-xs font-bold text-slate-700">Register New Department</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
              <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Department name, e.g. Tehsil Revenue Office, Sadar" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
              <input value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="Code, e.g. UP-REV-SDR" className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
              <button onClick={() => {
                if (!deptName.trim()) { showToast("Department name is required."); return; }
                const id = `dept_${Date.now().toString().slice(-4)}`;
                setDepartments((p) => [...p, { id, name: deptName.trim(), code: deptCode.trim() || id.toUpperCase(), state: "—", district: "—", head: "—", users: 0, projects: 0, status: "ACTIVE", category: "REVENUE" }]);
                logAudit("DEPARTMENT_CREATED", "Department Config", id, "MEDIUM", `Registered department: ${deptName.trim()}`);
                setDeptName(""); setDeptCode(""); showToast("Department registered.");
              }} className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Plus size={13} /> Register</button>
            </div>
          </PortalCard>
          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[900px]">
              <thead><tr><Th>Department</Th><Th>Code</Th><Th>State / District</Th><Th>Head Official</Th><Th className="text-center">Users</Th><Th className="text-center">Projects</Th><Th>Category</Th><Th>Status</Th></tr></thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-emerald-50/40">
                    <Td className="font-bold text-slate-800">{d.name}</Td>
                    <Td className="font-mono text-slate-500">{d.code}</Td>
                    <Td className="text-slate-600">{d.state} / {d.district}</Td>
                    <Td className="text-slate-600">{d.head}</Td>
                    <Td className="text-center font-mono">{d.users}</Td>
                    <Td className="text-center font-mono">{d.projects}</Td>
                    <Td><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">{d.category}</span></Td>
                    <Td><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{d.status}</span></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= STATES ================= */}
      {view === "states" && (
        <>
          <GreetingHeader
            eyebrow="Organization • All-India Directory"
            title={`States & UTs Catalog (${INDIA_STATES.length})`}
            subtitle="Every State and Union Territory addressable by the platform. Shared with the Executive DSS directory."
          />
          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search State / UT…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </PortalCard>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {INDIA_STATES.filter((s) => !query.trim() || s.name.toLowerCase().includes(query.toLowerCase())).map((s) => (
              <div key={s.code} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 font-mono text-[11px] font-black text-amber-400">{s.code}</span>
                  <div><p className="text-[13px] font-bold text-slate-800">{s.name}</p><p className="text-[11px] text-slate-400">{(INDIA_DISTRICTS[s.name] ?? []).length} districts · {s.type}</p></div>
                </div>
                <button onClick={() => { setDState(s.name); setDPage(0); setView("districts"); }} className="shrink-0 text-[11px] font-bold text-emerald-700">Districts →</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= DISTRICTS ================= */}
      {view === "districts" && (
        <>
          <GreetingHeader
            eyebrow="Organization • District Revenue Units"
            title={`Districts Catalog (${ALL_DISTRICTS.length})`}
            subtitle="Complete all-India district directory with state filter, search and pagination."
          />
          <PortalCard className="!p-0">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
              <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 sm:w-64">
                <span className="truncate">{dState === "All States" ? "All States" : dState}</span>
                <select value={dState} onChange={(e) => { setDState(e.target.value); setDPage(0); }} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter districts by State">
                  <option value="All States">All States</option>
                  {INDIA_STATES.map((s) => (<option key={s.code} value={s.name}>{s.name}</option>))}
                </select>
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                <Search size={14} className="text-slate-400" />
                <input value={query} onChange={(e) => { setQuery(e.target.value); setDPage(0); }} placeholder="Search District…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <p className="border-b border-slate-100 px-4 py-2 font-mono text-[11px] text-slate-500">Showing {dRows.length} of {districtDir.length} districts · Page {dPage + 1} of {dPages}</p>
            <TableShell minWidth="min-w-[640px]">
              <thead><tr><Th>District</Th><Th>State / UT</Th><Th className="text-right">Jurisdiction Status</Th></tr></thead>
              <tbody>
                {dRows.map(({ district, state }) => (
                  <tr key={`${state}|${district}`} className="hover:bg-emerald-50/40">
                    <Td className="font-bold text-slate-800">{district}</Td>
                    <Td className="text-slate-500">{state}</Td>
                    <Td className="text-right"><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">ACTIVE</span></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>Page <b className="text-slate-800">{dPage + 1}</b> of <b className="text-slate-800">{dPages}</b></span>
              <span className="flex gap-1.5">
                <button disabled={dPage === 0} onClick={() => setDPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40">Previous</button>
                <button disabled={dPage + 1 >= dPages} onClick={() => setDPage((p) => Math.min(dPages - 1, p + 1))} className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40">Next</button>
              </span>
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= JURISDICTIONS ================= */}
      {view === "jurisdictions" && (
        <>
          <GreetingHeader
            eyebrow="Organization • Tehsil / Taluk Mapping"
            title="Tehsil Jurisdictions"
            subtitle="Village panchayat counts bound to responsible departments."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[860px]">
              <thead><tr><Th>Tehsil / Taluk</Th><Th>District</Th><Th>State</Th><Th className="text-center">Villages</Th><Th>Assigned Department</Th><Th>Status</Th></tr></thead>
              <tbody>
                {INITIAL_JURISDICTIONS.map((j) => (
                  <tr key={j.id} className="hover:bg-emerald-50/40">
                    <Td className="font-bold text-slate-800">{j.tehsil}</Td>
                    <Td className="text-slate-600">{j.district}</Td>
                    <Td className="text-slate-600">{j.state}</Td>
                    <Td className="text-center font-mono">{j.villages}</Td>
                    <Td className="max-w-[240px] truncate text-slate-600">{j.dept}</Td>
                    <Td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${j.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{j.status.replace("_", " ")}</span></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= PROJECTS ================= */}
      {view === "projects" && (
        <>
          <GreetingHeader
            eyebrow="Platform Config • Acquisition Pipelines"
            title="Project Configuration"
            subtitle="Project dossiers bound to departments, workflows and document requirements."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[960px]">
              <thead><tr><Th>Project ID</Th><Th>Project Name</Th><Th>Department</Th><Th>State / District</Th><Th>Type</Th><Th>Workflow</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-emerald-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{p.id}</Td>
                    <Td className="max-w-[220px] font-semibold text-slate-800">{p.name}</Td>
                    <Td className="max-w-[200px] truncate text-slate-500">{p.dept}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{p.state} / {p.district}</Td>
                    <Td><span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">{p.type}</span></Td>
                    <Td className="whitespace-nowrap text-slate-500">{p.workflow}</Td>
                    <Td><span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${p.status === "ACTIVE_PIPELINE" ? "bg-emerald-50 text-emerald-700" : p.status === "DRAFT" ? "bg-slate-100 text-slate-500" : p.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{p.status.replace("_", " ")}</span></Td>
                    <Td className="text-right">
                      <button onClick={() => {
                        const order = ["DRAFT", "CONFIGURED", "ACTIVE_PIPELINE", "SUSPENDED"];
                        const next = order[(order.indexOf(p.status) + 1) % order.length];
                        setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
                        logAudit("PROJECT_CONFIG_MODIFIED", "Project Config", p.id, "MEDIUM", `Status ${p.status} → ${next}`);
                        showToast(`${p.id} moved to ${next.replace("_", " ")}.`);
                      }} className="whitespace-nowrap text-[11px] font-bold text-emerald-700">Advance State</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= WORKFLOWS ================= */}
      {view === "workflows" && (
        <>
          <GreetingHeader
            eyebrow="Platform Config • SLA-Gated Pipelines"
            title="Workflow Configuration"
            subtitle="Stage toggles and SLA bounds. Disabling a stage reroutes cases to manual review."
          />
          <div className="space-y-4">
            {workflows.map((w) => (
              <PortalCard key={w.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div><h2 className="text-sm font-black text-[#0B1F44]">{w.name} <span className="ml-1 font-mono text-[10px] font-medium text-slate-400">{w.version}</span></h2>
                    <p className="font-mono text-[10px] text-slate-400">{w.category} · Updated {w.updated}</p></div>
                  <span className="w-fit rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{w.status}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {w.stages.map((s) => (
                    <div key={s.id} className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center ${s.enabled ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-black ${s.enabled ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-500"}`}>{s.n}</span>
                      <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">{s.name}</p><p className="font-mono text-[10px] text-slate-400">{s.role} · SLA {s.sla}h</p></div>
                      <button onClick={() => {
                        setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, stages: x.stages.map((t) => t.id === s.id ? { ...t, enabled: !t.enabled } : t) } : x));
                        logAudit("WORKFLOW_STAGE_TOGGLED", "Workflow Config", s.id, "HIGH", `Stage ${s.name} → ${s.enabled ? "DISABLED" : "ENABLED"} in ${w.name}`);
                        showToast(`${s.name} ${s.enabled ? "disabled" : "enabled"}.`);
                      }} className={`relative h-5 w-9 shrink-0 rounded-full transition ${s.enabled ? "bg-emerald-600" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${s.enabled ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= DOCUMENTS ================= */}
      {view === "documents" && (
        <>
          <GreetingHeader
            eyebrow="Platform Config • Retention & Legal Archival"
            title="Document Repository Categories"
            subtitle="Category schemas: formats, size caps, retention, versioning and access policy."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[1000px]">
              <thead><tr><Th>Category</Th><Th>Code</Th><Th>Formats</Th><Th className="text-right">Max MB</Th><Th className="text-right">Retention (yrs)</Th><Th>Versioning</Th><Th>Access</Th><Th className="text-right">Stored</Th><Th className="text-right">Size (GB)</Th></tr></thead>
              <tbody>
                {DOC_CATS.map((d) => (
                  <tr key={d.code} className="hover:bg-emerald-50/40">
                    <Td className="font-bold text-slate-800">{d.name} {d.permanent && <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[9px] font-black text-amber-800">PERMANENT</span>}</Td>
                    <Td className="font-mono text-slate-500">{d.code}</Td>
                    <Td className="text-slate-500">{d.formats}</Td>
                    <Td className="text-right font-mono">{d.size}</Td>
                    <Td className="text-right font-mono">{d.retention}</Td>
                    <Td className="font-mono text-[11px] text-slate-500">{d.versioning}</Td>
                    <Td><span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${d.access === "CONFIDENTIAL" ? "bg-red-50 text-red-700" : d.access === "PUBLIC_FACING" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{d.access}</span></Td>
                    <Td className="text-right font-mono">{d.stored.toLocaleString("en-IN")}</Td>
                    <Td className="text-right font-mono">{d.gb.toLocaleString("en-IN")}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= INTEGRATIONS ================= */}
      {view === "integrations" && (
        <>
          <GreetingHeader
            eyebrow="Platform Config • External APIs"
            title="Integrations & External APIs"
            subtitle="Credential health, endpoint latency and enablement. Probes are audit-logged."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {integrations.map((g) => (
              <PortalCard key={g.id} className={!g.enabled ? "opacity-75" : ""}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-black text-slate-900">{g.name}</p><p className="font-mono text-[10px] text-slate-400">{g.type} · {g.provider} · {g.ver}</p></div>
                  <HealthBadge status={g.enabled ? g.status : "DISABLED"} />
                </div>
                <p className="mt-1.5 truncate font-mono text-[11px] text-slate-500">{g.endpoint}</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 font-mono text-[10px]">
                  <span><span className="block font-sans text-slate-400">Latency</span><b className={g.latency > 500 ? "text-amber-700" : "text-slate-800"}>{g.latency}ms</b></span>
                  <span><span className="block font-sans text-slate-400">Auth</span><b className={g.auth === "VALID_CREDENTIAL" ? "text-emerald-700" : "text-amber-700"}>{g.auth.replace(/_/g, " ")}</b></span>
                  <span><span className="block font-sans text-slate-400">Key</span><b className="text-slate-700">{g.key}</b></span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{g.notes} · Last sync {g.sync}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => {
                    const lat = 40 + Math.floor(Math.random() * 90);
                    const ok = g.status !== "UNAVAILABLE";
                    setIntegrations((prev) => prev.map((x) => x.id === g.id ? { ...x, latency: lat, sync: "2026-09-27 11:30 UTC" } : x));
                    logAudit("INTEGRATION_PROBE_DIAGNOSTIC", "Integrations", g.id, "MEDIUM", `Diagnostic ping → HTTP ${ok ? "200 OK" : "503"} in ${lat}ms`);
                    showToast(ok ? `Probe OK: TLS handshake in ${lat}ms.` : "Probe failed on remote gateway.");
                  }} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Test Connection</button>
                  <button onClick={() => askConfirm({ title: g.enabled ? "Disable Integration" : "Enable Integration", message: `${g.enabled ? "Disable" : "Enable"} ${g.name} (${g.provider})?`, impactWarning: g.enabled ? "Dependent portal features will degrade to offline mode until re-enabled." : "Traffic will resume against stored credentials after a probe passes.", confirmButtonText: g.enabled ? "Disable" : "Enable", dangerLevel: g.enabled ? "danger" : "warning", requiresReason: true, onConfirm: (reason) => { setIntegrations((prev) => prev.map((x) => x.id === g.id ? { ...x, enabled: !x.enabled } : x)); logAudit(g.enabled ? "INTEGRATION_DISABLED" : "INTEGRATION_ENABLED", "Integrations", g.id, "HIGH", reason || `${g.name} toggled`); showToast(`${g.name} ${g.enabled ? "disabled" : "enabled"}.`); } })} className={`flex-1 rounded-lg py-2 text-xs font-bold ${g.enabled ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>{g.enabled ? "Disable" : "Enable"}</button>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= AUDIT LOGS ================= */}
      {view === "audit-logs" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Platform Audit Trail</h1>
              <p className="mt-1 text-sm text-slate-500">Immutable, SHA-256-chained record of every privileged action. Exports include the full bundle.</p>
            </div>
            <button onClick={exportAuditJson} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#123a75]"><Download size={14} /> Export JSON Bundle</button>
          </div>
          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, officer, action, entity or reason…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </PortalCard>
          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1000px]">
              <thead><tr><Th>Log ID</Th><Th>Timestamp</Th><Th>Actor</Th><Th>Action</Th><Th>Module</Th><Th>Entity</Th><Th>Result</Th><Th>Severity</Th><Th>Reason</Th></tr></thead>
              <tbody>
                {auditRows.map((l) => (
                  <tr key={l.id} className="hover:bg-emerald-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-slate-700">{l.id}</Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{l.ts}</Td>
                    <Td className="whitespace-nowrap font-semibold text-slate-800">{l.user}</Td>
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{l.action}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{l.module}</Td>
                    <Td className="font-mono text-slate-600">{l.entity}</Td>
                    <Td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${l.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{l.result}</span></Td>
                    <Td><SevBadge sev={l.severity} /></Td>
                    <Td className="max-w-[260px] truncate text-slate-500">{l.reason}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= SYSTEM MONITOR ================= */}
      {view === "system-monitor" && (
        <>
          <GreetingHeader
            eyebrow="Governance & Health • Live Telemetry"
            title="Infrastructure & System Monitor"
            subtitle="Heartbeat, latency, error rate and uptime per service. Degraded services need capacity action."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {INITIAL_SERVICES.map((s) => (
              <PortalCard key={s.id}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-black text-slate-900">{s.name}</p><p className="font-mono text-[10px] text-slate-400">{s.endpoint}</p></div>
                  <HealthBadge status={s.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[["Uptime %", `${s.up}%`, "text-emerald-700"], ["Latency", `${s.lat}ms`, s.lat > 500 ? "text-amber-700" : "text-slate-800"], ["Error %", `${s.err}%`, s.err > 1 ? "text-red-600" : "text-slate-800"]].map(([l, v, c]) => (
                    <div key={l as string} className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] uppercase tracking-wider text-slate-400">{l as string}</p><p className={`mt-0.5 font-mono text-sm font-black ${c as string}`}>{v as string}</p></div>
                  ))}
                </div>
                <p className="mt-2.5 border-t border-slate-100 pt-2 font-mono text-[10px] text-slate-400">Checked {s.checked} · {s.details}</p>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= NOTIFICATIONS ================= */}
      {view === "notifications" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">System Alerts & Notifications</h1>
              <p className="mt-1 text-sm text-slate-500">Security, integration, workflow and maintenance signals. {unread} unread.</p>
            </div>
            <button onClick={() => { setNotifs((p) => p.map((n) => ({ ...n, read: true }))); showToast("All notifications marked as read."); }} className="w-fit rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Mark All as Read</button>
          </div>
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {notifs.map((n) => (
              <PortalCard key={n.id} className={`!p-4 ${!n.read ? "!border-emerald-200 !bg-emerald-50/40" : ""}`}>
                <div className="flex gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${n.sev === "ERROR" || n.sev === "CRITICAL" ? "bg-red-100 text-red-600" : n.sev === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                    {n.sev === "INFO" ? <Bell size={16} /> : <AlertTriangle size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start justify-between gap-2 text-sm font-bold text-slate-900">{n.title}
                      <span className="flex shrink-0 items-center gap-2"><SevBadge sev={n.sev} /><span className="font-mono text-[10px] font-medium text-slate-400">{n.ts}</span>{!n.read && <span className="h-2 w-2 rounded-full bg-emerald-600" />}</span></p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">Category: {n.cat}</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { setView(n.url); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">Investigate <ArrowRight size={12} /></button>
                      {!n.read && <button onClick={() => setNotifs((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)))} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Mark read</button>}
                    </div>
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= SETTINGS ================= */}
      {view === "settings" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Platform Settings & Governance</h1>
              <p className="mt-1 text-sm text-slate-500">Every save is a HIGH-severity audit event with the stated reason.</p>
            </div>
            <div className="flex items-center gap-2">
              {settingsSaved && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={13} /> Saved</span>}
              <button onClick={() => askConfirm({ title: "Commit Platform Settings", message: "Persist all platform setting changes to production?", impactWarning: "Security, SSO and maintenance flags take effect on next request cycle.", confirmButtonText: "Save Settings", dangerLevel: "warning", requiresReason: true, onConfirm: (reason) => { setSettingsSaved(true); logAudit("SYSTEM_SETTINGS_UPDATE", "System Settings", "CORE_SETTINGS_V1", "HIGH", reason || "Updated platform settings"); showToast("Platform settings saved."); } })} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Save size={14} /> Save Settings</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from(new Set(SETTING_FIELDS.map((f) => f.section))).map((sec) => (
              <PortalCard key={sec} className="!p-4">
                <h2 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-[#0B1F44]">{sec}</h2>
                <div className="mt-3 space-y-3">
                  {SETTING_FIELDS.filter((f) => f.section === sec).map((f) => (
                    <div key={f.key}>
                      {f.type === "checkbox" ? (
                        <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                          {f.label}
                          <button type="button" onClick={() => { setSettings((p) => ({ ...p, [f.key]: !p[f.key] })); setSettingsSaved(false); }} className={`relative h-5 w-9 shrink-0 rounded-full transition ${settings[f.key] ? "bg-emerald-600" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${settings[f.key] ? "left-[18px]" : "left-0.5"}`} />
                          </button>
                        </label>
                      ) : (
                        <>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">{f.label}</label>
                          {f.type === "select" ? (
                            <select value={String(settings[f.key])} onChange={(e) => { setSettings((p) => ({ ...p, [f.key]: e.target.value })); setSettingsSaved(false); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs outline-none focus:border-emerald-600">
                              {f.options!.map((o) => (<option key={o} value={o}>{o}</option>))}
                            </select>
                          ) : (
                            <input type={f.type} value={settings[f.key] as string | number} onChange={(e) => { setSettings((p) => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })); setSettingsSaved(false); }} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs outline-none focus:border-emerald-600" />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= PROFILE ================= */}
      {view === "profile" && (
        <>
          <GreetingHeader
            eyebrow="Platform Control • Zero-Trust Session"
            title="System Administrator Profile"
            subtitle="Session identity, credential posture and delegation boundaries."
            actions={
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"><Printer size={14} /> Print Profile</button>
            }
          />
          <div className="mx-auto w-full max-w-3xl">
            <PortalCard>
              <div className="flex items-start gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-base font-black text-white">RS</span>
                <div>
                  <p className="text-lg font-black text-slate-900">{ADMIN.name}, ITS</p>
                  <p className="mt-0.5 text-xs text-slate-500">{ADMIN.designation}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700">ROLE: SYSTEM_ADMIN</span>
                    <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-slate-600"><ShieldCheck size={12} /> {ADMIN.badge}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Official Email</p><p className="mt-0.5 break-all font-mono font-bold text-slate-800">{ADMIN.email}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Jurisdiction</p><p className="mt-0.5 font-bold text-slate-800">{ADMIN.jurisdiction}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">MFA Posture</p><p className="mt-0.5 font-bold text-emerald-700">Hardware key + Jan Parichay OTP enforced</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Session</p><p className="mt-0.5 font-mono font-bold text-slate-800">GovNIC VPN · 20 min idle timeout</p></div>
              </div>
            </PortalCard>
            <PortalCard className="mt-4 border-red-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><LogOut size={15} /> Session Controls</h2>
              <p className="mt-1 text-[11px] text-slate-500">Terminating the session revokes tokens in Jan Parichay and records termination in the audit log.</p>
              <button onClick={() => askConfirm({ title: "Terminate Administrative Session", message: "End your secure platform administrator session?", impactWarning: "Active authentication tokens will be revoked in Jan Parichay and audit logs will record session termination.", confirmButtonText: "Confirm Sign Out", dangerLevel: "warning", onConfirm: () => showToast("Signed out. Session token cleared from memory.") })} className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Secure Logout</button>
            </PortalCard>
          </div>
        </>
      )}

      {/* Footer governance note */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]"><ShieldCheck size={13} className="text-emerald-600" /> Separation of Duties Enforced</p>
        <p className="mt-1">System Administrator governs accounts, policy and infrastructure — operational approvals (awards, validations, field records) remain exclusively with statutory roles. Every privileged action above is written to the tamper-evident audit ledger.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={nav("audit-logs")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><ClipboardList size={12} /> Audit Trail</button>
          <button onClick={nav("permission-matrix")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><TableProperties size={12} /> RBAC Matrix</button>
          <button onClick={nav("system-monitor")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white">Live Telemetry <ArrowRight size={12} /></button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className={`rounded-xl border p-2 ${confirm.dangerLevel === "danger" ? "border-red-200 bg-red-50 text-red-600" : confirm.dangerLevel === "warning" ? "border-amber-200 bg-amber-50 text-amber-600" : "border-blue-200 bg-blue-50 text-blue-600"}`}>
                  {confirm.dangerLevel === "danger" ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </span>
                <div><h3 className="text-base font-black text-slate-900">{confirm.title}</h3><p className="text-[11px] text-slate-400">Security & Audit Compliance Verification</p></div>
              </div>
              <button onClick={() => setConfirm(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={15} /></button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{confirm.message}</p>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <span className="mb-0.5 block font-bold">Administrative Impact Notice:</span>{confirm.impactWarning}
            </div>
            {confirm.requiresReason && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-bold text-slate-700">Reason for Change <span className="text-red-500">*</span> <span className="font-medium text-slate-400">(Recorded in immutable audit log)</span></label>
                <textarea value={confirmReason} onChange={(e) => { setConfirmReason(e.target.value); setConfirmError(""); }} rows={2} placeholder="Enter justification conforming to department delegation of powers…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                {confirmError && <p className="mt-1 text-[11px] text-red-600">{confirmError}</p>}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => setConfirm(null)} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button onClick={doConfirm} className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm ${confirm.dangerLevel === "danger" ? "bg-red-600 hover:bg-red-700" : confirm.dangerLevel === "warning" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {confirm.confirmButtonText || "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[150] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />{toast}
        </div>
      )}
    </PortalLayout>
  );
}

export default AdminPortal;



