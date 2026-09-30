/**
 * Approver (CALA / DM-DC) portal — fixtures, types and static configuration.
 *
 * Extracted verbatim from the original `approver.tsx` monolith so the
 * quasi-judicial screens keep identical wording, values and demo data.
 */

export const OFFICER = {
  name: "Smt. Ananya Deshmukh",
  initials: "AD",
  designation: "Competent Authority Land Acquisition (CALA)",
  badge: "CALA-UP-GBN-84",
  level: "Authorized CALA Officer",
  jurisdiction: "Gautam Buddha Nagar (Dadri) • Uttar Pradesh",
};

export const PORTAL = {
  badge: "Approver Portal",
  sub: "Land Acquisition Legal & Administrative Clearance",
  activeContext: "Gautam Buddha Nagar (Dadri) • Uttar Pradesh",
};

/** Canonical route path for each simulated view of the original monolith. */
export const APPROVER_PATHS = {
  dashboard: "/approver/dashboard",
  pending: "/approver/pending",
  all: "/approver/all",
  contested: "/approver/contested",
  stayed: "/approver/stayed",
  compensation: "/approver/compensation",
  notices: "/approver/notices",
  objections: "/approver/objections",
  possession: "/approver/possession",
  approved: "/approver/approved",
  audit: "/approver/audit",
  docket: "/approver/docket",
  powers: "/approver/powers",
} as const;

export type ApproverViewKey = keyof typeof APPROVER_PATHS;

export type Authority = "CALA" | "DM";

export interface Docket {
  id: string;
  project: string;
  agency: string;
  parcels: number;
  area: string;
  status: string;
  compensation: string;
  stage: string;
  priority: "High" | "Critical" | "Medium";
  lao: string;
  laoNote: string;
  field: string;
  fieldNote: string;
  comp: string;
  compNote: string;
  submitted: string;
}

export const initialDockets: Docket[] = [
  { id: "NHAI-DEL-MUM-PKG4-2026-089", project: "Delhi-Mumbai Expressway (NE-4) Package 4", agency: "National Highways Authority of India (NHAI)", parcels: 6, area: "12.84 Ha", status: "Awaiting Approval", compensation: "₹112.89 Cr", stage: "Approver Review", priority: "High", lao: "97.4%", laoNote: "Fully Validated", field: "Verification Certified", fieldNote: "", comp: "Pending CALA Approval", compNote: "₹112.89 Cr", submitted: "2026-09-15" },
  { id: "NOIDA-AIRPORT-EXPWY-2026-118", project: "Noida International Airport Direct Rail & Road Corridor", agency: "Yamuna Expressway Industrial Development Authority (YEIDA)", parcels: 12, area: "24.5 Ha", status: "Possession Pending", compensation: "₹259.48 Cr", stage: "Possession", priority: "Critical", lao: "99.4%", laoNote: "Fully Validated", field: "Verification Certified", fieldNote: "", comp: "Assessment Approved", compNote: "₹259.48 Cr", submitted: "2026-08-10" },
  { id: "DFCCIL-WDFC-DGR-2026-042", project: "Western Dedicated Freight Corridor (WDFC)", agency: "Dedicated Freight Corridor Corporation of India (DFCCIL)", parcels: 4, area: "8.15 Ha", status: "Contested", compensation: "₹64.77 Cr", stage: "Approver Review", priority: "High", lao: "89.2%", laoNote: "Requires Approver Attention", field: "Flagged with Caveat", fieldNote: "", comp: "Pending CALA Approval", compNote: "₹64.77 Cr", submitted: "2026-09-04" },
  { id: "RRTS-DEL-MEERUT-2026-015", project: "Delhi-Ghaziabad-Meerut RRTS Rapid Rail Corridor", agency: "National Capital Region Transport Corporation (NCRTC)", parcels: 3, area: "5.4 Ha", status: "Stayed", compensation: "₹61.33 Cr", stage: "Approver Review", priority: "Critical", lao: "94%", laoNote: "Requires Approver Attention", field: "Flagged with Caveat", fieldNote: "", comp: "Returned for Recertification", compNote: "₹61.33 Cr", submitted: "2026-09-15" },
  { id: "UPEDA-GANGA-EXP-2026-077", project: "Ganga Expressway Greenfield Alignment Package 3", agency: "Uttar Pradesh Expressways Industrial Development Authority (UPEIDA)", parcels: 8, area: "26.2 Ha", status: "Awaiting Approval", compensation: "₹132.88 Cr", stage: "Approver Review", priority: "High", lao: "91.5%", laoNote: "Requires Approver Attention", field: "Flagged with Caveat", fieldNote: "Boundary Mismatch", comp: "Pending CALA Approval", compNote: "₹132.88 Cr", submitted: "2026-09-20" },
  { id: "NHAI-NH9-WIDENING-2026-031", project: "NH-9 (Delhi-Meerut Expressway) 14-Lane Expansion Package 2", agency: "National Highways Authority of India (NHAI)", parcels: 5, area: "7.1 Ha", status: "Approved", compensation: "₹72.48 Cr", stage: "Finalization", priority: "Medium", lao: "98.1%", laoNote: "Fully Validated", field: "Verification Certified", fieldNote: "", comp: "Assessment Approved", compNote: "₹72.48 Cr", submitted: "2026-07-28" },
];

