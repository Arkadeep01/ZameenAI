/**
 * Desk Validator (LAO — Land Acquisition Officer) portal — domain types,
 * fixtures and constants.
 *
 * Extracted verbatim from the former `routes/desk-validator.tsx` monolith so
 * the eleven desk-scrutiny screens can become real routes.
 */

export type ViewKey =
  | "dashboard"
  | "queue"
  | "assigned"
  | "dossier"
  | "workspace"
  | "field"
  | "returned"
  | "validated"
  | "audit"
  | "notifications"
  | "profile";

export const LAO_PATHS: Record<ViewKey, string> = {
  dashboard: "/desk-validator/dashboard",
  queue: "/desk-validator/queue",
  assigned: "/desk-validator/assigned",
  dossier: "/desk-validator/dossier",
  workspace: "/desk-validator/workspace",
  field: "/desk-validator/field",
  returned: "/desk-validator/returned",
  validated: "/desk-validator/validated",
  audit: "/desk-validator/audit",
  notifications: "/desk-validator/notifications",
  profile: "/desk-validator/profile",
};

export const LAO = {
  name: "Shri S. K. Mukherjee",
  initials: "SM",
  role: "LAO • Desk Validator",
  designation: "Land Acquisition Officer (Desk Scrutiny)",
  badgeId: "WB-LAO-2018-094",
  office: "Office of the District Magistrate & LA Collector, Hooghly",
  tehsils: "West Bengal · Baidyabati, Serampore, Singur, Chinsurah",
  portalSub: "Office of the District Magistrate & LA Collector, Hooghly",
  activeContext: "Hooghly Special LA Cell • Eastern DFC Corridor",
  laoCode: "LAO-014",
};

export const stats = [
  { label: "Pending Validation", value: "6", sub: "Requires human scrutiny", bar: "border-amber-500" },
  { label: "High Priority", value: "4", sub: "3E declaration imminent", bar: "border-red-500" },
  { label: "In Progress", value: "1", sub: "Draft notes active", bar: "border-blue-500" },
  { label: "Validated Today", value: "28", sub: "Handoff to CALA/Survey", bar: "border-emerald-500" },
  { label: "Returned", value: "1", sub: "Sent to PIA for rescan", bar: "border-orange-500" },
  { label: "Avg Scrutiny Time", value: "18 min", sub: "Per multi-page porcha", bar: "border-slate-400" },
];

export interface QueueRow {
  caseId: string;
  docId: string;
  project: string;
  section: string;
  district: string;
  village: string;
  khasra: string;
  khata: string;
  docType: string;
  conf: number;
  flags: number;
  submittedBy: string;
  submittedOn: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "Pending Validation" | "Returned" | "In Review";
}

