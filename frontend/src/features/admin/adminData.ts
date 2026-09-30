/**
 * Admin portal — static domain model + fixtures.
 *
 * Extracted verbatim from the former monolithic `routes/admin.tsx` so that every
 * `admin.*.tsx` route file stays page-only. No behaviour is defined here: this
 * module only declares the shapes and the seeded catalogue records.
 */

export type Role =
  | "SYSTEM_ADMIN"
  | "PIA"
  | "FIELD_OFFICER"
  | "LAO"
  | "APPROVER"
  | "EXECUTIVE"
  | "CITIZEN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "INACTIVE";
export type AccessLevel = "ALLOWED" | "RESTRICTED" | "NOT_ALLOWED";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  officialId: string;
  role: Role;
  departmentId: string;
  departmentName: string;
  state: string;
  district: string;
  status: UserStatus;
  lastLogin: string;
  createdAt: string;
  accessStartDate: string;
  accessExpiryDate: string;
  twoFactorEnabled: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  state: string;
  district: string;
  head: string;
  users: number;
  projects: number;
  status: string;
  category: string;
}

export interface Project {
  id: string;
  name: string;
  dept: string;
  state: string;
  district: string;
  type: string;
  status: string;
  workflow: string;
}

export interface WorkflowStage {
  id: string;
  n: number;
  name: string;
  role: Role;
  sla: number;
  enabled: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  category: string;
  version: string;
  status: string;
  updated: string;
  stages: WorkflowStage[];
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  provider: string;
  endpoint: string;
  status: string;
  enabled: boolean;
  sync: string;
  auth: string;
  key: string;
  ver: string;
  latency: number;
  notes: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  module: string;
  entity: string;
  result: string;
  severity: string;
  reason: string;
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: string;
  up: number;
  lat: number;
  err: number;
  checked: string;
  endpoint: string;
  details: string;
}

export interface AdminNotification {
  id: string;
  ts: string;
  title: string;
  desc: string;
  cat: string;
  sev: string;
  read: boolean;
  /** Target route for the "Investigate" deep link. */
  to: string;
}

export interface UserActivity {
  id: string;
  user: string;
  action: string;
  ip: string;
  agent: string;
  loc: string;
  ts: string;
  status: string;
  details: string;
}

export interface SettingField {
  section: string;
  key: string;
  label: string;
  type: "text" | "number" | "checkbox" | "select";
  options?: string[];
}

/* ================= ADMIN IDENTITY ================= */

export const ADMIN = {
  name: "Shri Rajeshwar Sen",
  initials: "RS",
  email: "rajeshwar.sen@gov.in",
  designation: "Senior Technical Director (ITS) · System Administrator",
  badge: "SYSADMIN-001",
  jurisdiction: "National (All Jurisdictions)",
};

/* ================= FIXTURES ================= */

export const INITIAL_USERS: AdminUser[] = [
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

export const ROLES: {
  id: Role;
  name: string;
  desc: string;
  users: number;
  operational: boolean;
  locked?: boolean;
}[] = [
  { id: "SYSTEM_ADMIN", name: "System Administrator", desc: "Platform control, RBAC governance, integrations & audit. Barred from operational approvals.", users: 4, operational: false, locked: true },
  { id: "PIA", name: "Project Implementing Agency", desc: "Initiates requisitions, uploads dossiers, responds to LAO returns.", users: 312, operational: true },
  { id: "FIELD_OFFICER", name: "Field Officer", desc: "Ground verification, JMS surveys, geo-tagged evidence, mismatch reports.", users: 1240, operational: true },
  { id: "LAO", name: "LAO Desk Validator", desc: "Human-in-the-loop OCR validation, returns, rejections.", users: 486, operational: true },
  { id: "APPROVER", name: "Acquisition Approver (CALA/DM)", desc: "Quasi-judicial awards, sanctions, possession orders.", users: 128, operational: true },
  { id: "EXECUTIVE", name: "Executive / Dept Head", desc: "Read-only national oversight, MIS digests, forecasts.", users: 46, operational: false },
  { id: "CITIZEN", name: "Citizen / Landowner", desc: "Self-service land, compensation & grievance tracking.", users: 202, operational: false },
];

export const PERM_GROUPS: {
  group: string;
  perms: { id: string; code: string; name: string; operational: boolean }[];
}[] = [
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

export const ALL_PERM_IDS = PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id));
const OPERATIONAL_IDS = new Set(
  PERM_GROUPS.flatMap((g) => g.perms.filter((p) => p.operational).map((p) => p.id)),
);

