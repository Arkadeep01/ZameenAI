/**
 * PIA (Project Implementing Agency) portal — domain types and demo fixtures.
 *
 * Extracted verbatim from the former `routes/pia.tsx` monolith. Every page
 * route (`pia.dashboard.tsx`, `pia.projects.tsx`, …) reads its records from
 * here so the data contract stays identical while the screens become real
 * routes.
 */

export type ViewKey =
  | "dashboard"
  | "projects"
  | "cases"
  | "proposal"
  | "gis"
  | "documents"
  | "workflow"
  | "milestones"
  | "notifications"
  | "reports"
  | "profile"
  | "officer"
  | "help";

/** Every PIA screen as a real route path. */
export const PIA_PATHS: Record<ViewKey, string> = {
  dashboard: "/pia/dashboard",
  projects: "/pia/projects",
  cases: "/pia/cases",
  proposal: "/pia/proposal",
  gis: "/pia/gis",
  documents: "/pia/documents",
  workflow: "/pia/workflow",
  milestones: "/pia/milestones",
  notifications: "/pia/notifications",
  reports: "/pia/reports",
  profile: "/pia/profile",
  officer: "/pia/officer",
  help: "/pia/help",
};

export const OFFICER = {
  name: "Er. Rajeshwar Singhal",
  initials: "RS",
  designation: "Chief General Manager (Land Acquisition & Technical)",
  badge: "PIA-OFFICER-7741",
  level: "Authorized PIA Officer (Level 4)",
  org: "National Highways & Infrastructure Development Corporation (NHIDCL)",
  office: "NHIDCL Regional Office IV",
  email: "ro4.lao@nhidcl.gov.in",
  phone: "+91 542 258 4491",
  jurisdiction: "Northern Corridor Zone IV (Uttar Pradesh & Bihar)",
  doj: "14 Aug 2019",
  dsc: "Active · Class-3 DSC · valid till 12 Mar 2027",
};

/* ================= RECORDS ================= */