export const queueRows: QueueRow[] = [
  { caseId: "LA-2026-00115", docId: "DOC-2026-00850", project: "NHAI National Highway 34 Expansion", section: "Dankuni - Barasat Bypass", district: "Hooghly", village: "Monoharpur", khasra: "340/1", khata: "210", docType: "Title Deed - Dankuni", conf: 45, flags: 6, submittedBy: "B. Sen", submittedOn: "2026-09-24 11:00", priority: "MEDIUM", status: "Returned" },
  { caseId: "LA-2026-00132", docId: "DOC-2026-00895", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Singur Feeder Line", district: "Hooghly", village: "Singur", khasra: "192/B", khata: "588", docType: "Registered Sale Deed (Kabala)", conf: 65, flags: 5, submittedBy: "R. K. Sharma", submittedOn: "2026-09-26 08:00", priority: "CRITICAL", status: "Pending Validation" },
  { caseId: "LA-2026-00188", docId: "DOC-2026-01020", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Baidyabati Bypass", district: "Hooghly", village: "Baidyabati", khasra: "198/4", khata: "440", docType: "WB Form 10 - RoR (Porcha)", conf: 70, flags: 4, submittedBy: "P. Sengupta", submittedOn: "2026-09-26 04:30", priority: "HIGH", status: "Pending Validation" },
  { caseId: "LA-2026-00170", docId: "DOC-2026-00980", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Dankuni Junction", district: "Hooghly", village: "Dankuni", khasra: "512/1", khata: "89", docType: "WB Form 10 - RoR", conf: 71, flags: 4, submittedBy: "P. Sengupta", submittedOn: "2026-09-26 05:40", priority: "HIGH", status: "Pending Validation" },
  { caseId: "LA-2026-00128", docId: "DOC-2026-00891", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Dankuni - Gomoh Section", district: "Hooghly", village: "Baidyabati", khasra: "184/2", khata: "412", docType: "WB Form 10 - RoR (Khatian)", conf: 72, flags: 4, submittedBy: "P. Sengupta", submittedOn: "2026-09-26 09:15", priority: "HIGH", status: "Pending Validation" },
  { caseId: "LA-2026-00175", docId: "DOC-2026-00995", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Dankuni - Gomoh Section", district: "Hooghly", village: "Singur", khasra: "204/1", khata: "614", docType: "WB Form 10 - RoR", conf: 74, flags: 3, submittedBy: "P. Sengupta", submittedOn: "2026-09-25 18:20", priority: "MEDIUM", status: "Pending Validation" },
];

export interface AssignedRow {
  caseId: string;
  project: string;
  location: string;
  sub: string;
  khasra: string;
  owner: string;
  status: string;
  statusTone: string;
  conf: number;
  confLabel: string;
  confColor: string;
}

export const assignedRows: AssignedRow[] = [
  { caseId: "LA-2026-00128", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Baidyabati", sub: "Hooghly", khasra: "184/2", owner: "Abhijit Kumar Mondal", status: "Pending Validation", statusTone: "bg-amber-50 text-amber-800 border-amber-200", conf: 72, confLabel: "(Low)", confColor: "bg-red-500" },
  { caseId: "LA-2026-00132", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Singur", sub: "Hooghly", khasra: "192/B", owner: "Debabrata Banerjee", status: "Pending Validation", statusTone: "bg-amber-50 text-amber-800 border-amber-200", conf: 65, confLabel: "(Low)", confColor: "bg-red-500" },
  { caseId: "LA-2026-00140", project: "Varanasi Outer Ring Road Phase-II", location: "Mustafabad", sub: "Varanasi", khasra: "445/Ga", owner: "Ram Ratan Yadav", status: "In Review", statusTone: "bg-blue-50 text-blue-800 border-blue-200", conf: 78, confLabel: "(Moderate)", confColor: "bg-amber-500" },
  { caseId: "LA-2026-00155", project: "Bengaluru Satellite Town Ring Road (STRR)", location: "Kasaba", sub: "Bengaluru Rural", khasra: "78/1A", owner: "K. N. Venkatesh Murthy", status: "Pending Validation", statusTone: "bg-amber-50 text-amber-800 border-amber-200", conf: 81, confLabel: "(Moderate)", confColor: "bg-amber-500" },
  { caseId: "LA-2026-00170", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Dankuni", sub: "Hooghly", khasra: "512/1", owner: "Tarun Kanti Bhattacharya", status: "Pending Validation", statusTone: "bg-amber-50 text-amber-800 border-amber-200", conf: 71, confLabel: "(Low)", confColor: "bg-red-500" },
  { caseId: "LA-2026-00188", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Baidyabati", sub: "Hooghly", khasra: "198/4", owner: "Satyajit Karmakar", status: "Pending Validation", statusTone: "bg-amber-50 text-amber-800 border-amber-200", conf: 70, confLabel: "(Low)", confColor: "bg-red-500" },
  { caseId: "LA-2026-00175", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Singur", sub: "Hooghly", khasra: "204/1", owner: "Biswanath Mukherjee", status: "Pending Validation", statusTone: "bg-amber-50 text-amber-800 border-amber-200", conf: 74, confLabel: "(Low)", confColor: "bg-red-500" },
  { caseId: "LA-2026-00162", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Baidyabati", sub: "Hooghly", khasra: "190/3", owner: "Shampa Dasgupta", status: "Field Verification Pending", statusTone: "bg-indigo-50 text-indigo-800 border-indigo-200", conf: 89, confLabel: "(Moderate)", confColor: "bg-amber-500" },
  { caseId: "LA-2026-00115", project: "NHAI National Highway 34 Expansion", location: "Monoharpur", sub: "Hooghly", khasra: "340/1", owner: "Sunil Kumar Ghosh", status: "Returned", statusTone: "bg-red-50 text-red-700 border-red-200", conf: 45, confLabel: "(Low)", confColor: "bg-red-500" },
  { caseId: "LA-2026-00109", project: "Eastern Dedicated Freight Corridor Phase-II", location: "Rishra", sub: "Hooghly", khasra: "92/4", owner: "Prabir Kumar Roy", status: "Desk Validated", statusTone: "bg-emerald-50 text-emerald-700 border-emerald-200", conf: 94, confLabel: "(High)", confColor: "bg-emerald-600" },
];

export const fieldReports = [
  { caseId: "LA-2026-00132", village: "Singur", khasra: "192/B", inspector: "Inspector P. Roy, Singur Revenue Office", visit: "2026-09-25", boundary: "Mismatch", area: "Variance", status: "MISMATCH_DETECTED" },
  { caseId: "LA-2026-00128", village: "Baidyabati", khasra: "184/2", inspector: "Sub-Inspector Animesh Ghosh, Hooghly Revenue Circle", visit: "2026-09-29", boundary: "Match", area: "Match", status: "PENDING" },
  { caseId: "LA-2026-00140", village: "Mustafabad", khasra: "445/Ga", inspector: "Lekhpal Rajesh Kumar Verma", visit: "2026-09-30", boundary: "Match", area: "Match", status: "SCHEDULED" },
  { caseId: "LA-2026-00170", village: "Dankuni", khasra: "512/1", inspector: "Unassigned", visit: "Scheduled", boundary: "Match", area: "Match", status: "PENDING" },
  { caseId: "LA-2026-00188", village: "Baidyabati", khasra: "198/4", inspector: "Unassigned", visit: "Scheduled", boundary: "Match", area: "Match", status: "PENDING" },
  { caseId: "LA-2026-00115", village: "Monoharpur", khasra: "340/1", inspector: "Unassigned", visit: "Scheduled", boundary: "Match", area: "Match", status: "NOT_REQUIRED" },
];

export const notifications = [
  { urgent: true, title: "Urgent Case Assigned: Eastern Freight Corridor", time: "2026-09-26 10:15", desc: "Case LA-2026-00128 (Baidyabati KHS-184/2) assigned for immediate desk validation before 3E declaration." },
  { urgent: true, title: "Physical Survey Discrepancy Flagged", time: "2026-09-26 09:30", desc: "Field Officer Inspector P. Roy reported 0.06 acre boundary variance on Khasra 192/B Singur." },
  { urgent: false, title: "Resubmitted Scan from PIA-018", time: "2026-09-26 08:45", desc: "High-resolution Deed Scan re-uploaded for Case LA-2026-00115 (Dankuni Bypass)." },
  { urgent: false, title: "Validated Record Queued for CALA Review", time: "2026-09-25 16:20", desc: "Case LA-2026-00109 moved forward to CALA review bench following successful desk validation." },
];

export const auditRows = [
  { ts: "2026-09-26 08:35:12", actor: "ZameenAI System", role: "AI Extraction Engine", action: "INITIAL_EXTRACTION", field: "ALL_FIELDS", prev: "N/A", next: "13 fields extracted (4 flagged)", reason: "Initial automated document digitization", rev: "v1" },
  { ts: "2026-09-25 16:10:04", actor: "Shri S. K. Mukherjee", role: "LAO Desk Validator", action: "FIELD_CORRECTION", field: "Khasra Number", prev: "92/1", next: "92/4", reason: "Typo in OCR extraction reconciled with Porcha page 1", rev: "v2" },
];

export const permissions = [
  "VIEW_ASSIGNED_CASES", "VIEW_DOCUMENTS", "VIEW_EXTRACTED_DATA", "EDIT_VALIDATION_FIELDS",
  "SAVE_VALIDATION_DRAFT", "VALIDATE_RECORD", "RETURN_RECORD", "REJECT_RECORD",
  "VIEW_AUDIT_LOG", "VIEW_FIELD_VERIFICATION", "VIEW_SENSITIVE_CASE_DATA",
];

export const DOSSIER_TABS = [
  "Overview", "Source Documents", "Digitized Data", "Field Verification", "Workflow Timeline", "Audit Trail (1)",
];

export const PARCEL_SUMMARY: [string, string, boolean][] = [
  ["Khasra / Survey No:", "92/4", true],
  ["Khata Number:", "315", false],
  ["Dag Number:", "DAG-608", false],
  ["ULPIN (Parcel ID):", "1904120920044C", true],
  ["Area Under Acquisition:", "0.35 Acre", true],
  ["Land Classification:", "Shali", false],
  ["Present Land Use:", "Paddy", false],
];

export const TITLE_SUMMARY: [string, string, boolean][] = [
  ["Primary Landowner:", "Prabir Kumar Roy", true],
  ["Father / Spouse:", "S/O Sushil Roy", false],
  ["Ownership Type:", "SOLE", false],
  ["Ownership Share:", "100%", false],
  ["Assigned Officer:", "Shri S. K. Mukherjee (LAO-014)", false],
  ["Submission Agency:", "DFCCIL", false],
];

export const FLAGGED_FIELDS = [
  { key: "khasra", title: "Khasra / Plot Number", conf: "58%", diag: 'AI Diagnostic: Missing subdivision suffix "/B".', ai: "192", note: "Review Needed" },
  { key: "area", title: "Area Conveyed", conf: "68%", diag: "AI Diagnostic: Conversion verification required from Satak to Acre.", ai: "0.62", note: "Review Required" },
];

export const FLAGGED_SUMMARY: [string, string][] = [
  ["Khasra / Plot Number", "58%"],
  ["Area Conveyed", "68%"],
];

export const CONFIDENCE_BANDS = ["All", "Low", "Mid", "High"] as const;

export const QUEUE_FILTER_LABELS = [
  "Status: All Statuses", "Priority: All Priorities", "District: All Districts",
  "Doc: All Document Types", "Sort: Lowest Confidence First",
];

export const VALIDATED_ROWS: [string, string, string, string, number, string][] = [
  ["LA-2026-00109", "Prabir Kumar Roy · 92/4", "2026-09-25 16:22", "S. K. Mukherjee", 94, "CALA Review Bench"],
  ["LA-2026-00098", "Anil Verma · 77/2", "2026-09-25 11:05", "S. K. Mukherjee", 92, "CALA Review Bench"],
  ["LA-2026-00087", "Meera Devi · 310/A", "2026-09-24 17:41", "S. K. Mukherjee", 91, "Field Survey Queue"],
];

export const VALIDATED_STATS: [string, string, string][] = [
  ["Desk Validated (this week)", "28", "border-emerald-500"],
  ["Handoff to CALA", "21", "border-blue-500"],
  ["Awaiting Field Survey", "7", "border-amber-500"],
];

export const SOP_STEPS: [string, string][] = [
  ["1. Scope of Validation:", "The Desk Validator acts as the Human-in-the-Loop validation authority to ensure AI/OCR extractions are free of typographical and character confusion errors before entering formal land acquisition compensation schedules."],
  ["2. Low-Confidence Field Mandate:", "Fields with confidence scores below 75% are highlighted with amber warnings. The officer must cross-examine the original scan in the document viewer and either correct the value or confirm its fidelity."],
  ["3. Return vs. Reject:", "If a document has illegible portions, folded pages, or missing schedules, use Return for Reprocessing so the survey desk can provide a high-resolution re-scan. Use Reject Validation only when the document is counterfeit, legally cancelled, or fundamentally invalid."],
  ["4. Reservation of Statutory Power:", "Desk Validation approves data extraction accuracy. It does NOT constitute acquisition vesting or final award declaration under Section 3G / Section 20F, which remains strictly with CALA / District Magistrate."],
];

export const WORKFLOW_STEPS: [string, string][] = [
  ["Sec 11:", "Preliminary notification published in Official Gazette & two local daily newspapers."],
  ["Sec 15:", "Hearing of objections — LAO scrutiny of Khasra ownership chains."],
  ["Sec 19:", "Final declaration after hearing objections and R&R scheme approval."],
];

export const SCRUTINY_GUIDELINES = [
  "Verify Khata / Khasra ownership chain for minimum 12 years.",
  "Cross-check AI-flagged fields against scanned Porcha / Kabala.",
  "Return low-resolution scans to PIA for rescan within 48 hours.",
  "Every approve / return action is DSC-signed and audit-logged.",
];