export function defaultMatrix(): Record<Role, Record<string, AccessLevel>> {
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
  m.LAO.p_validate_ocr = "ALLOWED";
  m.APPROVER.p_approve_acq = "ALLOWED";
  m.FIELD_OFFICER.p_field_verify = "ALLOWED";
  m.PIA.p_config_proj = "ALLOWED";
  return m;
}

export const INITIAL_DEPTS: Department[] = [
  { id: "dept_nic", name: "NIC Platform Cell", code: "NIC-PLT", state: "Central", district: "HQ", head: "Shri Rajeshwar Sen", users: 12, projects: 0, status: "ACTIVE", category: "PLATFORM" },
  { id: "dept_rev_hooghly", name: "Office of DM & LA Collector, Hooghly", code: "WB-REV-HGY", state: "West Bengal", district: "Hooghly", head: "District Magistrate", users: 86, projects: 4, status: "ACTIVE", category: "REVENUE" },
  { id: "dept_nhidcl", name: "NHIDCL Regional Office IV", code: "NHIDCL-RO4", state: "Uttar Pradesh", district: "Varanasi", head: "Er. Rajeshwar Singhal", users: 64, projects: 6, status: "ACTIVE", category: "HIGHWAYS" },
  { id: "dept_cala", name: "Office of CALA, Gautam Buddha Nagar", code: "UP-CALA-GBN", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", head: "Smt. Ananya Deshmukh", users: 32, projects: 3, status: "ACTIVE", category: "REVENUE" },
  { id: "dept_dolr", name: "Dept. of Land Resources & PM GatiShakti Cell", code: "DOLR-GS", state: "Central", district: "HQ", head: "Shri Vinod K. Saxena", users: 46, projects: 10, status: "ACTIVE", category: "SURVEY_SETTLEMENT" },
  { id: "dept_rev_varanasi", name: "Tehsil Revenue Office, Pindra", code: "UP-REV-PIN", state: "Uttar Pradesh", district: "Varanasi", head: "Tehsildar, Pindra", users: 118, projects: 2, status: "ACTIVE", category: "REVENUE" },
];

export const INITIAL_JURISDICTIONS = [
  { id: "jur_01", state: "Uttar Pradesh", district: "Varanasi", tehsil: "Pindra", villages: 142, dept: "Tehsil Revenue Office, Pindra", status: "ACTIVE" },
  { id: "jur_02", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", tehsil: "Dadri", villages: 118, dept: "Office of CALA, Gautam Buddha Nagar", status: "ACTIVE" },
  { id: "jur_03", state: "West Bengal", district: "Hooghly", tehsil: "Serampore", villages: 96, dept: "Office of DM & LA Collector, Hooghly", status: "ACTIVE" },
  { id: "jur_04", state: "West Bengal", district: "Hooghly", tehsil: "Singur", villages: 64, dept: "Office of DM & LA Collector, Hooghly", status: "UNDER_REVIEW" },
  { id: "jur_05", state: "Jharkhand", district: "Ranchi", tehsil: "Kanke", villages: 88, dept: "Kanke Circle, Ranchi", status: "ACTIVE" },
  { id: "jur_06", state: "Bihar", district: "Kaimur", tehsil: "Bhabua", villages: 124, dept: "DLR Office, Kaimur", status: "UNDER_REVIEW" },
];

export const INITIAL_PROJECTS: Project[] = [
  { id: "PRJ-NH-048", name: "NH-19 6-Laning Varanasi Bypass", dept: "NHIDCL Regional Office IV", state: "Uttar Pradesh", district: "Varanasi", type: "HIGHWAY", status: "ACTIVE_PIPELINE", workflow: "Land Acquisition v3.2" },
  { id: "PRJ-DFCC-102", name: "Western DFC Dadri–Rewari Feeder", dept: "Office of CALA, Gautam Buddha Nagar", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", type: "RAILWAY_CORRIDOR", status: "ACTIVE_PIPELINE", workflow: "Land Acquisition v3.2" },
  { id: "PRJ-REN-512", name: "Vindhya 1200MW Solar Transmission", dept: "NHIDCL Regional Office IV", state: "Uttar Pradesh", district: "Mirzapur", type: "ENERGY_CORRIDOR", status: "CONFIGURED", workflow: "Land Acquisition v3.2" },
  { id: "PRJ-EDFC-201", name: "Eastern DFC Dankuni–Gomoh", dept: "Office of DM & LA Collector, Hooghly", state: "West Bengal", district: "Hooghly", type: "RAILWAY_CORRIDOR", status: "ACTIVE_PIPELINE", workflow: "Land Acquisition v3.1" },
  { id: "PRJ-RNC-077", name: "Ranchi Ring Road Phase-II", dept: "Kanke Circle, Ranchi", state: "Jharkhand", district: "Ranchi", type: "HIGHWAY", status: "DRAFT", workflow: "Digitization v2.8" },
];

export const INITIAL_WORKFLOWS: Workflow[] = [
  { id: "wf_acq", name: "Land Acquisition Pipeline", category: "LAND_ACQUISITION", version: "v3.2", status: "ACTIVE", updated: "2026-08-14",
    stages: [
      { id: "st_draft", n: 1, name: "Draft (PIA)", role: "PIA", sla: 72, enabled: true },
      { id: "st_submit", n: 2, name: "Submitted / Gateway", role: "PIA", sla: 24, enabled: true },
      { id: "st_aiocr", n: 3, name: "AI / OCR Extraction", role: "SYSTEM_ADMIN", sla: 12, enabled: true },
      { id: "st_desk", n: 4, name: "Desk Validation (LAO)", role: "LAO", sla: 48, enabled: true },
      { id: "st_field", n: 5, name: "Field Verification (JMS)", role: "FIELD_OFFICER", sla: 120, enabled: true },
      { id: "st_cala", n: 6, name: "CALA Review", role: "APPROVER", sla: 96, enabled: true },
      { id: "st_dm", n: 7, name: "DM Approval", role: "APPROVER", sla: 72, enabled: true },
      { id: "st_freeze", n: 8, name: "Record Freeze", role: "SYSTEM_ADMIN", sla: 24, enabled: true },
      { id: "st_acq", n: 9, name: "Acquired & Vested", role: "APPROVER", sla: 24, enabled: true },
    ]},
  { id: "wf_digi", name: "Land Record Digitization", category: "LAND_RECORD_DIGITIZATION", version: "v2.8", status: "ACTIVE", updated: "2026-06-30",
    stages: [
      { id: "dg_up", n: 1, name: "Upload", role: "PIA", sla: 24, enabled: true },
      { id: "dg_pre", n: 2, name: "Preprocess", role: "SYSTEM_ADMIN", sla: 6, enabled: true },
      { id: "dg_cls", n: 3, name: "Classify", role: "SYSTEM_ADMIN", sla: 6, enabled: true },
      { id: "dg_ocr", n: 4, name: "OCR", role: "SYSTEM_ADMIN", sla: 12, enabled: true },
      { id: "dg_ext", n: 5, name: "Extract", role: "SYSTEM_ADMIN", sla: 12, enabled: true },
      { id: "dg_val", n: 6, name: "Validate", role: "LAO", sla: 48, enabled: true },
      { id: "dg_rev", n: 7, name: "Review", role: "LAO", sla: 24, enabled: false },
      { id: "dg_done", n: 8, name: "Complete", role: "SYSTEM_ADMIN", sla: 6, enabled: true },
    ]},
];

export const DOC_CATS = [
  { name: "Project Proposal / Requisition Docket", code: "DOC-PROP", formats: "PDF/A", size: 25, retention: 12, permanent: false, versioning: "STRICT_FULL_HISTORY", access: "DEPARTMENT_ONLY", stored: 12480, gb: 412 },
  { name: "Cadastral Alignment Plan", code: "DOC-MAP", formats: "PDF, DWG, GeoJSON", size: 150, retention: 30, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "RESTRICTED", stored: 8210, gb: 1240 },
  { name: "Land Schedule (Form-A)", code: "DOC-SCHED", formats: "XLSX, PDF", size: 10, retention: 30, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "RESTRICTED", stored: 18930, gb: 96 },
  { name: "Certified RoR / Khatiyan Extract", code: "DOC-ROR", formats: "PDF/A", size: 50, retention: 99, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "CONFIDENTIAL", stored: 45210, gb: 2210 },
  { name: "Detailed Project Report", code: "DOC-DPR", formats: "PDF", size: 100, retention: 12, permanent: false, versioning: "MAJOR_ONLY", access: "DEPARTMENT_ONLY", stored: 3420, gb: 288 },
  { name: "Gazette Notification Copy", code: "DOC-GAZ", formats: "PDF/A", size: 15, retention: 99, permanent: true, versioning: "STRICT_FULL_HISTORY", access: "PUBLIC_FACING", stored: 1960, gb: 22 },
];

export const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "int_janparichay", name: "Jan Parichay SSO", type: "AUTHENTICATION", provider: "NIC", endpoint: "https://janparichay.meripehchaan.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:20 UTC", auth: "VALID_CREDENTIAL", key: "jp_live_••••9f2a", ver: "OIDC 2.1", latency: 64, notes: "Primary admin & officer SSO" },
  { id: "int_digilocker", name: "DigiLocker Document Fetch", type: "GOVERNMENT_APIS", provider: "NeGD", endpoint: "https://api.digitallocker.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 10:58 UTC", auth: "VALID_CREDENTIAL", key: "dl_live_••••41bc", ver: "v3", latency: 112, notes: "Title deed fetch for PIA dossiers" },
  { id: "int_bhulekh_up", name: "Bhulekh UP RoR API", type: "GOVERNMENT_APIS", provider: "UP Revenue Dept", endpoint: "https://upbhulekh.gov.in/api", status: "DEGRADED", enabled: true, sync: "2026-09-25 22:14 UTC", auth: "EXPIRING_SOON", key: "bh_up_••••77e0", ver: "v2", latency: 840, notes: "Credential rotation due 05-Oct-2026" },
  { id: "int_banglar", name: "BanglarBhumi Sync", type: "GOVERNMENT_APIS", provider: "WB Land Dept", endpoint: "https://banglarbhumi.gov.in/api", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:02 UTC", auth: "VALID_CREDENTIAL", key: "bb_wb_••••c819", ver: "v2", latency: 148, notes: "Hooghly circle RoR sync" },
  { id: "int_sms", name: "NIC SMS Gateway (DLT)", type: "NOTIFICATION_SERVICES", provider: "NIC", endpoint: "https://smsgw.sms.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:29 UTC", auth: "VALID_CREDENTIAL", key: "sg_nic_••••02dd", ver: "v1", latency: 92, notes: "OTP + deadline alerts" },
  { id: "int_obj", name: "MeghRaj Object Storage (S3)", type: "STORAGE", provider: "NIC Cloud", endpoint: "https://s3.meghraj.gov.in", status: "HEALTHY", enabled: true, sync: "2026-09-26 11:30 UTC", auth: "VALID_CREDENTIAL", key: "s3_mr_••••b6f4", ver: "S3", latency: 38, notes: "Dossier + evidence bucket" },
  { id: "int_ocr", name: "ZameenAI OCR Engine", type: "OCR", provider: "Internal", endpoint: "http://ocr-cluster:8080", status: "DEGRADED", enabled: true, sync: "2026-09-26 09:41 UTC", auth: "VALID_CREDENTIAL", key: "internal", ver: "v4.2.0-rc2", latency: 1210, notes: "2 GPU workers queued > 5 min" },
  { id: "int_gis", name: "Bhunaksha Tile Service", type: "GIS", provider: "NIC", endpoint: "https://bhunaksha.nic.in/tiles", status: "HEALTHY", enabled: false, sync: "2026-09-20 18:00 UTC", auth: "VALID_CREDENTIAL", key: "bh_tile_••••9a77", ver: "WMTS 1.0", latency: 210, notes: "Disabled pending tile-cache rebuild" },
];

export const INITIAL_AUDIT: AuditEntry[] = [
  { id: "aud_90412", ts: "2026-09-26 11:24:10 UTC", user: "Shri Rajeshwar Sen", action: "PERMISSION_MATRIX_UPDATED", module: "Role & Permissions", entity: "RBAC_CORE_MATRIX", result: "SUCCESS", severity: "CRITICAL", reason: "Restricted VALIDATE_OCR_FIELDS for EXECUTIVE role" },
  { id: "aud_90408", ts: "2026-09-26 10:47:55 UTC", user: "Shri Rajeshwar Sen", action: "USER_SUSPENDED", module: "User Management", entity: "usr_fld_08", result: "SUCCESS", severity: "HIGH", reason: "Credential misuse flagged by Circle Officer, Kanke" },
  { id: "aud_90401", ts: "2026-09-26 09:58:02 UTC", user: "System (Scheduler)", action: "INTEGRATION_PROBE_DIAGNOSTIC", module: "Integrations", entity: "int_bhulekh_up", result: "WARNING", severity: "MEDIUM", reason: "Latency 840ms exceeds 500ms SLO" },
  { id: "aud_90397", ts: "2026-09-25 18:12:44 UTC", user: "Shri Rajeshwar Sen", action: "USER_CREATED", module: "User Management", entity: "usr_lao_07", result: "SUCCESS", severity: "HIGH", reason: "Provisioned LAO account for Special LAO (NH-19)" },
  { id: "aud_90390", ts: "2026-09-25 14:03:19 UTC", user: "Shri Rajeshwar Sen", action: "WORKFLOW_STAGE_TOGGLED", module: "Workflow Config", entity: "dg_rev", result: "SUCCESS", severity: "HIGH", reason: "Review stage disabled pending SOP revision" },
  { id: "aud_90381", ts: "2026-09-24 17:40:33 UTC", user: "Shri R. K. Sharma", action: "FIELD_CORRECTION", module: "Desk Validation", entity: "LA-2026-00109", result: "SUCCESS", severity: "LOW", reason: "Khasra 92/1 → 92/4 reconciled with Porcha" },
];

export const INITIAL_SERVICES: ServiceHealth[] = [
  { id: "svc_api", name: "Core API Gateway", status: "HEALTHY", up: 99.98, lat: 42, err: 0.01, checked: "11:30:02", endpoint: "api.zameenai.gov.in", details: "3 replicas, autoscale armed" },
  { id: "svc_db", name: "PostgreSQL Cluster (Patroni)", status: "HEALTHY", up: 99.99, lat: 8, err: 0.0, checked: "11:30:02", endpoint: "pg-primary:5432", details: "Synchronous replica lag 0.2s" },
  { id: "svc_auth", name: "Jan Parichay Bridge", status: "HEALTHY", up: 99.95, lat: 64, err: 0.02, checked: "11:29:58", endpoint: "janparichay bridge", details: "Token cache hit 97%" },
  { id: "svc_obj", name: "Object Storage (S3)", status: "HEALTHY", up: 100.0, lat: 38, err: 0.0, checked: "11:30:00", endpoint: "s3.meghraj.gov.in", details: "4.2 TB / 20 TB used" },
  { id: "svc_ocr", name: "OCR Worker Pool", status: "DEGRADED", up: 96.4, lat: 1210, err: 2.1, checked: "11:29:55", endpoint: "ocr-cluster:8080", details: "2 GPU workers queued > 5 min" },
  { id: "svc_gis", name: "GIS Tile Server", status: "DEGRADED", up: 97.8, lat: 402, err: 1.4, checked: "11:29:57", endpoint: "tiles internal", details: "Cache rebuild at 62%" },
  { id: "svc_q", name: "SMS/Email Queue", status: "HEALTHY", up: 99.9, lat: 92, err: 0.05, checked: "11:30:01", endpoint: "queue:6379", details: "Depth 14, draining normally" },
  { id: "svc_ledger", name: "Audit Ledger Writer", status: "HEALTHY", up: 100.0, lat: 19, err: 0.0, checked: "11:30:03", endpoint: "ledger writer", details: "SHA-256 chain verified, 1.2M events" },
];

export const INITIAL_NOTIFS: AdminNotification[] = [
  { id: "n1", ts: "2026-09-26 11:24", title: "RBAC matrix change committed", desc: "EXECUTIVE role restricted from VALIDATE_OCR_FIELDS. Recorded as CRITICAL audit event.", cat: "SECURITY", sev: "WARNING", read: false, to: "/admin/audit-logs" },
  { id: "n2", ts: "2026-09-26 09:58", title: "Bhulekh UP API latency breach", desc: "P95 latency 840ms exceeds 500ms SLO. Credential rotation due 05-Oct-2026.", cat: "INTEGRATION", sev: "ERROR", read: false, to: "/admin/integrations" },
  { id: "n3", ts: "2026-09-25 22:14", title: "OCR worker queue backlog", desc: "2 GPU workers queued over 5 minutes. Consider scaling pool before 3E SLA window.", cat: "WORKFLOW", sev: "WARNING", read: false, to: "/admin/system-monitor" },
  { id: "n4", ts: "2026-09-25 18:12", title: "New LAO account provisioned", desc: "usr_lao_07 created for Special LAO (NH-19), Varanasi. MFA enforced.", cat: "ACCESS", sev: "INFO", read: true, to: "/admin/users" },
  { id: "n5", ts: "2026-09-24 06:00", title: "Weekly audit bundle archived", desc: "1.2M events sealed to GovCloud vault. Zero tamper flags.", cat: "MAINTENANCE", sev: "INFO", read: true, to: "/admin/audit-logs" },
];

export const INITIAL_ACTIVITIES: UserActivity[] = [
  { id: "ua1", user: "Shri S. K. Mukherjee", action: "FIELD_CORRECTION committed", ip: "10.244.8.21", agent: "Chrome 126 / Win11", loc: "Hooghly, WB", ts: "2026-09-26 10:02 UTC", status: "SUCCESS", details: "Khasra correction on LA-2026-00109" },
  { id: "ua2", user: "Er. Rajeshwar Singhal", action: "Dossier upload (1420 KB)", ip: "10.244.9.44", agent: "Chrome 126 / Win11", loc: "Varanasi, UP", ts: "2026-09-25 23:15 UTC", status: "SUCCESS", details: "Toll plaza resubmission set" },
  { id: "ua3", user: "Shri Ramesh Patwari", action: "Login attempt (locked)", ip: "103.21.9.8", agent: "Mobile Safari", loc: "Ranchi, JH", ts: "2026-09-24 19:40 UTC", status: "FAILED", details: "Suspended credential presented" },
  { id: "ua4", user: "Smt. Ananya Deshmukh", action: "Award approval DSC-signed", ip: "10.244.4.12", agent: "Chrome 126 / Win11", loc: "Dadri, UP", ts: "2026-09-24 13:20 UTC", status: "SUCCESS", details: "NH-9 widening final approval" },
  { id: "ua5", user: "Shri R. K. Sharma", action: "MFA challenge issued", ip: "10.244.8.21", agent: "Chrome 126 / Win11", loc: "Varanasi, UP", ts: "2026-09-23 08:11 UTC", status: "CHALLENGED", details: "New device enrollment" },
];

export const SETTING_FIELDS: SettingField[] = [
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

export const INITIAL_SETTINGS: Record<string, string | number | boolean> = {
  platformTitle: "ZameenAI National Land Governance Platform", environment: "PRODUCTION",
  timezone: "Asia/Kolkata", supportEmail: "support-dilrmp@gov.in",
  enforceMfa: true, sessionTimeout: 20, maxFailed: 5, ipWhitelist: true,
  sso: "JAN_PARICHAY", digilocker: true, tokenHours: 8,
  emailAlerts: true, smsCritical: true, recipients: "sysadmin@nic.in, soc@cert-in.org.in",
  maxUpload: 150, virusScan: true, archivalYears: 12,
  logReads: false, retentionDays: 2555, govCloudExport: true,
  maintMode: false, maintWindow: "Sun 02:00–04:00 IST",
};

/** Seed shape for the "Add Official" form, reset after every successful submit. */
export const NEW_USER_FORM_DEFAULTS = {
  fullName: "",
  email: "",
  phone: "",
  officialId: "",
  role: "LAO" as Role,
  status: "ACTIVE" as UserStatus,
  dept: INITIAL_DEPTS[0].id,
  state: "Uttar Pradesh",
  district: "Gautam Buddha Nagar",
  start: "2026-09-27",
  expiry: "2027-03-31",
  mfa: true,
};

export type NewUserForm = typeof NEW_USER_FORM_DEFAULTS;

/* ================= SHARED NAVIGATION / CRUMB TABLES ================= */

export const ADMIN_CRUMBS: Record<string, string[]> = {
  "/admin/dashboard": ["Platform Console", "System Overview"],
  "/admin/users": ["Platform Console", "User Directory"],
  "/admin/users-new": ["Platform Console", "User Directory", "Onboard Official"],
  "/admin/user-activity": ["Platform Console", "User Activity Log"],
  "/admin/roles": ["Platform Console", "Access Control", "Configured Roles"],
  "/admin/permissions": ["Platform Console", "Permissions Registry"],
  "/admin/permission-matrix": ["Platform Console", "Access Control", "RBAC Permission Matrix"],
  "/admin/departments": ["Platform Console", "Organization Hierarchy"],
  "/admin/states": ["Platform Console", "Organization", "States Catalog"],
  "/admin/districts": ["Platform Console", "Organization", "Districts Catalog"],
  "/admin/jurisdictions": ["Platform Console", "Organization", "Tehsil Jurisdictions"],
  "/admin/projects": ["Platform Console", "Project Configuration"],
  "/admin/workflows": ["Platform Console", "Workflow Configuration"],
  "/admin/documents": ["Platform Console", "Document Repository"],
  "/admin/integrations": ["Platform Console", "Integrations & External APIs"],
  "/admin/audit-logs": ["Platform Console", "Platform Audit Trail"],
  "/admin/system-monitor": ["Platform Console", "Infrastructure & System Monitor"],
  "/admin/notifications": ["Platform Console", "System Alerts & Notifications"],
  "/admin/settings": ["Platform Console", "Platform Settings & Governance"],
  "/admin/profile": ["Platform Console", "System Administrator Profile"],
};