export const compCards = [
  { id: "NHAI-DEL-MUM-PKG4-2026-089", title: "Delhi-Mumbai Expressway (NE-4) Package 4", basis: "Basis: Circle Rate (Dadri 2025-26) + Rural Multiplier Factor (2.0x) + Solatium (100% under RFCTLARR / NH Act 3G)", award: "₹112.89 Cr", disb: "₹0.00", flag: "Pending CALA Approval" },
  { id: "NOIDA-AIRPORT-EXPWY-2026-118", title: "Noida International Airport Direct Rail & Road Corridor", basis: "Basis: RFCTLARR Act 2013 First Schedule (Solatium 100% + Solatium Interest + R&R Entitlements)", award: "₹259.48 Cr", disb: "₹259.48 Cr", flag: "Assessment Approved" },
  { id: "DFCCIL-WDFC-DGR-2026-042", title: "Western Dedicated Freight Corridor (WDFC)", basis: "Basis: Circle Rate + 100% Solatium (Escrow Deposit Recommendation under Sec 77)", award: "₹64.77 Cr", disb: "₹0.00", flag: "Pending CALA Approval" },
  { id: "RRTS-DEL-MEERUT-2026-015", title: "Delhi-Ghaziabad-Meerut RRTS Rapid Rail Corridor", basis: "Basis: Assessment prepared but stayed under judicial order", award: "₹61.33 Cr", disb: "₹0.00", flag: "Returned for Recertification" },
  { id: "UPEDA-GANGA-EXP-2026-077", title: "Ganga Expressway Greenfield Alignment Package 3", basis: "Basis: Circle Rate + Solatium 100%", award: "₹132.88 Cr", disb: "₹0.00", flag: "Pending CALA Approval" },
  { id: "NHAI-NH9-WIDENING-2026-031", title: "NH-9 (Delhi-Meerut Expressway) 14-Lane Expansion Package 2", basis: "Basis: Award Declared & Settled", award: "₹72.48 Cr", disb: "₹72.48 Cr", flag: "Assessment Approved" },
];

export const notices = [
  { id: "NOT-3A-091", project: "Delhi-Mumbai Expressway (NE-4) Package 4", type: "Section 3A (Intention)", gazette: "Gazette of India SO 2954(E)", issue: "2026-07-15", deadline: "2026-08-05", status: "Closed" },
  { id: "NOT-3D-142", project: "Delhi-Mumbai Expressway (NE-4) Package 4", type: "Section 3D (Declaration)", gazette: "Gazette of India SO 3082(E)", issue: "2026-08-20", deadline: "2026-09-10", status: "Delivered" },
  { id: "NOT-3G-019", project: "Delhi-Mumbai Expressway (NE-4) Package 4", type: "Section 3G (Claims)", gazette: "Public Notice Ref CALA/DAD/2026/25-09", issue: "2026-09-12", deadline: "2026-10-02", status: "Response Pending" },
  { id: "NOT-19N-19", project: "Noida International Airport Direct Rail & Road Corridor", type: "Section 19 (Award)", gazette: "UP Gazette Extra-104", issue: "2026-08-25", deadline: "2026-09-15", status: "Closed" },
];

export const objections = [
  { id: "OBJ-2026-44", project: "Delhi-Mumbai Expressway (NE-4) Package 4", khasra: "Khasra: 141", applicant: "APL-REF-7712 (Adv. G. Sharma for Shanti Devi)", ground: "Standing Crop / Tree Omission", hearing: "2026-09-08", status: "Disposed - Rectified" },
  { id: "OBJ-3FC-81", project: "Western Dedicated Freight Corridor (WDFC)", khasra: "Khasra 284/2", applicant: "APL-REF-9051 (Sunder Singh Branch)", ground: "Ancestral Joint Ownership Dispute", hearing: "2026-10-04", status: "Hearing Scheduled" },
];

