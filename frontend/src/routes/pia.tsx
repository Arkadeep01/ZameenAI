import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Map,
  Bell,
  CircleCheck,
  CircleX,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  ChevronDown,
  TriangleAlert,
  Clock3,
  ShieldCheck,
  Download,
  Printer,
  Upload,
  BookOpen,
  Building2,
  Workflow,
  Flag,
  FileBarChart,
  MapPin,
  ExternalLink,
  CheckCircle2,
  CircleAlert,
  User,
  Mail,
  Phone,
  IdCard,
  KeyRound,
} from "lucide-react";
import PortalLayout, {
  PortalCard,
  GreetingHeader,
} from "../components/portal/PortalLayout";

export const Route = createFileRoute("/pia")({
  component: PiaPortal,
});

type ViewKey =
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

const OFFICER = {
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

/* ================= DATA ================= */

const kpis = [
  { label: "Active Projects", value: "5", sub: "6 Total Registered", tone: "bg-sky-50 text-sky-700" },
  { label: "Acquisition Cases", value: "10", sub: "364 Total Parcels", tone: "bg-indigo-50 text-indigo-700" },
  { label: "Draft Proposals", value: "1", sub: "Pending Submission", tone: "bg-slate-100 text-slate-600" },
  { label: "Submitted / Ing…", value: "1", sub: "AI & OCR Processing", tone: "bg-blue-50 text-blue-700" },
  { label: "Under Validation", value: "2", sub: "LAO & Field Survey", tone: "bg-amber-50 text-amber-700" },
  { label: "Under Approval", value: "3", sub: "CALA / DM Collector", tone: "bg-violet-50 text-violet-700" },
  { label: "Acquired Parcels", value: "1", sub: "Vested in PIA", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Action Required", value: "8", sub: "2 Returned Cases", tone: "bg-red-50 text-red-700" },
];

const actionItems = [
  { caseId: "LA-2026-00129", tag: "RETURNED BY LAO", title: "Toll Plaza & Service Area Requisition (Km 28+400)", desc: "Reason: Discrepancy in Khasra Schedule vs Bhulekh Cadastral Map for Plot 114/2 and Plot 118.", meta: "Deadline: 2026-10-10" },
  { caseId: "LA-2026-00136", tag: "RETURNED BY LAO", title: "Metro Maintenance Depot & Rolling Stock Yard", desc: "Reason: Gram Sabha Pond / Waterbody Classification Conflict on Survey Plot 88.", meta: "Deadline: 2026-10-10" },
  { caseId: "LA-2026-00129", tag: "RESPONSE OVERDUE", title: "Response to LAO Return Regarding Khasra 114/2 Discrepancy", desc: "Awaiting certified RoR extract from Tehsildar Chandauli. Resubmission pending.", meta: "Delayed by 5 days" },
  { caseId: "LA-2026-00132", tag: "RESPONSE OVERDUE", title: "Section 19 Final Sanction Order by District Collector", desc: "R&R package file undergoing supplementary scrutiny by Collectorate.", meta: "Delayed by 4 days" },
  { caseId: "DOC-2026-007", tag: "DOCUMENT FLAGGED", title: "Toll_Plaza_Requisition_Docket.pdf", desc: "Rejected by LAO: Khasra 114/2 area mismatch against Bhulekh RoR.", meta: "Case: LA-2026-00129" },
];

const pipeline = [
  { label: "Land Identified & Requisitioned in Schedules", v: "2590.0 / 2707.4 Acres (92%)", pct: 92, color: "bg-sky-500" },
  { label: "Desk Validated by LAO (RoR Verified)", v: "2003.5 / 2707.4 Acres (74%)", pct: 74, color: "bg-blue-500" },
  { label: "Field Verified via Joint Measurement Survey (JMS)", v: "1570.3 / 2707.4 Acres (58%)", pct: 58, color: "bg-teal-500" },
  { label: "Statutorily Notified (Section 3D / Section 19)", v: "1191.3 / 2707.4 Acres (44%)", pct: 44, color: "bg-violet-500" },
  { label: "Possession Handed Over & Vested in PIA", v: "1077.7 / 2707.4 Acres (39.8%)", pct: 40, color: "bg-emerald-500" },
];

const projects = [
  { id: "PRJ-NH-048", name: "NH-19 6-Laning Varanasi Bypass Corridor", sub: "NHIDCL RO-IV Varanasi", type: "Highway", districts: "Varanasi, Chandauli", req: "485.4 Ac", acq: "218.6 Ac", cases: 4, vest: 45.0, status: "ACTIVE" },
  { id: "PRJ-DFCC-102", name: "Western Dedicated Freight Corridor (Dadri-Rewari Feeder)", sub: "Dedicated Freight Corridor Corp.", type: "Railway", districts: "Gautam Buddha Nagar", req: "312.0 Ac", acq: "198.4 Ac", cases: 3, vest: 63.6, status: "ACTIVE" },
  { id: "PRJ-IND-304", name: "Bundelkhand Defense & Industrial Corridor - Node A", sub: "UP Expressways Industrial Dev.", type: "Industrial Corridor", districts: "Jhansi, Jalaun", req: "850.0 Ac", acq: "340.2 Ac", cases: 5, vest: 40.0, status: "ACTIVE" },
  { id: "PRJ-IRR-089", name: "Ken-Betwa National River Link Canal Reach IV", sub: "Ken-Betwa Link Project Authority", type: "Irrigation", districts: "Banda, Mahoba", req: "640.0 Ac", acq: "110.5 Ac", cases: 4, vest: 17.3, status: "ACTIVE" },
  { id: "PRJ-REN-512", name: "Vindhya Ultra Mega Solar Park 1200MW Transmission", sub: "Solar Energy Corporation of India", type: "Renewable Energy", districts: "Mirzapur, Sonbhadra", req: "280.0 Ac", acq: "195.0 Ac", cases: 3, vest: 69.6, status: "ACTIVE" },
  { id: "PRJ-URB-215", name: "Varanasi Inter-Modal Transit Terminal", sub: "UP Metro Rail Corporation (UPMRC)", type: "Urban Development", districts: "Varanasi", req: "140.0 Ac", acq: "15.0 Ac", cases: 2, vest: 10.7, status: "PLANNING" },
];

const cases = [
  { id: "LA-2026-00128", proj: "PRJ-NH-048", title: "Bypass Section Chainage 18+200 to 22+800", sub: "Construction of 6-lane elevated expressway", dist: "Varanasi", area: "48.5", parcels: 24, stage: "Desk Validation", owner: "Land Acquisition Officer…", pri: "HIGH" },
  { id: "LA-2026-00129", proj: "PRJ-NH-048", title: "Toll Plaza & Service Area Requisition", sub: "Development of 16-lane electronic toll plaza", dist: "Chandauli", area: "32.4", parcels: 16, stage: "Returned / Correction", owner: "Project Implementing Agency…", pri: "CRITICAL" },
  { id: "LA-2026-00130", proj: "PRJ-REN-512", title: "400kV Substation & Pylon Footprint", sub: "Land acquisition for 400kV GIS switching station", dist: "Mirzapur", area: "62.4", parcels: 32, stage: "Field Verification", owner: "Field Revenue Inspector…", pri: "HIGH" },
  { id: "LA-2026-00131", proj: "PRJ-DFCC-102", title: "Dadri Industrial Yard Rail RoW Expansion", sub: "Permanent land acquisition for electrified siding", dist: "Gautam Buddha Nagar", area: "94.2", parcels: 58, stage: "CALA Review", owner: "Competent Authority…", pri: "HIGH" },
  { id: "LA-2026-00132", proj: "PRJ-IRR-089", title: "Gravity Feeder Canal Reach IV Alignment", sub: "Acquisition of 14.5 km canal strip, service road", dist: "Banda", area: "142.0", parcels: 84, stage: "DM Approval", owner: "District Magistrate…", pri: "CRITICAL" },
  { id: "LA-2026-00133", proj: "PRJ-IND-304", title: "Manufacturing Node A Core Logistics Block", sub: "Mega industrial land block for heavy machinery", dist: "Jhansi", area: "180.5", parcels: 96, stage: "Record Freeze", owner: "Directorate of Land Records…", pri: "HIGH" },
  { id: "LA-2026-00134", proj: "PRJ-NH-048", title: "Interchange Ramp at Babatpur Airport Link", sub: "Trumpet interchange providing signal-free entry", dist: "Varanasi", area: "34.0", parcels: 18, stage: "Acquired", owner: "Joint Possession Committee…", pri: "HIGH" },
  { id: "LA-2026-00135", proj: "PRJ-IND-304", title: "Ancillary Water Supply Pipeline Corridor", sub: "Underground raw water pipeline strip", dist: "Jhansi", area: "18.2", parcels: 12, stage: "Draft", owner: "Project Implementing Agency…", pri: "MEDIUM" },
];

const documents = [
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

const workflowPhases = [
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

const milestones = [
  { caseId: "LA-2026-00128", desc: "Section 3A Requisition Submission by PIA", sub: "Requisition submitted within target schedule", sec: "NH Act 1956 Sec 3A(1)", date: "2026-08-25", status: "COMPLETED", auth: "NHIDCL RO-IV Varanasi", delay: "On Schedule" },
  { caseId: "LA-2026-00128", desc: "Desk Validation & RoR Verification by LAO", sub: "Desk validation ongoing; 18 of 24 parcels verified", sec: "Revenue Rules 2016", date: "2026-09-30", status: "IN PROGRESS", auth: "Special LAO (NH-19)", delay: "On Schedule" },
  { caseId: "LA-2026-00128", desc: "Joint Measurement Survey (JMS) & DGPS Geo-referencing", sub: "Scheduled to commence immediately after validation", sec: "NH Act 1956 Sec 3B", date: "2026-10-25", status: "NOT STARTED", auth: "Tehsil Revenue Staff", delay: "On Schedule" },
  { caseId: "LA-2026-00129", desc: "Response to LAO Return Regarding Khasra 114/2 Discrepancy", sub: "Awaiting certified RoR extract from Tehsil", sec: "SLAO Scrutiny Rule 14", date: "2026-10-10", status: "DELAYED", auth: "NHIDCL RO-IV Varanasi", delay: "+5 days" },
  { caseId: "LA-2026-00130", desc: "Joint Measurement Survey (JMS) Finalization", sub: "Field teams currently verifying boundaries on ground", sec: "RFCTLARR 2013 Sec 12", date: "2026-09-28", status: "IN PROGRESS", auth: "Sub-Divisional Officer", delay: "On Schedule" },
  { caseId: "LA-2026-00131", desc: "Section 20E Final Declaration Publication in Official Gazette", sub: "Draft submitted to Ministry of Railways", sec: "Railways Act Sec 20E", date: "2026-10-05", status: "IN PROGRESS", auth: "CALA / ADM Dadri", delay: "On Schedule" },
  { caseId: "LA-2026-00132", desc: "Section 19 Final Sanction Order by District Collector", sub: "R&R package file undergoing supplementary scrutiny", sec: "RFCTLARR 2013 Sec 19", date: "2026-09-22", status: "DELAYED", auth: "District Magistrate", delay: "+4 days" },
];

const notifGroups = ["All Notifications", "Action Required", "Workflow Updates", "Deadlines & Delays", "Document & OCR", "System Gazettes"];
const notifCounts: Record<string, number> = { "All Notifications": 10, "Action Required": 2, "Workflow Updates": 3, "Deadlines & Delays": 1, "Document & OCR": 2, "System Gazettes": 2 };
const notifItems = [
  { urgent: true, icon: "alert", title: "Action Required: Proposal Returned by SLAO Chandauli", desc: "Case LA-2026-00129 (Toll Plaza Km 28+400) was returned. Discrepancy on Khasra 114/2 requires revised Land Schedule. Deadline: 10 Oct 2026.", meta: "Yesterday at 3:30 PM · Case: LA-2026-00129 · ACTION REQUIRED" },
  { urgent: true, icon: "alert", title: "Action Required: Waterbody Restriction Objection", desc: "CALA Urban Varanasi returned Case LA-2026-00136 regarding Survey Plot 88 waterbody restriction under Supreme Court order.", meta: "2 days ago · Case: LA-2026-00136 · ACTION REQUIRED" },
  { urgent: false, icon: "check", title: "Desk Validation Update: Case LA-2026-00128", desc: "LAO Varanasi completed desk verification of 18 out of 24 parcels for NH-19 Bypass Section.", meta: "Today at 10:15 AM · Case: LA-2026-00128 · WORKFLOW UPDATE" },
  { urgent: false, icon: "clock", title: "Milestone Delayed: DM Sanction Order Banda", desc: "Ken-Betwa Canal Reach IV (Case LA-2026-00132) Section 19 sanction order is overdue by 4 days.", meta: "Yesterday at 11:30 AM · Case: LA-2026-00132 · DEADLINE" },
  { urgent: false, icon: "clock", title: "AI Processing Complete: Northern Spur Link", desc: "AI neural extraction finished for Case LA-2026-00137. 54 fields extracted with 88% overall confidence.", meta: "2 hours ago · Case: LA-2026-00137 · DOCUMENT" },
  { urgent: false, icon: "check", title: "Field Survey Commenced: Mirzapur Solar Corridor", desc: "Joint Measurement Survey (JMS) with DGPS equipment started on-ground for Case LA-2026-00130.", meta: "24 Sep 2026 · Case: LA-2026-00130 · WORKFLOW UPDATE" },
  { urgent: false, icon: "clock", title: "System Gazette Link Synchronized", desc: "National E-Gazette integration synchronized notification references for NH-19 Project Corridor.", meta: "23 Sep 2026 · SYSTEM" },
];

const reportBars = [
  { label: "Total Land Required (Project Scope)", v: "2707.4 Acres (100.0%)", pct: 100, color: "bg-sky-400" },
  { label: "Land Identified in Land Schedules", v: "2545.0 Acres (94.0%)", pct: 94, color: "bg-sky-400" },
  { label: "Land Under LAO Desk Validation", v: "2003.5 Acres (74.0%)", pct: 74, color: "bg-blue-500" },
  { label: "Land Field Verified (Joint Measurement Survey)", v: "1570.3 Acres (58.0%)", pct: 58, color: "bg-teal-400" },
  { label: "Land Statutorily Notified (Sec 3D / Sec 19)", v: "1191.3 Acres (44.0%)", pct: 44, color: "bg-violet-500" },
  { label: "Land Acquired & Transferred to PIA", v: "1077.7 Acres (39.8%)", pct: 40, color: "bg-emerald-400" },
];

const reportProjects = [
  { id: "PRJ-NH-048", name: "NH-19 6-Laning Varanasi Bypass Corridor", dist: "Varanasi, Chandauli", req: "485.4", acq: "218.6", vest: "45.0%", budget: "Rs. 680 Cr" },
  { id: "PRJ-DFCC-102", name: "Western Dedicated Freight Corridor (Dadri-Rewari-Vadodara Feeder)", dist: "Gautam Buddha Nagar, Bulandshahr", req: "312.0", acq: "198.4", vest: "63.6%", budget: "Rs. 940 Cr" },
  { id: "PRJ-IND-304", name: "Bundelkhand Defense & Industrial Manufacturing Corridor - Node A", dist: "Jhansi, Jalaun", req: "850.0", acq: "340.2", vest: "40.0%", budget: "Rs. 1450 Cr" },
  { id: "PRJ-IRR-089", name: "Ken-Betwa National River Link Canal Reach IV Package", dist: "Banda, Mahoba", req: "640.0", acq: "110.5", vest: "17.3%", budget: "Rs. 720 Cr" },
  { id: "PRJ-REN-512", name: "Vindhya Ultra Mega Solar Park 1200MW Transmission Right-of-Way", dist: "Mirzapur, Sonbhadra", req: "280.0", acq: "195.0", vest: "69.6%", budget: "Rs. 310 Cr" },
];

const allowed = [
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

const restricted = [
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

/* ================= HELPERS ================= */

function StagePill({ stage }: { stage: string }) {
  const s = stage.toLowerCase();
  const tone =
    s.includes("return") ? "border-red-200 bg-red-50 text-red-700"
    : s.includes("desk") ? "border-amber-200 bg-amber-50 text-amber-800"
    : s.includes("field") ? "border-teal-200 bg-teal-50 text-teal-800"
    : s.includes("cala") || s.includes("dm") ? "border-violet-200 bg-violet-50 text-violet-800"
    : s.includes("freeze") || s.includes("acquir") ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{stage}</span>;
}

function PriPill({ p }: { p: string }) {
  const tone = p === "CRITICAL" ? "border-red-200 bg-red-50 text-red-700" : p === "HIGH" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black tracking-wide ${tone}`}>{p}</span>;
}

function DocState({ s }: { s: string }) {
  const tone = s === "VALIDATED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : s === "REJECTED" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}

function MStatus({ s }: { s: string }) {
  const tone = s === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : s === "DELAYED" ? "border-amber-200 bg-amber-50 text-amber-800" : s === "IN PROGRESS" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-500";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}
function TableShell({ children, minWidth = "min-w-[960px]" }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto"><table className={`w-full ${minWidth} text-left`}>{children}</table></div>;
}
function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={14} className="shrink-0 text-slate-400" />
    </label>
  );
}

/* ================= MAIN ================= */

function PiaPortal() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [query, setQuery] = useState("");
  const [caseTab, setCaseTab] = useState("All Cases");
  const [notifTab, setNotifTab] = useState("All Notifications");
  const [wizardStep, setWizardStep] = useState(1);

  const nav = (key: ViewKey) => () => {
    setView(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.id} ${p.name} ${p.districts} ${p.type}`.toLowerCase().includes(q));
  }, [query]);

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      const matches = !q || `${c.id} ${c.title} ${c.dist} ${c.proj}`.toLowerCase().includes(q);
      if (caseTab === "All Cases") return matches;
      if (caseTab.startsWith("Action")) return matches && c.stage.includes("Return");
      if (caseTab.startsWith("Draft")) return matches && c.stage === "Draft";
      if (caseTab.startsWith("Submitted")) return matches && (c.stage.includes("Field") || c.stage.includes("Desk"));
      if (caseTab.startsWith("Under Validation")) return matches && (c.stage.includes("Desk") || c.stage.includes("Field"));
      if (caseTab.startsWith("CALA")) return matches && (c.stage.includes("CALA") || c.stage.includes("DM") || c.stage.includes("Freeze"));
      if (caseTab.startsWith("Vested")) return matches && c.stage === "Acquired";
      return matches;
    });
  }, [query, caseTab]);

  const sidebarGroups = [
    {
      title: "Requisition Workspace",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: view === "dashboard", onClick: nav("dashboard") },
        { label: "Projects", icon: <FolderKanban size={16} />, active: view === "projects", onClick: nav("projects") },
        { label: "Acquisition Cases", icon: <FileText size={16} />, badge: "2 action", active: view === "cases" || view === "proposal", onClick: nav("cases") },
        { label: "GIS Parcel Explorer", icon: <Map size={16} />, active: view === "gis", onClick: nav("gis") },
        { label: "Documents", icon: <FileText size={16} />, active: view === "documents", onClick: nav("documents") },
        { label: "Workflow Tracker", icon: <Workflow size={16} />, active: view === "workflow", onClick: nav("workflow") },
        { label: "Milestones", icon: <Flag size={16} />, active: view === "milestones", onClick: nav("milestones") },
        { label: "Notifications", icon: <Bell size={16} />, badge: 4, active: view === "notifications", onClick: nav("notifications") },
        { label: "Reports & Schedule", icon: <FileBarChart size={16} />, active: view === "reports", onClick: nav("reports") },
      ],
    },
    {
      title: "Institutional",
      items: [
        { label: "Officer Profile", icon: <User size={16} />, active: view === "officer", onClick: nav("officer") },
        { label: "PIA Profile & RBAC", icon: <Building2 size={16} />, active: view === "profile", onClick: nav("profile") },
        { label: "Help & Statutory SOP", icon: <BookOpen size={16} />, active: view === "help", onClick: nav("help") },
      ],
    },
  ];

  return (
    <PortalLayout
      portalBadge="PIA Portal"
      portalSub="Project Implementing Agency • NHIDCL Regional Office IV"
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={`PIA • ${OFFICER.badge}`}
      activeContext="Northern Corridor Zone IV (Uttar Pradesh & Bihar)"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "PIA Organization & Profile",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile",
        onViewOfficerProfile: nav("officer"),
        onViewOrgProfile: nav("profile"),
        onResetDemo: () => {
          setQuery("");
          setCaseTab("All Cases");
          setNotifTab("All Notifications");
          setWizardStep(1);
          setView("dashboard");
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 4,
        onNotificationClick: nav("notifications"),
      }}
      topActions={
        <button onClick={nav("proposal")} className="hidden items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 lg:inline-flex">
          <Plus size={14} /> New Acquisition Proposal
        </button>
      }
    >
      {/* ---------- DASHBOARD ---------- */}
      {view === "dashboard" && (
        <>
          <GreetingHeader
            eyebrow="Requisition Workspace • NHIDCL RO-IV"
            title="PIA Acquisition Dashboard"
            subtitle="Initiate, manage and monitor land acquisition proposals across your projects."
            actions={
              <>
                <button onClick={nav("gis")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">Open GIS Explorer</button>
                <button onClick={nav("proposal")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">+ Initiate Proposal</button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <PortalCard key={k.label} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${k.tone}`}>{k.value}</span>
                </div>
                <p className="mt-1 text-3xl font-black text-[#0B1F44]">{k.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{k.sub}</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5 border-red-200">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><TriangleAlert size={15} /> Action Required by PIA <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-black">4 ITEMS</span></h2>
              <p className="text-[11px] text-slate-500">Prompt response required to avoid statutory delay</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {actionItems.map((a) => (
                <div key={a.caseId + a.title} className="rounded-xl border border-red-200 bg-red-50/50 p-3.5">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold text-slate-800">{a.caseId} <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-white">{a.tag}</span></p>
                  <p className="mt-1.5 text-xs font-bold text-slate-800">{a.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{a.desc}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-slate-500">{a.meta}</p>
                  <button onClick={nav("cases")} className="mt-2.5 w-full rounded-lg bg-slate-900 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700">Respond →</button>
                </div>
              ))}
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
            <PortalCard>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#0B1F44]">Project Portfolio Land Requisition Pipeline</h2>
                  <p className="text-[11px] text-slate-500">Aggregate statutory acquisition progress across 6 major infrastructure projects</p>
                </div>
                <p className="text-right text-xs"><span className="block text-[10px] uppercase tracking-wider text-slate-400">Total Requirement</span><span className="font-mono font-black text-slate-900">2,707.4 Acres</span></p>
              </div>
              <div className="mt-4 space-y-3.5">
                {pipeline.map((p) => (
                  <div key={p.label}>
                    <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium text-slate-600">{p.label}</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-500">{p.v}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Direct sync with District Revenue RoR & SLAO Portal</p>
            </PortalCard>

            <PortalCard>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0B1F44]">Authoritative Workflow Updates</h2>
                <span className="text-[11px] text-slate-400">Live Timeline</span>
              </div>
              <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                {[
                  ["Acquisition Requisition Draft Initiated", "Requisition draft prepared for NH-19 Varanasi Bypass Section Chainage 18+200."],
                  ["Case Submitted to National Gateway", "Case transmitted formally accompanied with administrative sanction and digital alignment drawings."],
                  ["Automated Document Ingestion & Integrity Validation", "SHA-256 verification, land polygonal contiguity, alignment polygon vectorized."],
                  ["Cadastral Neural OCR & Extraction Completed", "141 land-record fields extracted, 121 high confidence (84.6%). 20 fields flagged for human review."],
                  ["Case Assigned to Special Land Acquisition Officer (SLAO)", "SLAO desk scrutiny underway. Comparing extracted land schedules against Bhulekh RoR."],
                ].map(([t, d]) => (
                  <div key={t}>
                    <p className="text-xs font-bold text-slate-800">{t}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{d}</p>
                  </div>
                ))}
              </div>
              <button onClick={nav("workflow")} className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">View Full Audit Timeline</button>
            </PortalCard>
          </div>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-bold text-[#0B1F44]">Active Acquisition Cases</h2><p className="text-[11px] text-slate-500">Current proposals under formulation, validation, and statutory approval</p></div>
              <button onClick={nav("cases")} className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">View All (10)</button>
            </div>
            <TableShell minWidth="min-w-[900px]">
              <thead><tr><Th>Case ID</Th><Th>Project Name</Th><Th>Target Area / Block</Th><Th>Land (Acres)</Th><Th>Parcels</Th><Th>Workflow Stage</Th><Th>Current Owner</Th><Th>Priority</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {cases.slice(0, 6).map((c) => (
                  <tr key={c.id} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-emerald-700">{c.id}</Td>
                    <Td className="max-w-[180px] truncate font-medium text-slate-700">{c.proj === "PRJ-NH-048" ? "NH-19 6-Laning Varanasi Bypass" : c.proj === "PRJ-REN-512" ? "Vindhya Ultra Mega Solar Park" : c.proj === "PRJ-DFCC-102" ? "Western Dedicated Freight Corridor" : c.proj === "PRJ-IRR-089" ? "Ken-Betwa National River Link" : "Bundelkhand Defense & Industrial"}</Td>
                    <Td className="text-slate-600">{c.dist}</Td>
                    <Td className="font-mono font-semibold">{c.area}</Td>
                    <Td className="font-mono">{c.parcels}</Td>
                    <Td><StagePill stage={c.stage} /></Td>
                    <Td className="max-w-[150px] truncate text-slate-500">{c.owner}</Td>
                    <Td><PriPill p={c.pri} /></Td>
                    <Td className="text-right"><button onClick={nav("workflow")} className="text-[11px] font-bold text-slate-500 hover:text-slate-900">View</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ---------- PROJECTS ---------- */}
      {view === "projects" && (
        <>
          <GreetingHeader
            eyebrow="Registered Portfolio • NHIDCL RO-IV"
            title="Infrastructure Projects"
            subtitle="Registered public infrastructure projects under NHIDCL Regional Office IV jurisdiction"
            actions={
              <button onClick={nav("proposal")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Plus size={14} /> Register New Project</button>
            }
          />
          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Project ID, Name, Department, District…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Project Types" />
              <FilterSelect label="All Districts" />
            </div>
            <p className="mt-2.5 text-xs text-slate-500">Showing {filteredProjects.length} of {projects.length} projects</p>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1000px]">
              <thead><tr><Th>Project ID</Th><Th>Project Name</Th><Th>Type</Th><Th>Districts</Th><Th className="text-right">Land Required</Th><Th className="text-right">Land Acquired</Th><Th className="text-center">Active Cases</Th><Th>Vesting %</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{p.id}</Td>
                    <Td><p className="max-w-[220px] truncate font-bold text-slate-800">{p.name}</p><p className="max-w-[220px] truncate text-[11px] text-slate-400">{p.sub}</p></Td>
                    <Td><span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{p.type}</span></Td>
                    <Td className="max-w-[160px] truncate text-slate-600">{p.districts}</Td>
                    <Td className="text-right font-mono font-semibold">{p.req}</Td>
                    <Td className="text-right font-mono font-bold text-emerald-700">{p.acq}</Td>
                    <Td className="text-center font-mono">{p.cases}</Td>
                    <Td>
                      <p className="font-mono text-[11px] font-bold">{p.vest.toFixed(1)}%</p>
                      <span className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${p.vest}%` }} /></span>
                    </Td>
                    <Td><span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{p.status}</span></Td>
                    <Td>
                      <span className="flex justify-end gap-2">
                        <button className="text-[11px] font-bold text-slate-500 hover:text-slate-900">View</button>
                        <button onClick={nav("proposal")} className="whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">+ Requisition</button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>

          <div className="mt-4 space-y-3 lg:hidden">
            {filteredProjects.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-mono text-xs font-bold text-emerald-700">{p.id}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">{p.districts} · {p.type}</p>
                <p className="mt-2 font-mono text-xs">Required: <b>{p.req}</b> · Acquired: <b className="text-emerald-700">{p.acq}</b> · {p.vest.toFixed(1)}%</p>
                <div className="mt-2 flex gap-2">
                  <button className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">View</button>
                  <button onClick={nav("proposal")} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white">+ Requisition</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------- CASES ---------- */}
      {view === "cases" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Land Acquisition Cases</h1>
              <p className="mt-1 text-sm text-slate-500">Authoritative statutory land acquisition requisition cases under PIA stewardship</p>
            </div>
            <button onClick={nav("proposal")} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Plus size={14} /> New Acquisition Proposal</button>
          </div>

          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
            {[["All Cases", 10], ["Action Required (Returned)", 2], ["Drafts", 1], ["Submitted / Processing", 1], ["Under Validation (LAO)", 2], ["CALA / DM Review", 3], ["Vested / Acquired", 1]].map(([t, n]) => (
              <button key={t as string} onClick={() => setCaseTab(t as string)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 ${caseTab === t ? "border-b-2 border-emerald-600 bg-emerald-50/60 text-emerald-800" : "text-slate-500 hover:text-slate-800"}`}>
                {t} <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${caseTab === t ? "bg-emerald-600 text-white" : (t as string).startsWith("Action") ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>{n as number}</span>
              </button>
            ))}
          </div>

          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Requisition Title, Village, Khasra, District…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Projects" />
              <FilterSelect label="All Priorities" />
            </div>
            <p className="mt-2.5 text-xs text-slate-500">Showing {filteredCases.length} of {cases.length} acquisition cases</p>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1100px]">
              <thead><tr><Th>Case ID</Th><Th>Project</Th><Th>Requisition Title & Purpose</Th><Th>District / Area</Th><Th className="text-right">Required (Ac)</Th><Th className="text-center">Parcels</Th><Th>Workflow Stage</Th><Th>Current Owner</Th><Th>Priority</Th></tr></thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id} className={`hover:bg-sky-50/40 ${c.stage.includes("Return") ? "bg-red-50/40" : ""}`}>
                    <Td className={`whitespace-nowrap font-mono font-bold ${c.stage.includes("Return") ? "text-red-600" : "text-emerald-700"}`}>{c.id}</Td>
                    <Td><p className="font-bold text-slate-800">{c.proj}</p><p className="max-w-[170px] truncate text-[11px] text-slate-400">{c.title}</p></Td>
                    <Td><p className="max-w-[230px] truncate font-semibold text-slate-700">{c.title}</p><p className="max-w-[230px] truncate text-[11px] text-slate-400">{c.sub}</p></Td>
                    <Td><p className="font-medium text-slate-700">{c.dist}</p></Td>
                    <Td className="text-right font-mono font-bold">{c.area}</Td>
                    <Td className="text-center font-mono">{c.parcels}</Td>
                    <Td><StagePill stage={c.stage} /></Td>
                    <Td className="max-w-[150px] truncate text-slate-500">{c.owner}</Td>
                    <Td><PriPill p={c.pri} /></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ---------- PROPOSAL WIZARD ---------- */}
      {view === "proposal" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <button onClick={nav("cases")} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"><ArrowLeft size={16} /></button>
              <span>
                <span className="block text-sm font-black text-[#0B1F44]">New Land Acquisition Proposal Wizard</span>
                <span className="block text-[11px] text-slate-500">Initiate formal statutory land requisition docket under RFCTLARR 2013 / NH Act 1956</span>
              </span>
            </p>
            <p className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Last saved: 26 Sep 2026, 12:42 PM</span>
              <button className="rounded border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600">Save Draft</button>
              <button className="font-semibold hover:text-slate-800">Discard</button>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {["Project Selection", "Acquisition Requirement", "Land & Parcel Schedule", "Supporting Documents", "Review & Readiness", "PIA Declaration & Submit"].map((s, i) => (
              <button key={s} onClick={() => setWizardStep(i + 1)} className={`rounded-xl border p-2.5 text-left ${wizardStep === i + 1 ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <p className="text-[10px] font-bold text-slate-400">Step {i + 1}</p>
                <p className={`text-[11px] font-bold leading-tight ${wizardStep === i + 1 ? "text-emerald-900" : "text-slate-600"}`}>{s}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{i === 0 ? "Select sponsoring project" : i === 1 ? "Purpose & statutory scope" : i === 2 ? "Khasra & khata details" : i === 3 ? "Upload alignment & DPR" : i === 4 ? "Pre-submission validation" : "Formal statutory lodging"}</p>
              </button>
            ))}
          </div>

          <PortalCard className="mt-4">
            <h2 className="text-sm font-bold text-[#0B1F44]">Step {wizardStep} — {["Project Selection", "Acquisition Requirement", "Land & Parcel Schedule", "Supporting Documents", "Review & Readiness", "PIA Declaration & Submit"][wizardStep - 1]}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Select the authorized infrastructure project for which land acquisition is being requisitioned.</p>

            {wizardStep === 1 && (
              <div className="mt-4 space-y-3">
                <label className="block text-xs">
                  <span className="font-bold text-slate-700">Select Sponsoring Project *</span>
                  <span className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium">PRJ-NH-048 — NH-19 6-Laning Varanasi Bypass Corridor (Highway) <ChevronDown size={15} className="text-slate-400" /></span>
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-800">Project Scope & Statutory Summary</p>
                    <p className="font-mono text-[10px] text-slate-400">NH-19-WNS-PKG2</p>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Sponsoring Ministry:</p><p className="font-semibold">Ministry of Road Transport and Highways (MoRTH)</p></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Executing Agency:</p><p className="font-semibold">NHIDCL RO-IV Varanasi</p></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Target Districts:</p><p className="font-semibold">Varanasi, Chandauli</p></div>
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-500"><span className="font-bold">Description:</span> Greenfield 6-lane bypass corridor spanning 42.6 km connecting Mohan Sarai to Mughal Sarai to de-congest national highway traffic.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[["State", "Uttar Pradesh"], ["District *", "Varanasi"], ["Target Block / Tehsil *", "Kashi Vidyapeeth"]].map(([l, v]) => (
                    <label key={l} className="block text-xs"><span className="font-semibold text-slate-500">{l}</span><span className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium">{v} {l.includes("*") && <ChevronDown size={14} className="text-slate-400" />}</span></label>
                  ))}
                </div>
                <label className="block text-xs"><span className="font-semibold text-slate-500">Target Alignment / Area Description</span><span className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium">Trapezoidal parcel cluster bordering the eastern alignment boundary.</span></label>
              </div>
            )}

            {wizardStep > 1 && (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                <p className="font-bold text-slate-700">Step {wizardStep} form section</p>
                <p className="mt-1">Continue the wizard — fields for {["", "purpose & statutory scope", "Khasra / Khata schedule rows", "alignment plan & DPR uploads", "pre-submission readiness checklist", "final PIA declaration & lodging"][wizardStep]} appear here, following the same light-theme pattern as Step 1.</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button disabled={wizardStep === 1} onClick={() => setWizardStep((s) => Math.max(1, s - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-500 disabled:opacity-40"><ArrowLeft size={13} /> Previous Step</button>
              <button onClick={() => setWizardStep((s) => Math.min(6, s + 1))} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">{wizardStep === 6 ? "Submit Proposal →" : `Continue to Step ${wizardStep + 1} →`}</button>
            </div>
          </PortalCard>
        </>
      )}

      {/* ---------- GIS ---------- */}
      {view === "gis" && (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><Map size={24} className="text-emerald-600" /> GIS Cadastral Parcel Explorer</h1>
              <p className="mt-1 text-sm text-slate-500">Interactive cadastral boundary map with DGPS corridor overlay & revenue parcel status</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><ShieldCheck size={14} className="text-emerald-600" /> Authoritative Cadastral Geometry (Read-Only)</span>
          </div>

          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input placeholder="Search Khasra / Survey Number, Village (e.g. 410, 114, Rameshwar)…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Projects" />
              <FilterSelect label="All Acquisition Statuses" />
            </div>
            <div className="mt-3 flex flex-col gap-2.5 text-xs lg:flex-row lg:items-center lg:justify-between">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-medium text-slate-600">
                <span className="font-bold text-slate-500">Map Layers:</span>
                {[["Satellite Orthophoto", true], ["Cadastral Boundaries", true], ["Alignment Corridor Buffer", true]].map(([l, on]) => (
                  <label key={l as string} className="inline-flex items-center gap-1.5"><input type="checkbox" defaultChecked={on as boolean} className="h-3.5 w-3.5 accent-emerald-600" />{l}</label>
                ))}
                <label className="inline-flex items-center gap-1.5 font-semibold text-amber-700"><input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" /> Show Contested Only</label>
              </p>
              <p className="flex gap-2">
                <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-500">＋</button>
                <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-500">－</button>
                <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-500">⟳ Reset</button>
              </p>
            </div>
          </PortalCard>

          <PortalCard className="mt-4 !p-4">
            {/* Stylized cadastral map */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#0e1a33] p-4 sm:p-8" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "36px 36px" }}>
              <svg viewBox="0 0 720 340" className="mx-auto w-full max-w-[760px]">
                {/* corridor */}
                <g opacity={0.9}>
                  <rect x={90} y={70} width={560} height={44} rx={3} transform="rotate(12 360 92)" fill="rgba(125,211,252,.12)" stroke="rgba(125,211,252,.55)" strokeDasharray="7 5" />
                  <line x1={110} y1={92} x2={630} y2={150} stroke="#7dd3fc" strokeWidth={2.5} strokeDasharray="10 7" />
                  <text x={330} y={118} fill="#7dd3fc" fontSize={11} fontWeight={700} transform="rotate(12 330 118)">NH-19 PROPOSED EXPRESSWAY CENTERLINE (CHAINAGE 18+200 TO 22+800)</text>
                </g>
                {/* parcels */}
                <g fontSize={10} fontWeight={700} textAnchor="middle">
                  <g transform="rotate(-8 220 130)">
                    <rect x={170} y={80} width={70} height={60} fill="rgba(59,130,246,.35)" stroke="#60a5fa" />
                    <text x={205} y={108} fill="#fff">410/1</text><text x={205} y={120} fill="#bfdbfe" fontSize={8}>2.5 Ac</text>
                    <rect x={240} y={80} width={70} height={60} fill="rgba(59,130,246,.35)" stroke="#60a5fa" />
                    <text x={275} y={105} fill="#fff">411</text><text x={275} y={117} fill="#bfdbfe" fontSize={8}>3.1 Ac</text>
                    <rect x={310} y={80} width={70} height={60} fill="rgba(245,158,11,.4)" stroke="#f59e0b" />
                    <text x={345} y={105} fill="#fff">412/1</text><text x={345} y={117} fill="#fde68a" fontSize={8}>1.9 Ac</text>
                    <rect x={170} y={140} width={70} height={64} fill="rgba(59,130,246,.35)" stroke="#60a5fa" />
                    <text x={205} y={172} fill="#fff">504</text><text x={205} y={184} fill="#bfdbfe" fontSize={8}>4.2 Ac</text>
                    <rect x={240} y={140} width={70} height={64} fill="rgba(59,130,246,.35)" stroke="#60a5fa" />
                    <text x={275} y={170} fill="#fff">505/2</text><text x={275} y={182} fill="#bfdbfe" fontSize={8}>2.9 Ac</text>
                    <rect x={310} y={140} width={70} height={64} fill="rgba(59,130,246,.35)" stroke="#60a5fa" />
                    <text x={345} y={168} fill="#fff">506</text><text x={345} y={180} fill="#bfdbfe" fontSize={8}>3.4 Ac</text>
                  </g>
                  <g transform="rotate(-8 500 130)">
                    <rect x={455} y={80} width={70} height={60} fill="rgba(245,158,11,.4)" stroke="#f59e0b" />
                    <text x={490} y={108} fill="#fff">114/2</text><text x={490} y={120} fill="#fde68a" fontSize={8}>1.6 Ac</text>
                    <rect x={525} y={80} width={70} height={60} fill="rgba(148,163,184,.3)" stroke="#94a3b8" />
                    <text x={560} y={105} fill="#fff">118</text><text x={560} y={117} fill="#e2e8f0" fontSize={8}>2.1 Ac</text>
                    <rect x={455} y={140} width={70} height={64} fill="rgba(148,163,184,.3)" stroke="#94a3b8" />
                    <text x={490} y={168} fill="#fff">215</text><text x={490} y={180} fill="#e2e8f0" fontSize={8}>3.5 Ac</text>
                  </g>
                  <g transform="rotate(-8 300 260)">
                    <rect x={220} y={230} width={80} height={60} fill="rgba(45,212,191,.25)" stroke="#2dd4bf" />
                    <text x={260} y={258} fill="#fff">78/1</text><text x={260} y={270} fill="#99f6e4" fontSize={8}>5.6 Ac</text>
                    <rect x={300} y={230} width={80} height={60} fill="rgba(45,212,191,.25)" stroke="#2dd4bf" />
                    <text x={340} y={256} fill="#fff">82</text><text x={340} y={268} fill="#99f6e4" fontSize={8}>4.8 Ac</text>
                  </g>
                  <g transform="rotate(-8 480 260)">
                    <rect x={440} y={230} width={80} height={60} fill="rgba(52,211,153,.3)" stroke="#34d399" />
                    <text x={480} y={258} fill="#fff">320</text><text x={480} y={270} fill="#a7f3d0" fontSize={8}>6.2 Ac</text>
                  </g>
                </g>
              </svg>
              <div className="mt-2 w-fit rounded-xl border border-white/15 bg-white/95 p-3 text-[11px] shadow-lg">
                <p className="font-bold text-slate-800">Cadastral Parcel Legend</p>
                <div className="mt-1.5 grid grid-cols-1 gap-1 text-slate-600 sm:grid-cols-2">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Identified in Schedule</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Desk Validated (LAO)</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> Field Verified (JMS)</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Acquired & Vested</span>
                  <span className="flex items-center gap-1.5 font-semibold text-amber-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Contested / Objection Flagged</span>
                </div>
              </div>
            </div>
          </PortalCard>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-600">
            <p className="flex items-start gap-2"><CircleAlert size={14} className="mt-0.5 shrink-0 text-emerald-600" /><span><span className="font-bold text-slate-800">Cadastral GIS Integrity Policy:</span> Cadastral boundary coordinates and revenue polygons are imported directly from State Land Records (Bhulekh / DGPS Survey). PIAs can nominate and select parcels for acquisition requisition proposals, but cannot manipulate official boundary vectors without Tehsil Joint Measurement Survey (JMS) validation.</span></p>
          </div>
        </>
      )}

      {/* ---------- DOCUMENTS ---------- */}
      {view === "documents" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Document Repository & Dossiers</h1>
              <p className="mt-1 text-sm text-slate-500">Authoritative requisition dockets, alignment blueprints, and AI extraction logs</p>
            </div>
            <button className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Upload size={14} /> Upload Supporting Document</button>
          </div>

          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Document ID, Filename, Case ID…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Requisition Cases" />
              <FilterSelect label="All Document Categories" />
              <FilterSelect label="All Pipeline States" />
            </div>
            <p className="mt-2.5 text-xs text-slate-500">Showing {documents.length} of {documents.length} documents</p>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1050px]">
              <thead><tr><Th>Document ID</Th><Th>Filename</Th><Th>Case ID</Th><Th>Category</Th><Th className="text-right">Size</Th><Th>Uploaded Date</Th><Th>Processing State</Th><Th className="text-right">AI Confidence</Th><Th className="text-right">Actions</Th></tr></thead>
              <tbody>
                {documents.filter((d) => !query.trim() || `${d.id} ${d.file} ${d.caseId}`.toLowerCase().includes(query.toLowerCase())).map((d) => (
                  <tr key={d.id} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono text-slate-500">{d.id}</Td>
                    <Td><span className="flex max-w-[220px] items-center gap-2 truncate font-medium text-slate-700"><FileText size={14} className="shrink-0 text-emerald-600" /><span className="truncate">{d.file}</span></span></Td>
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{d.caseId}</Td>
                    <Td className="max-w-[170px] truncate text-slate-600">{d.cat}</Td>
                    <Td className="text-right font-mono">{d.size}</Td>
                    <Td className="whitespace-nowrap font-mono text-slate-500">{d.date}</Td>
                    <Td><DocState s={d.state} /></Td>
                    <Td className={`text-right font-mono font-bold ${d.state === "REJECTED" ? "text-amber-600" : d.state.includes("PENDING") ? "text-blue-600" : "text-emerald-600"}`}>{d.conf}</Td>
                    <Td className="text-right"><span className="inline-flex gap-3 text-[11px] font-bold text-slate-500"><button className="hover:text-slate-900">Pipeline</button><button className="hover:text-slate-900"><Download size={14} /></button></span></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ---------- WORKFLOW ---------- */}
      {view === "workflow" && (
        <>
          <GreetingHeader
            eyebrow="Authoritative Lifecycle • PIA → LAO → CALA → Collector"
            title="Cross-Agency Workflow Tracker"
            subtitle="Authoritative lifecycle progression across PIA, LAO, CALA, and Collectorate stages"
          />
          <PortalCard>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Authoritative Land Acquisition Stage Progression</p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {workflowPhases.map((p) => (
                <div key={p.t} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <p className="flex items-center justify-between text-[11px] text-slate-500">{p.n} <span className="font-mono font-bold text-emerald-700">{p.c} Cases</span></p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{p.t}</p>
                  <p className="text-[11px] text-slate-500">{p.s}</p>
                </div>
              ))}
            </div>
          </PortalCard>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-sm font-bold text-[#0B1F44]">Active Cases in Pipeline ({cases.length})</h2>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 lg:w-72">
                <Search size={15} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Case ID or Project…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <TableShell minWidth="min-w-[1000px]">
              <thead><tr><Th>Case ID</Th><Th>Requisition Title</Th><Th>Current Stage</Th><Th>Responsible Role</Th><Th>Assigned Authority Office</Th><Th className="text-right">Land (Ac)</Th><Th className="text-center">Parcels</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {cases.filter((c) => !query.trim() || `${c.id} ${c.title}`.toLowerCase().includes(query.toLowerCase())).map((c) => (
                  <tr key={c.id} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{c.id}</Td>
                    <Td className="max-w-[220px] truncate font-medium text-slate-700">{c.title}</Td>
                    <Td><StagePill stage={c.stage} /></Td>
                    <Td className="max-w-[170px] truncate text-slate-500">{c.owner}</Td>
                    <Td className="max-w-[190px] truncate text-slate-500">Office of Special LAO (NH-19)…</Td>
                    <Td className="text-right font-mono font-bold">{c.area}</Td>
                    <Td className="text-center font-mono">{c.parcels}</Td>
                    <Td className="text-right"><button className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Track</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ---------- MILESTONES ---------- */}
      {view === "milestones" && (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><Flag size={24} className="text-emerald-600" /> Statutory Milestone Tracker</h1>
              <p className="mt-1 text-sm text-slate-500">Tracking Section 3A/3B/3D/3G & Section 11/19 land acquisition statutory deadlines</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800"><TriangleAlert size={14} /> 3 Milestones Delayed / Requiring Action</span>
          </div>

          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input placeholder="Search Milestone, Statutory Section, Authority, Case ID…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Projects" />
              <FilterSelect label="All Milestone Statuses" />
            </div>
            <p className="mt-2.5 text-xs text-slate-500">Showing {milestones.length} of {milestones.length} milestones</p>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1050px]">
              <thead><tr><Th>Case ID</Th><Th>Milestone Description</Th><Th>Statutory Section</Th><Th>Target Date</Th><Th>Status</Th><Th>Responsible Authority</Th><Th>Delay</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.caseId + m.desc} className={`hover:bg-sky-50/40 ${m.status === "DELAYED" ? "bg-amber-50/40" : ""}`}>
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{m.caseId}</Td>
                    <Td><p className="max-w-[260px] font-semibold text-slate-800">{m.desc}</p><p className="max-w-[260px] truncate text-[11px] text-slate-400">{m.sub}</p></Td>
                    <Td className="whitespace-nowrap font-mono text-xs text-slate-600">{m.sec}</Td>
                    <Td className="whitespace-nowrap font-mono text-slate-600">{m.date}</Td>
                    <Td><MStatus s={m.status} /></Td>
                    <Td className="max-w-[170px] truncate text-slate-600">{m.auth}</Td>
                    <Td className={`whitespace-nowrap font-mono text-xs font-bold ${m.delay.startsWith("+") ? "text-red-600" : "text-emerald-600"}`}>{m.delay}</Td>
                    <Td className="text-right"><button className="text-[11px] font-semibold text-slate-500 hover:text-slate-900">Case</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ---------- NOTIFICATIONS ---------- */}
      {view === "notifications" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><Bell size={24} className="text-emerald-600" /> PIA Notification & Action Center</h1>
              <p className="mt-1 text-sm text-slate-500">Real-time updates on statutory filings, LAO return notices, and milestone deadlines</p>
            </div>
            <button className="w-fit rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Mark all as read</button>
          </div>

          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
            {notifGroups.map((g) => (
              <button key={g} onClick={() => setNotifTab(g)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 ${notifTab === g ? "border-b-2 border-emerald-600 bg-emerald-50/60 text-emerald-800" : "text-slate-500 hover:text-slate-800"}`}>
                {g} <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${notifTab === g ? "bg-emerald-600 text-white" : g === "Action Required" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>{notifCounts[g]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {notifItems.map((n) => (
              <PortalCard key={n.title} className={n.urgent ? "!border-red-200 !bg-red-50/40" : ""}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-2.5">
                    {n.icon === "alert" ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-red-500" /> : n.icon === "check" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <Clock3 size={18} className="mt-0.5 shrink-0 text-sky-600" />}
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">{n.title} <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                      <p className="mt-1.5 font-mono text-[10px] text-slate-400">{n.meta}</p>
                    </div>
                  </div>
                  <button onClick={nav("cases")} className="inline-flex w-fit shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white">Action <ArrowRight size={12} /></button>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ---------- REPORTS ---------- */}
      {view === "reports" && (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><FileBarChart size={24} className="text-emerald-600" /> Land Acquisition Progress & Statutory Schedules</h1>
              <p className="mt-1 text-sm text-slate-500">Auditable progress report for Ministry of Road Transport & Highways (MoRTH) & NITI Aayog</p>
            </div>
            <p className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Printer size={14} /> Print Report</button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Download size={14} /> Export Statutory Schedule (XLSX)</button>
            </p>
          </div>

          <PortalCard>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div><h2 className="text-sm font-bold text-[#0B1F44]">National Requisition Pipeline Progression</h2><p className="text-[11px] text-slate-500">Cumulative progress across 6 national infrastructure projects</p></div>
              <p className="font-mono text-xs text-slate-500">Reporting Date: 27/09/2026</p>
            </div>
            <div className="mt-4 space-y-4">
              {reportBars.map((b) => (
                <div key={b.label}>
                  <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium text-slate-600">{b.label}</span>
                    <span className="font-mono font-bold text-slate-800">{b.v}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PortalCard>

          <PortalCard className="mt-5 !p-0">
            <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-[#0B1F44]">Project-Wise Acquisition Summary</h2>
            <TableShell minWidth="min-w-[900px]">
              <thead><tr><Th>Project ID</Th><Th>Project Name</Th><Th>Districts</Th><Th className="text-right">Required (Ac)</Th><Th className="text-right">Acquired (Ac)</Th><Th className="text-right">Vesting Progress</Th><Th className="text-right">LA Budget (Cr)</Th></tr></thead>
              <tbody>
                {reportProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{p.id}</Td>
                    <Td className="max-w-[280px] font-medium text-slate-700">{p.name}</Td>
                    <Td className="max-w-[180px] truncate text-slate-500">{p.dist}</Td>
                    <Td className="text-right font-mono">{p.req}</Td>
                    <Td className="text-right font-mono font-bold text-emerald-700">{p.acq}</Td>
                    <Td className="text-right font-mono font-bold">{p.vest}</Td>
                    <Td className="text-right font-mono">{p.budget}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ---------- OFFICER PROFILE ---------- */}
      {view === "officer" && (
        <>
          <GreetingHeader
            eyebrow="Institutional • Nodal Officer Dossier"
            title="Officer Profile — Er. Rajeshwar Singhal"
            subtitle="Nodal officer identity, authorization level, jurisdiction and statutory requisition powers."
            actions={
              <>
                <button onClick={nav("profile")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">PIA Organization & Profile</button>
                <button onClick={nav("proposal")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">+ New Proposal</button>
              </>
            }
          />

          <PortalCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B2A5B] text-lg font-black text-white">
                  {OFFICER.initials}
                </span>
                <div>
                  <p className="text-lg font-black text-slate-900">{OFFICER.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{OFFICER.designation}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      <ShieldCheck size={13} /> {OFFICER.level}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-slate-600">
                      <IdCard size={13} /> {OFFICER.badge}
                    </span>
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> DSC Token: Active
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Official Email", OFFICER.email, Mail],
                ["Contact Phone", OFFICER.phone, Phone],
                ["Office", `${OFFICER.office} (PIA-IND-2024-NH-048)`, Building2],
                ["In Position Since", OFFICER.doj, Clock3],
              ].map(([l, v, Icon]) => (
                <div key={l as string} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Icon size={12} /> {l as string}</p>
                  <p className="mt-1 font-bold leading-snug text-slate-800">{v as string}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-slate-800"><MapPin size={13} className="text-emerald-700" /> Authorized Jurisdiction</p>
                <p className="mt-1 font-semibold text-slate-700">{OFFICER.jurisdiction}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{OFFICER.org} · {OFFICER.office} · Ministry of Road Transport and Highways (MoRTH)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-slate-800"><KeyRound size={13} className="text-emerald-700" /> Signing Authority</p>
                <p className="mt-1 font-semibold text-slate-700">{OFFICER.dsc}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Every requisition, resubmission and dossier upload is DSC-signed and written to the tamper-evident audit log.</p>
              </div>
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard className="border-emerald-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck size={15} /> What this officer can do</h2>
              <div className="mt-3 space-y-2">
                {[
                  "Initiate land acquisition requisition proposals (CREATE_ACQUISITION_CASE)",
                  "Upload requisition dossiers & alignment plans (UPLOAD_DOCUMENT)",
                  "Submit revised requisitions in response to LAO returns (RESPOND_TO_RETURN)",
                  "Track multi-agency case workflow status (VIEW_CASE_STATUS)",
                ].map((t) => (
                  <p key={t} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-slate-700">
                    <CircleCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> {t}
                  </p>
                ))}
              </div>
            </PortalCard>
            <PortalCard className="border-red-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><CircleAlert size={15} /> Outside this officer&apos;s authority</h2>
              <div className="mt-3 space-y-2">
                {[
                  "Validate RoR extractions — exclusive to LAO",
                  "Grant Section 3D / Section 19 sanction — CALA / DM only",
                  "Freeze mutations or alter cadastral polygons",
                ].map((t) => (
                  <p key={t} className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-xs font-medium text-slate-700">
                    <CircleX size={14} className="mt-0.5 shrink-0 text-red-500" /> {t}
                  </p>
                ))}
              </div>
            </PortalCard>
          </div>

          <PortalCard className="mt-5">
            <h2 className="text-sm font-bold text-[#0B1F44]">Recent officer activity</h2>
            <div className="mt-3 space-y-2.5 border-l-2 border-slate-100 pl-4">
              {[
                ["Requisition draft initiated — LA-2026-00135", "Ancillary water-supply pipeline corridor · 24 Sep 2026"],
                ["Dossier uploaded — Toll Plaza resubmission set", "Revised land schedule + certified RoR extracts · 25 Sep 2026"],
                ["Response filed to SLAO Chandauli return", "Khasra 114/2 discrepancy · resubmission pending certification"],
              ].map(([t, d]) => (
                <div key={t}>
                  <p className="text-xs font-bold text-slate-800">{t}</p>
                  <p className="text-[11px] text-slate-500">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
              <button onClick={nav("cases")} className="rounded-lg bg-[#0B2A5B] px-3.5 py-2 text-xs font-bold text-white">Open My Cases <ArrowRight size={12} className="ml-1 inline" /></button>
              <button onClick={nav("profile")} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">PIA Organization & Profile</button>
            </div>
          </PortalCard>
        </>
      )}

      {/* ---------- PROFILE ---------- */}
      {view === "profile" && (
        <>
          <GreetingHeader
            eyebrow="Institutional Identity • Statutory RBAC Matrix"
            title="PIA Profile & Requisition Controls"
            subtitle="Institutional identity, nodal officer credentials, and statutory role-based access control matrix."
            actions={
              <button onClick={nav("proposal")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">+ New Acquisition Proposal</button>
            }
          />

          <PortalCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white">ZA</span>
                <div>
                  <p className="font-mono text-[10px] font-bold text-emerald-700">PIA-IND-2024-NH-048</p>
                  <p className="text-sm font-black text-[#0B1F44]">National Highways & Infrastructure Development Corporation (NHIDCL)</p>
                  <p className="text-[11px] text-slate-500">Ministry of Road Transport and Highways (MoRTH)</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Authorized Jurisdiction</p>
                <p className="font-bold text-slate-800">Northern Corridor Zone IV (Uttar Pradesh & Bihar)</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {[["Nodal Officer", "Er. Rajeshwar Singhal", "Chief General Manager (Land Acquisition & Technical)"], ["Official Email", "ro4.lao@nhidcl.gov.in", ""], ["Contact Phone", "+91 542 258 4491", ""], ["Officer Badge / Authorization ID", "PIA-OFFICER-7741", ""]].map(([l, v, s]) => (
                <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p>{s ? <p className="text-[11px] text-slate-500">{s}</p> : null}</div>
              ))}
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard className="border-emerald-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck size={15} /> PIA Authorized Requisition Powers</h2>
              <p className="mt-1 text-[11px] text-slate-500">Statutory authorities permitted to the Project Implementing Agency under RFCTLARR 2013:</p>
              <div className="mt-3 space-y-2">
                {allowed.map(([t, code]) => (
                  <div key={code} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-700"><CircleCheck size={14} className="shrink-0 text-emerald-600" />{t}</span>
                    <span className="hidden shrink-0 font-mono text-[9px] text-slate-400 sm:block">{code}</span>
                  </div>
                ))}
              </div>
            </PortalCard>
            <PortalCard className="border-red-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><ShieldCheck size={15} /> Restricted Revenue Authorities (LAO / CALA / DM)</h2>
              <p className="mt-1 text-[11px] text-slate-500">Enforced statutory boundaries; PIA cannot perform or tamper with these functions:</p>
              <div className="mt-3 space-y-2">
                {restricted.map(([t, code]) => (
                  <div key={code} className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-700"><CircleX size={14} className="shrink-0 text-red-500" />{t}</span>
                    <span className="hidden shrink-0 font-mono text-[9px] text-slate-400 sm:block">{code}</span>
                  </div>
                ))}
              </div>
            </PortalCard>
          </div>
        </>
      )}

      {/* ---------- HELP ---------- */}
      {view === "help" && (
        <>
          <GreetingHeader
            eyebrow="Institutional • Statutory Guidance"
            title="Help & Statutory SOP"
            subtitle="Requisition operating procedure under RFCTLARR 2013, NH Act 1956 and State Revenue Rules."
          />
          <PortalCard>
            <h2 className="text-sm font-bold text-[#0B1F44]">Statutory Framework & SOP</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 text-xs leading-relaxed text-slate-600 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="font-bold text-[#0B3B5F]">National Highways Act, 1956 (Section 3A to 3G)</p>
                <p className="mt-2"><span className="font-semibold">Section 3A:</span> Declaration of intention to acquire land upon requisition by NHIDCL / MoRTH. PIA files Form-A land schedule with DGPS alignment.</p>
                <p className="mt-1.5"><span className="font-semibold">Section 3C:</span> Hearing of objections by CALA within 21 days of gazette publication.</p>
                <p className="mt-1.5"><span className="font-semibold">Section 3D:</span> Final vesting declaration. Land vests absolutely in Central Government free from encumbrances.</p>
                <p className="mt-1.5"><span className="font-semibold">Section 3G:</span> Determination of compensation by CALA with solatium and interest.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="font-bold text-[#0B3B5F]">RFCTLARR Act, 2013 & State Revenue Rules</p>
                <p className="mt-2"><span className="font-semibold">Section 11:</span> Preliminary notification published in Official Gazette & two local dailies.</p>
                <p className="mt-1.5"><span className="font-semibold">Section 12:</span> Joint Measurement Survey by Tehsil revenue staff with PIA engineer present.</p>
                <p className="mt-1.5"><span className="font-semibold">Section 19:</span> Final declaration after hearing objections and R&R scheme approval.</p>
                <p className="mt-1.5"><span className="font-semibold">Rule 14 (SLAO Scrutiny):</span> Returned requisitions must be resubmitted within the deadline with certified RoR extracts.</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-slate-700">
              <p className="flex items-center gap-1.5 font-bold text-amber-900"><TriangleAlert size={14} /> Authority Boundary Reminder</p>
              <p className="mt-1">Statutory proposals governed by RFCTLARR Act 2013 & NH Act 1956. Authoritative approval vested in LAO & CALA. PIA may nominate parcels and upload dossiers but cannot validate RoR extractions, freeze mutations, or alter cadastral polygons.</p>
            </div>
            <button className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0B3B5F]">Open full SOP document <ArrowRight size={13} /></button>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              ["Response to LAO Returns", "Revise land schedules with certified RoR extracts within 10 days of return notice.", MapPin],
              ["Document Upload Standards", "300 DPI flatbed scans, PDF/A with SHA-256 manifest for every dossier.", Upload],
              ["Milestone Escalation", "Overdue Section 19 / 3D milestones auto-escalate to RO head and MoRTH dashboard.", Clock3],
            ].map(([t, d, Icon]) => (
              <PortalCard key={t as string}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={17} /></span>
                <p className="mt-2.5 text-sm font-bold text-slate-800">{t as string}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{d as string}</p>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* Footer authority note */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]"><ShieldCheck size={13} className="text-emerald-600" /> Authority Mode: PIA Requisition</p>
        <p className="mt-1">Statutory proposals governed by RFCTLARR Act 2013 & NH Act 1956. Authoritative approval vested in LAO & CALA. PIA actions are draft-stage requisitions until gazette notification.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={nav("workflow")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><Workflow size={12} /> Workflow Tracker</button>
          <button onClick={nav("gis")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><MapPin size={12} /> GIS Explorer <ExternalLink size={11} /></button>
          <button onClick={nav("proposal")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white">New Proposal <ArrowRight size={12} /></button>
        </div>
      </div>
    </PortalLayout>
  );
}

export default PiaPortal;