export const kpis = [
  { label: "Active Projects", value: "5", sub: "6 Total Registered", tone: "bg-sky-50 text-sky-700" },
  { label: "Acquisition Cases", value: "10", sub: "364 Total Parcels", tone: "bg-indigo-50 text-indigo-700" },
  { label: "Draft Proposals", value: "1", sub: "Pending Submission", tone: "bg-slate-100 text-slate-600" },
  { label: "Submitted / Ing…", value: "1", sub: "AI & OCR Processing", tone: "bg-blue-50 text-blue-700" },
  { label: "Under Validation", value: "2", sub: "LAO & Field Survey", tone: "bg-amber-50 text-amber-700" },
  { label: "Under Approval", value: "3", sub: "CALA / DM Collector", tone: "bg-violet-50 text-violet-700" },
  { label: "Acquired Parcels", value: "1", sub: "Vested in PIA", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Action Required", value: "8", sub: "2 Returned Cases", tone: "bg-red-50 text-red-700" },
];

export const actionItems = [
  { caseId: "LA-2026-00129", tag: "RETURNED BY LAO", title: "Toll Plaza & Service Area Requisition (Km 28+400)", desc: "Reason: Discrepancy in Khasra Schedule vs Bhulekh Cadastral Map for Plot 114/2 and Plot 118.", meta: "Deadline: 2026-10-10" },
  { caseId: "LA-2026-00136", tag: "RETURNED BY LAO", title: "Metro Maintenance Depot & Rolling Stock Yard", desc: "Reason: Gram Sabha Pond / Waterbody Classification Conflict on Survey Plot 88.", meta: "Deadline: 2026-10-10" },
  { caseId: "LA-2026-00129", tag: "RESPONSE OVERDUE", title: "Response to LAO Return Regarding Khasra 114/2 Discrepancy", desc: "Awaiting certified RoR extract from Tehsildar Chandauli. Resubmission pending.", meta: "Delayed by 5 days" },
  { caseId: "LA-2026-00132", tag: "RESPONSE OVERDUE", title: "Section 19 Final Sanction Order by District Collector", desc: "R&R package file undergoing supplementary scrutiny by Collectorate.", meta: "Delayed by 4 days" },
  { caseId: "DOC-2026-007", tag: "DOCUMENT FLAGGED", title: "Toll_Plaza_Requisition_Docket.pdf", desc: "Rejected by LAO: Khasra 114/2 area mismatch against Bhulekh RoR.", meta: "Case: LA-2026-00129" },
];

export const pipeline = [
  { label: "Land Identified & Requisitioned in Schedules", v: "2590.0 / 2707.4 Acres (92%)", pct: 92, color: "bg-sky-500" },
  { label: "Desk Validated by LAO (RoR Verified)", v: "2003.5 / 2707.4 Acres (74%)", pct: 74, color: "bg-blue-500" },
  { label: "Field Verified via Joint Measurement Survey (JMS)", v: "1570.3 / 2707.4 Acres (58%)", pct: 58, color: "bg-teal-500" },
  { label: "Statutorily Notified (Section 3D / Section 19)", v: "1191.3 / 2707.4 Acres (44%)", pct: 44, color: "bg-violet-500" },
  { label: "Possession Handed Over & Vested in PIA", v: "1077.7 / 2707.4 Acres (39.8%)", pct: 40, color: "bg-emerald-500" },
];

export const projects = [
  { id: "PRJ-NH-048", name: "NH-19 6-Laning Varanasi Bypass Corridor", sub: "NHIDCL RO-IV Varanasi", type: "Highway", districts: "Varanasi, Chandauli", req: "485.4 Ac", acq: "218.6 Ac", cases: 4, vest: 45.0, status: "ACTIVE" },
  { id: "PRJ-DFCC-102", name: "Western Dedicated Freight Corridor (Dadri-Rewari Feeder)", sub: "Dedicated Freight Corridor Corp.", type: "Railway", districts: "Gautam Buddha Nagar", req: "312.0 Ac", acq: "198.4 Ac", cases: 3, vest: 63.6, status: "ACTIVE" },
  { id: "PRJ-IND-304", name: "Bundelkhand Defense & Industrial Corridor - Node A", sub: "UP Expressways Industrial Dev.", type: "Industrial Corridor", districts: "Jhansi, Jalaun", req: "850.0 Ac", acq: "340.2 Ac", cases: 5, vest: 40.0, status: "ACTIVE" },
  { id: "PRJ-IRR-089", name: "Ken-Betwa National River Link Canal Reach IV", sub: "Ken-Betwa Link Project Authority", type: "Irrigation", districts: "Banda, Mahoba", req: "640.0 Ac", acq: "110.5 Ac", cases: 4, vest: 17.3, status: "ACTIVE" },
  { id: "PRJ-REN-512", name: "Vindhya Ultra Mega Solar Park 1200MW Transmission", sub: "Solar Energy Corporation of India", type: "Renewable Energy", districts: "Mirzapur, Sonbhadra", req: "280.0 Ac", acq: "195.0 Ac", cases: 3, vest: 69.6, status: "ACTIVE" },
  { id: "PRJ-URB-215", name: "Varanasi Inter-Modal Transit Terminal", sub: "UP Metro Rail Corporation (UPMRC)", type: "Urban Development", districts: "Varanasi", req: "140.0 Ac", acq: "15.0 Ac", cases: 2, vest: 10.7, status: "PLANNING" },
];

export type PiaCase = (typeof cases)[number];

export const cases = [
  { id: "LA-2026-00128", proj: "PRJ-NH-048", title: "Bypass Section Chainage 18+200 to 22+800", sub: "Construction of 6-lane elevated expressway", dist: "Varanasi", area: "48.5", parcels: 24, stage: "Desk Validation", owner: "Land Acquisition Officer…", pri: "HIGH" },
  { id: "LA-2026-00129", proj: "PRJ-NH-048", title: "Toll Plaza & Service Area Requisition", sub: "Development of 16-lane electronic toll plaza", dist: "Chandauli", area: "32.4", parcels: 16, stage: "Returned / Correction", owner: "Project Implementing Agency…", pri: "CRITICAL" },
  { id: "LA-2026-00130", proj: "PRJ-REN-512", title: "400kV Substation & Pylon Footprint", sub: "Land acquisition for 400kV GIS switching station", dist: "Mirzapur", area: "62.4", parcels: 32, stage: "Field Verification", owner: "Field Revenue Inspector…", pri: "HIGH" },
  { id: "LA-2026-00131", proj: "PRJ-DFCC-102", title: "Dadri Industrial Yard Rail RoW Expansion", sub: "Permanent land acquisition for electrified siding", dist: "Gautam Buddha Nagar", area: "94.2", parcels: 58, stage: "CALA Review", owner: "Competent Authority…", pri: "HIGH" },
  { id: "LA-2026-00132", proj: "PRJ-IRR-089", title: "Gravity Feeder Canal Reach IV Alignment", sub: "Acquisition of 14.5 km canal strip, service road", dist: "Banda", area: "142.0", parcels: 84, stage: "DM Approval", owner: "District Magistrate…", pri: "CRITICAL" },
  { id: "LA-2026-00133", proj: "PRJ-IND-304", title: "Manufacturing Node A Core Logistics Block", sub: "Mega industrial land block for heavy machinery", dist: "Jhansi", area: "180.5", parcels: 96, stage: "Record Freeze", owner: "Directorate of Land Records…", pri: "HIGH" },
  { id: "LA-2026-00134", proj: "PRJ-NH-048", title: "Interchange Ramp at Babatpur Airport Link", sub: "Trumpet interchange providing signal-free entry", dist: "Varanasi", area: "34.0", parcels: 18, stage: "Acquired", owner: "Joint Possession Committee…", pri: "HIGH" },
  { id: "LA-2026-00135", proj: "PRJ-IND-304", title: "Ancillary Water Supply Pipeline Corridor", sub: "Underground raw water pipeline strip", dist: "Jhansi", area: "18.2", parcels: 12, stage: "Draft", owner: "Project Implementing Agency…", pri: "MEDIUM" },
];

export const documents = [
  { id: "DOC-2026-001", file: "NH-19_Bypass_Requisition_Docket.pdf", caseId: "LA-2026-00128", cat: "Project Proposal", size: "4.2 MB", date: "2026-08-15", state: "VALIDATED", conf: "98.5%" },
  { id: "DOC-2026-002", file: "Cadastral_Alignment_Plan_Chainage18-22.pdf", caseId: "LA-2026-00128", cat: "Project Map / Cadastral", size: "12.8 MB", date: "2026-08-15", state: "VALIDATED", conf: "94.2%" },
  { id: "DOC-2026-003", file: "Land_Schedule_Form-A_24Parcels.xlsx", caseId: "LA-2026-00128", cat: "Land Schedule (Schedule-I)", size: "1.8 MB", date: "2026-08-15", state: "LAO VALIDATION PENDING", conf: "86.4%" },
  { id: "DOC-2026-004", file: "MoRTH_Administrative_Sanction_AA.pdf", caseId: "LA-2026-00128", cat: "Administrative Approval", size: "2.1 MB", date: "2026-08-15", state: "VALIDATED", conf: "99%" },
  { id: "DOC-2026-005", file: "Detailed_Project_Report_Executive.pdf", caseId: "LA-2026-00128", cat: "Technical Report / DPR", size: "8.4 MB", date: "2026-08-16", state: "VALIDATED", conf: "95.8%" },
  { id: "DOC-2026-006", file: "Certified_Khatiyan_Extracts_Bundle.pdf", caseId: "LA-2026-00128", cat: "Supporting Revenue Record", size: "6.5 MB", date: "2026-08-18", state: "LAO VALIDATION PENDING", conf: "82.1%" },
  { id: "DOC-2026-007", file: "Toll_Plaza_Requisition_Docket.pdf", caseId: "LA-2026-00129", cat: "Project Proposal", size: "3.8 MB", date: "2026-08-10", state: "REJECTED", conf: "78%" },
  { id: "DOC-2026-008", file: "Toll_Plaza_Cadastral_Layout.dwg", caseId: "LA-2026-00129", cat: "Project Map / Cadastral", size: "7.9 MB", date: "2026-08-10", state: "REJECTED", conf: "72.5%" },
  { id: "DOC-2026-009", file: "Substation_RoW_Land_Requirement.pdf", caseId: "LA-2026-00130", cat: "Land Requirement Note", size: "5.4 MB", date: "2026-07-15", state: "VALIDATED", conf: "96.5%" },
  { id: "DOC-2026-010", file: "Joint_Measurement_Survey_Plan.pdf", caseId: "LA-2026-00130", cat: "Technical Report / Survey", size: "6.2 MB", date: "2026-07-20", state: "VALIDATED", conf: "92.4%" },
];

export const workflowPhases = [
  { n: "Phase 1", t: "Draft", s: "Project Implementing Agency (PIA)", c: 1 },
  { n: "Phase 2", t: "Submitted", s: "ZameenAI Central Gateway", c: 0 },
  { n: "Phase 3", t: "AI / OCR", s: "ZameenAI Extraction Engine", c: 1 },
  { n: "Phase 4", t: "Desk Validation", s: "Land Acquisition Officer (LAO)", c: 1 },
  { n: "Phase 5", t: "Field Verification", s: "Field Revenue Inspector / Patwari", c: 1 },
  { n: "Phase 6", t: "CALA Review", s: "Competent Authority Land Acquisition (CALA)", c: 1 },
  { n: "Phase 7", t: "DM Approval", s: "District Magistrate / Collector", c: 1 },
  { n: "Phase 8", t: "Record Freeze", s: "Directorate of Land Records & NIC", c: 1 },
  { n: "Phase 9", t: "Acquired", s: "Competent Authority & District Administration", c: 1 },
];

export const milestones = [
  { caseId: "LA-2026-00128", desc: "Section 3A Requisition Submission by PIA", sub: "Requisition submitted within target schedule", sec: "NH Act 1956 Sec 3A(1)", date: "2026-08-25", status: "COMPLETED", auth: "NHIDCL RO-IV Varanasi", delay: "On Schedule" },
  { caseId: "LA-2026-00128", desc: "Desk Validation & RoR Verification by LAO", sub: "Desk validation ongoing; 18 of 24 parcels verified", sec: "Revenue Rules 2016", date: "2026-09-30", status: "IN PROGRESS", auth: "Special LAO (NH-19)", delay: "On Schedule" },
  { caseId: "LA-2026-00128", desc: "Joint Measurement Survey (JMS) & DGPS Geo-referencing", sub: "Scheduled to commence immediately after validation", sec: "NH Act 1956 Sec 3B", date: "2026-10-25", status: "NOT STARTED", auth: "Tehsil Revenue Staff", delay: "On Schedule" },
  { caseId: "LA-2026-00129", desc: "Response to LAO Return Regarding Khasra 114/2 Discrepancy", sub: "Awaiting certified RoR extract from Tehsil", sec: "SLAO Scrutiny Rule 14", date: "2026-10-10", status: "DELAYED", auth: "NHIDCL RO-IV Varanasi", delay: "+5 days" },
  { caseId: "LA-2026-00130", desc: "Joint Measurement Survey (JMS) Finalization", sub: "Field teams currently verifying boundaries on ground", sec: "RFCTLARR 2013 Sec 12", date: "2026-09-28", status: "IN PROGRESS", auth: "Sub-Divisional Officer", delay: "On Schedule" },
  { caseId: "LA-2026-00131", desc: "Section 20E Final Declaration Publication in Official Gazette", sub: "Draft submitted to Ministry of Railways", sec: "Railways Act Sec 20E", date: "2026-10-05", status: "IN PROGRESS", auth: "CALA / ADM Dadri", delay: "On Schedule" },
  { caseId: "LA-2026-00132", desc: "Section 19 Final Sanction Order by District Collector", sub: "R&R package file undergoing supplementary scrutiny", sec: "RFCTLARR 2013 Sec 19", date: "2026-09-22", status: "DELAYED", auth: "District Magistrate", delay: "+4 days" },
];

export const notifGroups = ["All Notifications", "Action Required", "Workflow Updates", "Deadlines & Delays", "Document & OCR", "System Gazettes"];
export const notifCounts: Record<string, number> = { "All Notifications": 10, "Action Required": 2, "Workflow Updates": 3, "Deadlines & Delays": 1, "Document & OCR": 2, "System Gazettes": 2 };
export const notifItems = [
  { urgent: true, icon: "alert", title: "Action Required: Proposal Returned by SLAO Chandauli", desc: "Case LA-2026-00129 (Toll Plaza Km 28+400) was returned. Discrepancy on Khasra 114/2 requires revised Land Schedule. Deadline: 10 Oct 2026.", meta: "Yesterday at 3:30 PM · Case: LA-2026-00129 · ACTION REQUIRED" },
  { urgent: true, icon: "alert", title: "Action Required: Waterbody Restriction Objection", desc: "CALA Urban Varanasi returned Case LA-2026-00136 regarding Survey Plot 88 waterbody restriction under Supreme Court order.", meta: "2 days ago · Case: LA-2026-00136 · ACTION REQUIRED" },
  { urgent: false, icon: "check", title: "Desk Validation Update: Case LA-2026-00128", desc: "LAO Varanasi completed desk verification of 18 out of 24 parcels for NH-19 Bypass Section.", meta: "Today at 10:15 AM · Case: LA-2026-00128 · WORKFLOW UPDATE" },
  { urgent: false, icon: "clock", title: "Milestone Delayed: DM Sanction Order Banda", desc: "Ken-Betwa Canal Reach IV (Case LA-2026-00132) Section 19 sanction order is overdue by 4 days.", meta: "Yesterday at 11:30 AM · Case: LA-2026-00132 · DEADLINE" },
  { urgent: false, icon: "clock", title: "AI Processing Complete: Northern Spur Link", desc: "AI neural extraction finished for Case LA-2026-00137. 54 fields extracted with 88% overall confidence.", meta: "2 hours ago · Case: LA-2026-00137 · DOCUMENT" },
  { urgent: false, icon: "check", title: "Field Survey Commenced: Mirzapur Solar Corridor", desc: "Joint Measurement Survey (JMS) with DGPS equipment started on-ground for Case LA-2026-00130.", meta: "24 Sep 2026 · Case: LA-2026-00130 · WORKFLOW UPDATE" },
  { urgent: false, icon: "clock", title: "System Gazette Link Synchronized", desc: "National E-Gazette integration synchronized notification references for NH-19 Project Corridor.", meta: "23 Sep 2026 · SYSTEM" },
];

export const reportBars = [
  { label: "Total Land Required (Project Scope)", v: "2707.4 Acres (100.0%)", pct: 100, color: "bg-sky-400" },
  { label: "Land Identified in Land Schedules", v: "2545.0 Acres (94.0%)", pct: 94, color: "bg-sky-400" },
  { label: "Land Under LAO Desk Validation", v: "2003.5 Acres (74.0%)", pct: 74, color: "bg-blue-500" },
  { label: "Land Field Verified (Joint Measurement Survey)", v: "1570.3 Acres (58.0%)", pct: 58, color: "bg-teal-400" },
  { label: "Land Statutorily Notified (Sec 3D / Sec 19)", v: "1191.3 Acres (44.0%)", pct: 44, color: "bg-violet-500" },
  { label: "Land Acquired & Transferred to PIA", v: "1077.7 Acres (39.8%)", pct: 40, color: "bg-emerald-400" },
];

export const reportProjects = [
  { id: "PRJ-NH-048", name: "NH-19 6-Laning Varanasi Bypass Corridor", dist: "Varanasi, Chandauli", req: "485.4", acq: "218.6", vest: "45.0%", budget: "Rs. 680 Cr" },
  { id: "PRJ-DFCC-102", name: "Western Dedicated Freight Corridor (Dadri-Rewari-Vadodara Feeder)", dist: "Gautam Buddha Nagar, Bulandshahr", req: "312.0", acq: "198.4", vest: "63.6%", budget: "Rs. 940 Cr" },
  { id: "PRJ-IND-304", name: "Bundelkhand Defense & Industrial Manufacturing Corridor - Node A", dist: "Jhansi, Jalaun", req: "850.0", acq: "340.2", vest: "40.0%", budget: "Rs. 1450 Cr" },
  { id: "PRJ-IRR-089", name: "Ken-Betwa National River Link Canal Reach IV Package", dist: "Banda, Mahoba", req: "640.0", acq: "110.5", vest: "17.3%", budget: "Rs. 720 Cr" },
  { id: "PRJ-REN-512", name: "Vindhya Ultra Mega Solar Park 1200MW Transmission Right-of-Way", dist: "Mirzapur, Sonbhadra", req: "280.0", acq: "195.0", vest: "69.6%", budget: "Rs. 310 Cr" },
];

export const allowed: [string, string][] = [
  ["View Own Registered Infrastructure Projects", "VIEW_OWN_PROJECTS"],
  ["Register New Infrastructure Projects (under mandate)", "CREATE_PROJECT"],
  ["Initiate Land Acquisition Requisition Proposals", "CREATE_ACQUISITION_CASE"],
  ["Formulate & Edit Proposal Draft Schedules", "EDIT_DRAFT_CASE"],
  ["Upload Requisition Dossiers & Alignment Plans", "UPLOAD_DOCUMENT"],
  ["Monitor AI Neural OCR & Ingestion Pipeline", "VIEW_DOCUMENT_PROCESSING"],
  ["Track Multi-Agency Case Workflow Status", "VIEW_CASE_STATUS"],
  ["Inspect Authoritative Stage History & Ownership", "VIEW_WORKFLOW"],
  ["View Cadastral Alignment & Nominate Parcels on Map", "VIEW_GIS"],
  ["Submit Revised Requisitions in Response to Queries", "RESPOND_TO_RETURN"],
];

export const restricted: [string, string][] = [
  ["Validate RoR Extractions (Exclusive to LAO)", "APPROVE_LAO_VALIDATION"],
  ["Approve Official Extracted Land Records", "VALIDATE_OCR_FIELDS"],
  ["Grant Section 3D / Section 19 Sanction (CALA / DM)", "APPROVE_ACQUISITION"],
  ["Adjudicate Section 3G / Section 23 Awards", "APPROVE_COMPENSATION"],
  ["Execute Official Transfer of Possession Certificate", "APPROVE_POSSESSION"],
  ["Apply Mutation Freeze in State Bhulekh Registry", "FREEZE_RECORD"],
  ["Alter Official Revenue Cadastral Polygons", "EDIT_OFFICIAL_CADASTRAL_DATA"],
  ["Modify Immutable System Audit Trails", "DELETE_AUDIT_LOG"],
  ["Adjudicate Land Acquisition Objections / Litigations", "RESOLVE_JUDICIAL_DISPUTES"],
];

/** Officer authority list rendered on the officer dossier page. */
export const OFFICER_POWERS = [
  "Initiate land acquisition requisition proposals (CREATE_ACQUISITION_CASE)",
  "Upload requisition dossiers & alignment plans (UPLOAD_DOCUMENT)",
  "Submit revised requisitions in response to LAO returns (RESPOND_TO_RETURN)",
  "Track multi-agency case workflow status (VIEW_CASE_STATUS)",
];

export const OFFICER_DENIED = [
  "Validate RoR extractions — exclusive to LAO",
  "Grant Section 3D / Section 19 sanction — CALA / DM only",
  "Freeze mutations or alter cadastral polygons",
];

export const OFFICER_ACTIVITY: [string, string][] = [
  ["Requisition draft initiated — LA-2026-00135", "Ancillary water-supply pipeline corridor · 24 Sep 2026"],
  ["Dossier uploaded — Toll Plaza resubmission set", "Revised land schedule + certified RoR extracts · 25 Sep 2026"],
  ["Response filed to SLAO Chandauli return", "Khasra 114/2 discrepancy · resubmission pending certification"],
];

/** Live workflow timeline shown on the PIA dashboard. */
export const DASHBOARD_TIMELINE: [string, string][] = [
  ["Acquisition Requisition Draft Initiated", "Requisition draft prepared for NH-19 Varanasi Bypass Section Chainage 18+200."],
  ["Case Submitted to National Gateway", "Case transmitted formally accompanied with administrative sanction and digital alignment drawings."],
  ["Automated Document Ingestion & Integrity Validation", "SHA-256 verification, land polygonal contiguity, alignment polygon vectorized."],
  ["Cadastral Neural OCR & Extraction Completed", "141 land-record fields extracted, 121 high confidence (84.6%). 20 fields flagged for human review."],
  ["Case Assigned to Special Land Acquisition Officer (SLAO)", "SLAO desk scrutiny underway. Comparing extracted land schedules against Bhulekh RoR."],
];

/* ================= CASE TABS ================= */

export const CASE_TABS: [string, number][] = [
  ["All Cases", 10],
  ["Action Required (Returned)", 2],
  ["Drafts", 1],
  ["Submitted / Processing", 1],
  ["Under Validation (LAO)", 2],
  ["CALA / DM Review", 3],
  ["Vested / Acquired", 1],
];

/* ================= PROPOSAL WIZARD ================= */

export const WIZARD_STEPS: { title: string; sub: string }[] = [
  { title: "Project Selection", sub: "Select sponsoring project" },
  { title: "Acquisition Requirement", sub: "Purpose & statutory scope" },
  { title: "Land & Parcel Schedule", sub: "Khasra & khata details" },
  { title: "Supporting Documents", sub: "Upload alignment & DPR" },
  { title: "Review & Readiness", sub: "Pre-submission validation" },
  { title: "PIA Declaration & Submit", sub: "Formal statutory lodging" },
];

export const WIZARD_PLACEHOLDERS = [
  "",
  "purpose & statutory scope",
  "Khasra / Khata schedule rows",
  "alignment plan & DPR uploads",
  "pre-submission readiness checklist",
  "final PIA declaration & lodging",
];

/** Short project label used in the dashboard "Active Acquisition Cases" table. */
export function projectShortName(projId: string): string {
  switch (projId) {
    case "PRJ-NH-048":
      return "NH-19 6-Laning Varanasi Bypass";
    case "PRJ-REN-512":
      return "Vindhya Ultra Mega Solar Park";
    case "PRJ-DFCC-102":
      return "Western Dedicated Freight Corridor";
    case "PRJ-IRR-089":
      return "Ken-Betwa National River Link";
    default:
      return "Bundelkhand Defense & Industrial";
  }
}

/** Case-tab predicate, preserving the original filter cascade. */
export function matchesCaseTab(stage: string, caseTab: string): boolean {
  if (caseTab === "All Cases") return true;
  if (caseTab.startsWith("Action")) return stage.includes("Return");
  if (caseTab.startsWith("Draft")) return stage === "Draft";
  if (caseTab.startsWith("Submitted")) return stage.includes("Field") || stage.includes("Desk");
  if (caseTab.startsWith("Under Validation")) return stage.includes("Desk") || stage.includes("Field");
  if (caseTab.startsWith("CALA"))
    return stage.includes("CALA") || stage.includes("DM") || stage.includes("Freeze");
  if (caseTab.startsWith("Vested")) return stage === "Acquired";
  return true;
}