export const possessionCards = [
  { id: "NHAI-DEL-MUM-PKG4-2026-089", title: "Delhi-Mumbai Expressway (NE-4) Package 4", agency: "National Highways Authority of India (NHAI) · 12.84 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "DRAFT-PKGH-2026-089", stateNote: "Pending CALA Approval" },
  { id: "NOIDA-AIRPORT-EXPWY-2026-118", title: "Noida International Airport Direct Rail & Road Corridor", agency: "Yamuna Expressway Industrial Development Authority (YEIDA) · 24.5 Ha", panchnama: "—", comp: "—", readiness: "Ready", state: "PKGM-JEWAR-2026-FINAL-09", stateNote: "Assessment Approved" },
  { id: "DFCCIL-WDFC-DGR-2026-042", title: "Western Dedicated Freight Corridor (WDFC)", agency: "Dedicated Freight Corridor Corporation of India (DFCCIL) · 8.15 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "In preparation", stateNote: "Pending CALA Approval" },
  { id: "RRTS-DEL-MEERUT-2026-015", title: "Delhi-Ghaziabad-Meerut RRTS Rapid Rail Corridor", agency: "National Capital Region Transport Corporation (NCRTC) · 5.4 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "In preparation", stateNote: "Returned for Recertification" },
  { id: "UPEDA-GANGA-EXP-2026-077", title: "Ganga Expressway Greenfield Alignment Package 3", agency: "Uttar Pradesh Expressways Industrial Development Authority (UPEIDA) · 26.2 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "In preparation", stateNote: "Pending CALA Approval" },
  { id: "NHAI-NH9-WIDENING-2026-031", title: "NH-9 (Delhi-Meerut Expressway) 14-Lane Expansion Package 2", agency: "National Highways Authority of India (NHAI) · 7.1 Ha", panchnama: "—", comp: "—", readiness: "Granted", state: "In preparation", stateNote: "Assessment Approved" },
];

export const auditRows = [
  { log: "AUD-891", ref: "NHAI-DEL-MUM-PKG4-2026-089", ts: "2026-09-18 14:35:18", actor: "Shri R.K. Sharma", auth: "LAO", action: "Forwarded Case to Approver Queue", trans: "Awaiting Approval", reason: "Complete validation of records and field reports concluded." },
  { log: "AUD-892", ref: "NHAI-DEL-MUM-PKG4-2026-089", ts: "2026-09-19 10:12:04", actor: "Smt. Ananya Deshmukh", auth: "CALA", action: "Opened Case File for Primary Review", trans: "Under Review", reason: "Statutory examination of Section 3D declaration compliance." },
  { log: "AUD-206-01", ref: "NOIDA-AIRPORT-EXPWY-2026-118", ts: "2026-09-24 10:05:08", actor: "SDM Jewar", auth: "LAO", action: "Submitted Possession Dossier to DM/DC", trans: "Possession Pending", reason: "All preconditions satisfied under RFCTLARR Section 38(2)." },
  { log: "AUD-ART-01", ref: "DFCCIL-WDFC-DGR-2026-042", ts: "2026-09-04 11:15:00", actor: "Shri R.K. Sharma", auth: "LAO", action: "Flagged Case as Contested", trans: "Contested", reason: "OS 341/2025 civil title partition suit detected." },
  { log: "AUD-ART-03", ref: "RRTS-DEL-MEERUT-2026-015", ts: "2026-09-24 13:20:00", actor: "Smt. Ananya Deshmukh", auth: "CALA", action: "Flagged Case as Stayed", trans: "Stayed", reason: "High Court Writ-C No. 19482/2026 stay order served." },
  { log: "AUD-MRW-01", ref: "NHAI-NH9-WIDENING-2026-031", ts: "2026-08-14 17:35:00", actor: "Smt. Ananya Deshmukh", auth: "CALA", action: "Granted Final Statutory Acquisition Approval", trans: "Approved", reason: "Statutory compliance complete under NH Act 1956 Section 3D & 3G." },
];

/** Dashboard alert rail (priority alerts & action items). */
export const alerts = [
  { title: "Review SLA Expiry Warning", tag: "Overdue Review", desc: "Delhi-Mumbai Expressway Package 4 SLA window expires in 48 hours.", caseId: "NHAI-DEL-MUM-PKG4-2026-089" },
  { title: "Possession Clearance Ready for DM/DC Sign-Off", tag: "Possession Readiness", desc: "Noida International Airport Direct Corridor 100% compensation disbursed. Awaiting final possession warrant.", caseId: "NOIDA-AIRPORT-EXPWY-2026-118" },
  { title: "Cadastral Boundary Discrepancy (3.4m Canal Berm)", tag: "Field Mismatch", desc: "Ganga Expressway Package 3: Surveyor reported physical encroachment onto Khasra 312/1 right-of-way.", caseId: "UPEDA-GANGA-EXP-2026-077" },
  { title: "Civil Title Partition Suit OS 341/2025", tag: "Contested Parcel", desc: "Western DFC: Rival succession claimants on Khasra 284/2. Requires LARRA deposit referral.", caseId: "DFCCIL-WDFC-DGR-2026-042" },
  { title: "Allahabad High Court Interim Injunction", tag: "Judicial Stay", desc: "RRTS Khasra 412/1 stayed till 15 Nov 2026 in Writ-C No. 19482/2026.", caseId: "RRTS-DEL-MEERUT-2026-015" },
];

/** Dashboard workflow-stage distribution (static in the original demo). */
export const stages = [
  { label: "Approver Review", pct: 67, count: "4 (67%)" },
  { label: "Compensation", pct: 0, count: "0 (0%)" },
  { label: "Possession", pct: 17, count: "1 (17%)" },
  { label: "Finalization", pct: 17, count: "1 (17%)" },
];

export const compensationTotals = [
  { l: "Total Assessed Acquisition Value", s: "Across 6 notified corridor dockets", v: "₹4,409.86 Cr" },
  { l: "Escrow Disbursed to Affected Khatedars", s: "Jewar Airport + NH-9 Expansions", v: "₹3,322.00 Cr" },
  { l: "Pending CALA Determination / Release", s: "Delhi-Mumbai NE-4 + Ganga Expressway", v: "₹1,087.86 Cr" },
];

export const recentDecisions: Array<[string, string, string, string, string]> = [
  ["NHAI-NH9-WIDENING-2026-031", "NH-9 14-Lane Expansion Package 2", "Approved", "2026-08-14", "CALA-Dadri"],
  ["RRTS-DEL-MEERUT-2026-015", "Delhi-Ghaziabad-Meerut RRTS Rapid Rail", "Mark Stayed", "2026-09-24", "CALA Legal Cell"],
  ["DFCCIL-WDFC-DGR-2026-042", "Western Dedicated Freight Corridor", "Mark Contested", "2026-09-04", "CALA / Senior LAO"],
];

/** Fake filter chips rendered on the queue, docket-list and audit screens. */
export const PENDING_FILTER_LABELS = ["All Priorities", "All Stages", "All PIAs", "All Statuses", "Contested: All", "Judicial Stay: All"];
export const LIST_FILTER_LABELS = ["All Districts"];
export const AUDIT_FILTER_LABELS = ["All Authorities"];

/** Statutory compliance checklist shown on the docket detail screen. */
export const COMPLIANCE_CHECKLIST = [
  "Section 3A intention gazette published & served",
  "Section 3C objections heard and disposed with speaking order",
  "LAO RoR validation reconciled with Bhulekh extract",
  "JMS field verification certified by Tehsil staff",
  "Compensation computed per First Schedule + solatium + R&R",
];

/** First two checklist items render as satisfied (matches original demo state). */
export const COMPLIANCE_DONE_COUNT = 2;

/** CALA sanction powers list on the officer profile / SOP screen. */
export const CALA_POWERS = [
  "Grant Section 3D / Section 19 vesting declarations",
  "Determine Section 3G / Section 23 compensation awards",
  "Dispose Section 3C / Section 15 objections with speaking orders",
  "Refer contested titles to LARRA deposit / civil court",
  "Approve possession handover dossiers to DM/DC",
];

export const CALA_SOP = [
  "Never approve from the table — always open the docket and inspect LAO validation, JMS report and compensation schedule.",
  "Contested titles go to deposit, not award. Stayed parcels cannot be approved until injunction vacated.",
  "Every approve / return / contest / stay order is DSC-signed with legal reasons into the audit trail.",
  "Possession sign-off is exclusive to DM/DC after 100% compensation disbursement or escrow deposit.",
];
