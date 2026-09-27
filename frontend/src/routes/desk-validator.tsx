import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardCheck,
  FolderOpen,
  MapPin,
  RotateCcw,
  Archive,
  History,
  Bell,
  User,
  ArrowRight,
  ArrowLeft,
  Search,
  ShieldCheck,
  FileText,
  TriangleAlert,
  CircleCheck,
  CircleAlert,
  CheckCircle2,
  ExternalLink,
  Pencil,
  BadgeCheck,
  ChevronDown,
  Save,
  Undo2,
  Ban,
  MapPinned,
  BookOpen,
  KeyRound,
} from "lucide-react";
import PortalLayout, {
  PortalCard,
  GreetingHeader,
} from "../components/portal/PortalLayout";

export const Route = createFileRoute("/desk-validator")({
  component: DeskValidatorPortal,
});

type ViewKey =
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

/* ================= MOCK DATA (from portal screenshots) ================= */

const stats = [
  { label: "Pending Validation", value: "6", sub: "Requires human scrutiny", bar: "border-amber-500" },
  { label: "High Priority", value: "4", sub: "3E declaration imminent", bar: "border-red-500" },
  { label: "In Progress", value: "1", sub: "Draft notes active", bar: "border-blue-500" },
  { label: "Validated Today", value: "28", sub: "Handoff to CALA/Survey", bar: "border-emerald-500" },
  { label: "Returned", value: "1", sub: "Sent to PIA for rescan", bar: "border-orange-500" },
  { label: "Avg Scrutiny Time", value: "18 min", sub: "Per multi-page porcha", bar: "border-slate-400" },
];

interface QueueRow {
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

const queueRows: QueueRow[] = [
  { caseId: "LA-2026-00115", docId: "DOC-2026-00850", project: "NHAI National Highway 34 Expansion", section: "Dankuni - Barasat Bypass", district: "Hooghly", village: "Monoharpur", khasra: "340/1", khata: "210", docType: "Title Deed - Dankuni", conf: 45, flags: 6, submittedBy: "B. Sen", submittedOn: "2026-09-24 11:00", priority: "MEDIUM", status: "Returned" },
  { caseId: "LA-2026-00132", docId: "DOC-2026-00895", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Singur Feeder Line", district: "Hooghly", village: "Singur", khasra: "192/B", khata: "588", docType: "Registered Sale Deed (Kabala)", conf: 65, flags: 5, submittedBy: "R. K. Sharma", submittedOn: "2026-09-26 08:00", priority: "CRITICAL", status: "Pending Validation" },
  { caseId: "LA-2026-00188", docId: "DOC-2026-01020", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Baidyabati Bypass", district: "Hooghly", village: "Baidyabati", khasra: "198/4", khata: "440", docType: "WB Form 10 - RoR (Porcha)", conf: 70, flags: 4, submittedBy: "P. Sengupta", submittedOn: "2026-09-26 04:30", priority: "HIGH", status: "Pending Validation" },
  { caseId: "LA-2026-00170", docId: "DOC-2026-00980", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Dankuni Junction", district: "Hooghly", village: "Dankuni", khasra: "512/1", khata: "89", docType: "WB Form 10 - RoR", conf: 71, flags: 4, submittedBy: "P. Sengupta", submittedOn: "2026-09-26 05:40", priority: "HIGH", status: "Pending Validation" },
  { caseId: "LA-2026-00128", docId: "DOC-2026-00891", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Dankuni - Gomoh Section", district: "Hooghly", village: "Baidyabati", khasra: "184/2", khata: "412", docType: "WB Form 10 - RoR (Khatian)", conf: 72, flags: 4, submittedBy: "P. Sengupta", submittedOn: "2026-09-26 09:15", priority: "HIGH", status: "Pending Validation" },
  { caseId: "LA-2026-00175", docId: "DOC-2026-00995", project: "Eastern Dedicated Freight Corridor Phase-II", section: "Dankuni - Gomoh Section", district: "Hooghly", village: "Singur", khasra: "204/1", khata: "614", docType: "WB Form 10 - RoR", conf: 74, flags: 3, submittedBy: "P. Sengupta", submittedOn: "2026-09-25 18:20", priority: "MEDIUM", status: "Pending Validation" },
];

interface AssignedRow {
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

const assignedRows: AssignedRow[] = [
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

const fieldReports = [
  { caseId: "LA-2026-00132", village: "Singur", khasra: "192/B", inspector: "Inspector P. Roy, Singur Revenue Office", visit: "2026-09-25", boundary: "Mismatch", area: "Variance", status: "MISMATCH_DETECTED" },
  { caseId: "LA-2026-00128", village: "Baidyabati", khasra: "184/2", inspector: "Sub-Inspector Animesh Ghosh, Hooghly Revenue Circle", visit: "2026-09-29", boundary: "Match", area: "Match", status: "PENDING" },
  { caseId: "LA-2026-00140", village: "Mustafabad", khasra: "445/Ga", inspector: "Lekhpal Rajesh Kumar Verma", visit: "2026-09-30", boundary: "Match", area: "Match", status: "SCHEDULED" },
  { caseId: "LA-2026-00170", village: "Dankuni", khasra: "512/1", inspector: "Unassigned", visit: "Scheduled", boundary: "Match", area: "Match", status: "PENDING" },
  { caseId: "LA-2026-00188", village: "Baidyabati", khasra: "198/4", inspector: "Unassigned", visit: "Scheduled", boundary: "Match", area: "Match", status: "PENDING" },
  { caseId: "LA-2026-00115", village: "Monoharpur", khasra: "340/1", inspector: "Unassigned", visit: "Scheduled", boundary: "Match", area: "Match", status: "NOT_REQUIRED" },
];

const notifications = [
  { urgent: true, title: "Urgent Case Assigned: Eastern Freight Corridor", time: "2026-09-26 10:15", desc: "Case LA-2026-00128 (Baidyabati KHS-184/2) assigned for immediate desk validation before 3E declaration." },
  { urgent: true, title: "Physical Survey Discrepancy Flagged", time: "2026-09-26 09:30", desc: "Field Officer Inspector P. Roy reported 0.06 acre boundary variance on Khasra 192/B Singur." },
  { urgent: false, title: "Resubmitted Scan from PIA-018", time: "2026-09-26 08:45", desc: "High-resolution Deed Scan re-uploaded for Case LA-2026-00115 (Dankuni Bypass)." },
  { urgent: false, title: "Validated Record Queued for CALA Review", time: "2026-09-25 16:20", desc: "Case LA-2026-00109 moved forward to CALA review bench following successful desk validation." },
];

const auditRows = [
  { ts: "2026-09-26 08:35:12", actor: "ZameenAI System", role: "AI Extraction Engine", action: "INITIAL_EXTRACTION", field: "ALL_FIELDS", prev: "N/A", next: "13 fields extracted (4 flagged)", reason: "Initial automated document digitization", rev: "v1" },
  { ts: "2026-09-25 16:10:04", actor: "Shri S. K. Mukherjee", role: "LAO Desk Validator", action: "FIELD_CORRECTION", field: "Khasra Number", prev: "92/1", next: "92/4", reason: "Typo in OCR extraction reconciled with Porcha page 1", rev: "v2" },
];

const permissions = [
  "VIEW_ASSIGNED_CASES", "VIEW_DOCUMENTS", "VIEW_EXTRACTED_DATA", "EDIT_VALIDATION_FIELDS",
  "SAVE_VALIDATION_DRAFT", "VALIDATE_RECORD", "RETURN_RECORD", "REJECT_RECORD",
  "VIEW_AUDIT_LOG", "VIEW_FIELD_VERIFICATION", "VIEW_SENSITIVE_CASE_DATA",
];

/* ================= SMALL BUILDING BLOCKS ================= */

function GovStrip() {
  return (
    <div className="mb-4 flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-semibold tracking-wide">
        <span className="text-amber-400">Government of West Bengal · Department of Land & Land Reforms</span>
        <span className="mx-2 text-slate-500">|</span>
        <span className="font-normal text-slate-300">National Land Records Digitization & Statutory Acquisition Portal</span>
      </p>
      <p className="flex items-center gap-3 text-[11px] font-semibold">
        <span className="text-slate-300">Reset Demo Fixtures</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> DSC Token: Active
        </span>
      </p>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value < 75 ? "bg-red-500" : value < 90 ? "bg-amber-500" : "bg-emerald-600";
  const text = value < 75 ? "text-red-600" : value < 90 ? "text-amber-700" : "text-emerald-700";
  const label = value < 75 ? "(Low)" : value < 90 ? "(Moderate)" : "(High)";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:w-16">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </span>
      <span className={`text-xs font-bold ${text}`}>{value}%</span>
      <span className="hidden text-[11px] text-slate-400 md:inline">{label}</span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "Returned")
    return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Returned</span>;
  if (status === "In Review")
    return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />In Review</span>;
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Pending Validation</span>;
}

function PriorityPill({ p }: { p: string }) {
  const tone = p === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" : p === "HIGH" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black tracking-wide ${tone}`}>{p}</span>;
}

function TableShell({ children, minWidth = "min-w-[960px]" }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} text-left`}>{children}</table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}

/* ================= MAIN ================= */

function DeskValidatorPortal() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [query, setQuery] = useState("");
  const [confFilter, setConfFilter] = useState<"All" | "Low" | "Mid" | "High">("All");
  const [selectedCase, setSelectedCase] = useState<string>("LA-2026-00132");
  const [dossierTab, setDossierTab] = useState("Overview");
  const [validatorValues, setValidatorValues] = useState<Record<string, string>>({ khasra: "192", area: "0.62" });

  const filteredQueue = useMemo(() => {
    return queueRows.filter((r) => {
      const q = query.trim().toLowerCase();
      const matches =
        !q ||
        r.caseId.toLowerCase().includes(q) ||
        r.khasra.toLowerCase().includes(q) ||
        r.khata.toLowerCase().includes(q) ||
        r.docId.toLowerCase().includes(q) ||
        r.project.toLowerCase().includes(q);
      const band = r.conf < 75 ? "Low" : r.conf < 90 ? "Mid" : "High";
      const confOk = confFilter === "All" || band === confFilter;
      return matches && confOk;
    });
  }, [query, confFilter]);

  const openScrutinize = (caseId: string, target: ViewKey = "workspace") => {
    setSelectedCase(caseId);
    setView(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nav = (key: ViewKey) => () => {
    setView(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebarGroups = [
    {
      title: "Active Workspace",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: view === "dashboard", onClick: nav("dashboard") },
        { label: "Validation Queue", icon: <ClipboardCheck size={16} />, badge: 6, active: view === "queue" || view === "workspace", onClick: nav("queue") },
        { label: "Assigned Cases", icon: <FolderOpen size={16} />, badge: 10, active: view === "assigned" || view === "dossier", onClick: nav("assigned") },
      ],
    },
    {
      title: "Survey & Revisions",
      items: [
        { label: "Field Verification", icon: <MapPin size={16} />, badge: 4, active: view === "field", onClick: nav("field") },
        { label: "Returned Cases", icon: <RotateCcw size={16} />, badge: 1, active: view === "returned", onClick: nav("returned") },
      ],
    },
    {
      title: "Archives & Compliance",
      items: [
        { label: "Validated Records", icon: <Archive size={16} />, active: view === "validated", onClick: nav("validated") },
        { label: "Audit Trail", icon: <History size={16} />, active: view === "audit", onClick: nav("audit") },
      ],
    },
    {
      title: "System & Help",
      items: [
        { label: "Notifications", icon: <Bell size={16} />, badge: 2, active: view === "notifications", onClick: nav("notifications") },
        { label: "Officer Profile & SOP", icon: <User size={16} />, active: view === "profile", onClick: nav("profile") },
      ],
    },
  ];

  return (
    <PortalLayout
      portalBadge="Desk Validator"
      portalSub="Office of the District Magistrate & LA Collector, Hooghly"
      userName="Shri S. K. Mukherjee"
      userInitials="SM"
      userRole="LAO • Desk Validator"
      activeContext="Hooghly Special LA Cell • Eastern DFC Corridor"
      sidebarGroups={sidebarGroups}
      topActions={
        <span className="hidden w-72 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 xl:flex">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Khasra, Case ID (e.g. LA-2026-00128)…"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </span>
      }
    >
      <GovStrip />

      {view === "dashboard" && (
        <>
          <GreetingHeader
            eyebrow="Hooghly Special LA Cell • Desk Scrutiny"
            title="Desk Validation Dashboard"
            subtitle="Review AI-digitized land records and validate low-confidence information before downstream acquisition approval."
            actions={
              <button onClick={nav("queue")} className="rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#123a75]">
                Open Validation Queue →
              </button>
            }
          />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-xl border border-slate-200 border-l-4 ${s.bar} bg-white p-3.5 shadow-sm`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="mt-1 text-2xl font-black text-[#0B1F44]">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{s.sub}</p>
              </div>
            ))}
          </section>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">
                ⚠ Urgent Priority Validation Queue
              </h2>
              <button onClick={nav("queue")} className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3B5F]">
                View All 6 Cases <ArrowRight size={13} />
              </button>
            </div>
            <TableShell>
              <thead>
                <tr>
                  <Th>Case ID</Th><Th>Project / Corridor</Th><Th>Location</Th><Th>Khasra / Khata</Th>
                  <Th>Document Type</Th><Th>AI Confidence</Th><Th>Flagged</Th><Th>Priority</Th><Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {queueRows.slice(0, 5).map((r) => (
                  <tr key={r.caseId} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-[#0B3B5F]">{r.caseId}</Td>
                    <Td><p className="font-semibold text-slate-700">{r.project}</p><p className="text-[11px] text-slate-400">{r.section}</p></Td>
                    <Td className="text-slate-600">{r.village}, {r.district}</Td>
                    <Td className="font-semibold text-slate-700">{r.khasra} (Khata {r.khata})</Td>
                    <Td className="text-slate-600">{r.docType}</Td>
                    <Td><ConfidenceBar value={r.conf} /></Td>
                    <Td><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{r.flags} fields</span></Td>
                    <Td><PriorityPill p={r.priority} /></Td>
                    <Td><button onClick={() => openScrutinize(r.caseId)} className="rounded bg-[#0B2A5B] px-2.5 py-1 text-[11px] font-bold text-white">Review</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Statutory Acquisition Workflow Progression</h3>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                <p><span className="font-bold">Sec 11:</span> Preliminary notification published in Official Gazette & two local daily newspapers.</p>
                <p><span className="font-bold">Sec 15:</span> Hearing of objections — LAO scrutiny of Khasra ownership chains.</p>
                <p><span className="font-bold">Sec 19:</span> Final declaration after hearing objections and R&R scheme approval.</p>
              </div>
            </PortalCard>
            <PortalCard>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">LAO Desk Scrutiny Guidelines</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-slate-600">
                <li>Verify Khata / Khasra ownership chain for minimum 12 years.</li>
                <li>Cross-check AI-flagged fields against scanned Porcha / Kabala.</li>
                <li>Return low-resolution scans to PIA for rescan within 48 hours.</li>
                <li>Every approve / return action is DSC-signed and audit-logged.</li>
              </ul>
            </PortalCard>
          </div>
        </>
      )}

      {view === "queue" && (
        <>
          <GreetingHeader
            eyebrow="LAO Desk Validation Work Queue"
            title="LAO Desk Validation Work Queue"
            subtitle="Primary scrutiny queue for low-confidence AI digitized land records requiring officer verification."
          />
          <p className="mb-3 text-right font-mono text-xs text-slate-500">Showing <span className="font-bold text-slate-800">{filteredQueue.length}</span> matching records</p>

          <PortalCard className="!p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Khasra, Khata, Owner Name, Document ID, Project…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">Confidence:</span>
                {(["All", "Low", "Mid", "High"] as const).map((c) => (
                  <button key={c} onClick={() => setConfFilter(c)} className={`rounded border px-2.5 py-1.5 ${confFilter === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {c === "All" ? "All" : c === "Low" ? "< 75% (Low)" : c === "Mid" ? "75–89%" : "90%+"}
                  </button>
                ))}
                <button onClick={() => { setQuery(""); setConfFilter("All"); }} className="rounded border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-500">⟳ Reset</button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {["Status: All Statuses", "Priority: All Priorities", "District: All Districts", "Doc: All Document Types", "Sort: Lowest Confidence First"].map((f) => (
                <label key={f} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {f} <ChevronDown size={14} className="text-slate-400" />
                </label>
              ))}
            </div>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1100px]">
              <thead>
                <tr>
                  <Th>Case ID</Th><Th>Document ID</Th><Th>Project</Th><Th>District / Village</Th><Th>Khasra No.</Th>
                  <Th>Document Type</Th><Th>AI Confidence</Th><Th>Flagged</Th><Th>Submitted By</Th><Th>Priority</Th><Th>Status</Th><Th>Assigned LAO</Th><Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((r) => (
                  <tr key={r.caseId} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-[#0B3B5F]">{r.caseId}</Td>
                    <Td className="font-mono text-slate-500">{r.docId}</Td>
                    <Td><p className="font-semibold text-slate-700">{r.project.split(" ").slice(0, 2).join(" ")}…</p><p className="text-[11px] text-slate-400">{r.section}</p></Td>
                    <Td><p className="font-medium text-slate-700">{r.village}</p><p className="text-[11px] text-slate-400">{r.district}</p></Td>
                    <Td><p className="font-bold text-slate-800">{r.khasra}</p><p className="text-[11px] text-slate-400">Khata {r.khata}</p></Td>
                    <Td className="max-w-[160px] truncate text-slate-600">{r.docType}</Td>
                    <Td><ConfidenceBar value={r.conf} /></Td>
                    <Td><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{r.flags} flags</span></Td>
                    <Td><p className="font-medium text-slate-600">{r.submittedBy}</p><p className="font-mono text-[10px] text-slate-400">{r.submittedOn}</p></Td>
                    <Td><PriorityPill p={r.priority} /></Td>
                    <Td><StatusPill status={r.status} /></Td>
                    <Td className="font-mono text-slate-500">LAO-014</Td>
                    <Td><button onClick={() => openScrutinize(r.caseId)} className="whitespace-nowrap rounded bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white">Review →</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 lg:hidden">
            {filteredQueue.map((r) => (
              <div key={r.caseId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xs font-bold text-[#0B3B5F]">{r.caseId}</p>
                  <PriorityPill p={r.priority} />
                </div>
                <p className="mt-1 text-sm font-bold text-slate-800">{r.project}</p>
                <p className="text-xs text-slate-500">{r.village}, {r.district} · Khasra {r.khasra} · Khata {r.khata}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ConfidenceBar value={r.conf} />
                  <StatusPill status={r.status} />
                </div>
                <button onClick={() => openScrutinize(r.caseId)} className="mt-3 w-full rounded-lg bg-[#0B2A5B] py-2 text-xs font-bold text-white">Review Case →</button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "assigned" && (
        <>
          <GreetingHeader
            eyebrow="Jurisdiction Desk • Hooghly Special LA Cell"
            title="Assigned Acquisition Cases Dossier"
            subtitle="Complete register of acquisition cases assigned to the Hooghly District Desk Validator."
          />
          <p className="mb-3 text-right font-mono text-xs text-slate-500">Total Assigned: <span className="font-bold text-slate-900">10</span></p>
          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 sm:max-w-md">
              <Search size={16} className="text-slate-400" />
              <input placeholder="Search by Case, Khasra, Owner, Project…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </PortalCard>
          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1000px]">
              <thead>
                <tr><Th>Case Number</Th><Th>Project</Th><Th>Location</Th><Th>Khasra / Plot</Th><Th>Owner</Th><Th>Status</Th><Th>Confidence</Th><Th className="text-right">Actions</Th></tr>
              </thead>
              <tbody>
                {assignedRows.map((r) => (
                  <tr key={r.caseId} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-slate-800">{r.caseId}</Td>
                    <Td className="max-w-[220px] font-medium text-slate-700">{r.project}</Td>
                    <Td><p className="font-medium text-slate-700">{r.location}</p><p className="text-[11px] text-slate-400">{r.sub}</p></Td>
                    <Td className="font-mono font-bold">{r.khasra}</Td>
                    <Td className="text-slate-600">{r.owner}</Td>
                    <Td><span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold ${r.statusTone}`}>● {r.status}</span></Td>
                    <Td><ConfidenceBar value={r.conf} /></Td>
                    <Td>
                      <span className="flex justify-end gap-2">
                        <button onClick={() => openScrutinize(r.caseId, "dossier")} className="rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Dossier</button>
                        <button onClick={() => openScrutinize(r.caseId, "workspace")} className="rounded bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white">Scrutinize</button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {view === "dossier" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <button onClick={nav("assigned")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800"><ArrowLeft size={15} /> Assigned Cases</button>
              <span className="text-slate-300">/</span>
              <span className="font-mono font-bold text-slate-900">{selectedCase === "LA-2026-00132" ? "LA-2026-00109" : selectedCase}</span>
            </p>
            <button onClick={() => openScrutinize(selectedCase, "workspace")} className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white">
              <ShieldCheck size={15} /> Open Validation Workspace
            </button>
          </div>

          <PortalCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xl font-black text-slate-900">LA-2026-00109</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Desk Validated</span>
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold tracking-wider text-slate-600">MEDIUM</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-500"><span className="font-bold text-slate-600">Project:</span> Eastern Dedicated Freight Corridor Phase-II <span className="mx-1">·</span> <span className="font-bold text-slate-600">Mouza:</span> Rishra JL 18, Hooghly</p>
              </div>
              <div className="text-sm">
                <p className="text-slate-500">Overall AI Extraction Confidence</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-200"><span className="block h-full w-[94%] rounded-full bg-emerald-600" /></span>
                  <span className="font-mono font-bold text-slate-800">94%</span>
                  <span className="text-xs text-slate-400">(High)</span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-100 text-xs font-semibold">
              {["Overview", "Source Documents", "Digitized Data", "Field Verification", "Workflow Timeline", "Audit Trail (1)"].map((t) => (
                <button key={t} onClick={() => setDossierTab(t)} className={`whitespace-nowrap px-3.5 py-2.5 ${dossierTab === t ? "border-b-2 border-slate-900 bg-slate-50 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>{t}</button>
              ))}
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PortalCard>
              <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-800">Land Parcel Summary</h3>
              <dl className="divide-y divide-slate-50 text-sm">
                {[["Khasra / Survey No:", "92/4", true], ["Khata Number:", "315", false], ["Dag Number:", "DAG-608", false], ["ULPIN (Parcel ID):", "1904120920044C", true], ["Area Under Acquisition:", "0.35 Acre", true], ["Land Classification:", "Shali", false], ["Present Land Use:", "Paddy", false]].map(([k, v, b]) => (
                  <div key={k as string} className="grid grid-cols-2 gap-2 py-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className={b ? "font-mono font-bold text-slate-900" : "text-slate-700"}>{v}</dd>
                  </div>
                ))}
              </dl>
            </PortalCard>
            <PortalCard>
              <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-800">Ownership & Title Summary</h3>
              <dl className="divide-y divide-slate-50 text-sm">
                {[["Primary Landowner:", "Prabir Kumar Roy", true], ["Father / Spouse:", "S/O Sushil Roy", false], ["Ownership Type:", "SOLE", false], ["Ownership Share:", "100%", false], ["Assigned Officer:", "Shri S. K. Mukherjee (LAO-014)", false], ["Submission Agency:", "DFCCIL", false]].map(([k, v, b]) => (
                  <div key={k as string} className="grid grid-cols-2 gap-2 py-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className={b ? "font-bold text-slate-900" : "text-slate-700"}>{v}</dd>
                  </div>
                ))}
              </dl>
            </PortalCard>
          </div>
        </>
      )}

      {view === "workspace" && (
        <>
          <div className="mb-3 flex flex-col gap-2 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex flex-wrap items-center gap-2">
              <button onClick={nav("queue")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800"><ArrowLeft size={14} /> Back to Validation Queue</button>
              <span className="text-slate-300">/</span>
              <span className="font-mono font-bold text-slate-900">{selectedCase}</span>
              <span className="text-slate-400">· Eastern Dedicated Freight Corridor Phase-II</span>
            </p>
            <p className="flex items-center gap-2 font-mono"><span>Record Version: v1</span><span className="text-slate-300">|</span><span className="inline-flex items-center gap-1 font-sans font-bold text-indigo-700"><FileText size={14} /> Full Case Dossier</span></p>
          </div>

          <PortalCard className="!p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-black text-slate-900">{selectedCase}</span>
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">● Pending Validation</span>
                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-black tracking-wider text-red-700">CRITICAL</span>
                  <span className="font-mono text-xs text-slate-500">Doc: DOC-2026-00895</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  <span className="font-bold">Project:</span> Eastern Dedicated Freight Corridor Phase-II <span className="mx-1">·</span> <span className="font-bold">Location:</span> Singur, Singur, Hooghly <span className="mx-1">·</span> <span className="font-bold">Parcel:</span> Khasra 192/B (Khata 588)<br />
                  <span className="font-bold">Type:</span> Registered Sale Deed (Kabala) - Chandannagore Registry
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  Overall AI Extraction Confidence:
                  <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-200"><span className="block h-full w-[65%] rounded-full bg-red-500" /></span>
                  <span className="font-mono font-bold text-red-600">65%</span> (Low)
                  <span className="ml-1">Flagged Low-Confidence:</span>
                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono font-bold text-red-700">2 unresolved</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Save size={14} /> Save Draft</button>
                <button className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Accept All AI</button>
                <button className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"><Undo2 size={14} /> Return</button>
                <button className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"><Ban size={14} /> Reject</button>
                <button className="inline-flex items-center gap-1.5 rounded bg-slate-300 px-4 py-2 text-xs font-bold text-white"><ShieldCheck size={14} /> Validate Record</button>
              </div>
            </div>
          </PortalCard>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
            {/* Document viewer */}
            <PortalCard className="!p-0 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-900 px-3 py-2 text-xs text-white">
                <span className="font-semibold">‹ Page <span className="font-black">1</span> of 3 ›</span>
                <span className="ml-2 hidden sm:inline">🔍 100% ⊕ ⟳ 0°</span>
                <span className="rounded bg-indigo-600 px-2 py-1 font-bold">◉ OCR Boxes</span>
                <span className="rounded border border-slate-600 px-2 py-1 text-slate-300">Normal Color ▾</span>
              </div>
              <div className="max-h-[560px] space-y-4 overflow-y-auto bg-slate-100 p-4 text-sm sm:p-5">
                <div className="rounded border border-slate-300 bg-white">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      <tr className="border-b"><td className="w-1/3 bg-slate-50 p-2.5 font-semibold text-slate-600">Name of Rayat / Owner:</td><td className="p-2.5 font-bold">Abhijit Kumar Mondal <span className="font-normal">(অভিজিৎ কুমার মণ্ডল)</span></td></tr>
                      <tr className="border-b"><td className="bg-slate-50 p-2.5 font-semibold text-slate-600">Father / Husband Name:</td><td className="p-2.5">Late Bimal Chandra Mondal (স্বর্গীয় বিমল চন্দ্র মণ্ডল)</td></tr>
                      <tr className="border-b"><td className="bg-slate-50 p-2.5 font-semibold text-slate-600">Address & Residence:</td><td className="p-2.5">Vill: Baidyabati, P.O. Sheoraphuli, P.S. Serampore, Dist: Hooghly</td></tr>
                      <tr><td className="bg-slate-50 p-2.5 font-semibold text-slate-600">Ownership Share (অংশ):</td><td className="p-2.5 font-mono font-bold">16 Anna (1.000 / 100% Sole Ownership)</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="rounded border border-slate-300 bg-white">
                  <p className="border-b bg-slate-200/70 p-2 text-center text-xs font-bold">2. LAND PARCEL SCHEDULE & REVENUE ASSESSMENT (জমির দাগ ও পরিমাণের বিবরণ)</p>
                  <table className="w-full text-center text-xs">
                    <thead><tr className="border-b bg-slate-50 font-bold text-slate-600">
                      <td className="border-r p-2">Dag No.<br />(দাগ নং)</td><td className="border-r p-2">Khasra / Plot No.</td><td className="border-r p-2">Classification<br />(শ্রেণী)</td><td className="border-r p-2">Share Area<br />(একর)</td><td className="border-r p-2">Annual Rent<br />(খাজনা)</td><td className="p-2">Remarks / Mutation</td>
                    </tr></thead>
                    <tbody><tr>
                      <td className="border-r p-2.5 font-bold">904</td><td className="border-r p-2.5 font-bold">184/2<br /><span className="text-[10px] font-normal text-slate-500">(Subdivided)</span></td><td className="border-r p-2.5">Shali (Paddy Land)</td><td className="border-r p-2.5 font-mono font-bold">0.45 Acre</td><td className="border-r p-2.5 font-mono">₹ 142.50</td><td className="p-2.5 text-left text-[11px]">Mutated vide Case MUT-2024-9102</td>
                    </tr></tbody>
                  </table>
                </div>
                <div className="rounded border border-dashed border-slate-400 bg-white p-3 text-xs leading-relaxed">
                  <span className="font-bold">Statutory Acquisition Endorsement:</span> Land Parcel Khasra 184/2 included in Ministry of Railways Notification S.O. 4182(E) dt. 12/03/2026 under Section 20A for Eastern Dedicated Freight Corridor Project.
                </div>
                <div className="flex items-end justify-between pt-2 text-xs">
                  <p className="text-slate-500">Certified True Extract from Master Ledger<br /><span className="font-mono">PORCHA HASH: SHA-256: 7f81a0e91c49b</span></p>
                  <p className="text-right font-bold">Sd/- S. Sen<br />Revenue Officer & Addl. Tehsildar<br /><span className="font-normal text-slate-500">Serampore, Hooghly Collectorate</span></p>
                </div>
              </div>
            </PortalCard>

            {/* Scrutiny column */}
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed">
                <p className="flex items-start gap-2 font-bold text-red-900"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> Field Verification Mismatch Flagged by Revenue Surveyor</p>
                <p className="mt-1.5 text-slate-700">Field Officer measured 0.56 acre on ground. Deed shows 0.62 acre. Discrepancy of 0.06 acre must be reconciled.</p>
                <p className="mt-1.5 font-mono font-bold text-red-700">Ground Measured: 0.56 Acre · Document: 0.62 Acre</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-800"><span className="inline-flex items-center gap-1.5"><TriangleAlert size={15} className="text-amber-600" /> Priority Action: 2 Flagged Low-Confidence Fields</span><span className="text-xs font-medium text-amber-700">Must be reviewed before validation</span></p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[["Khasra / Plot Number", "58%"], ["Area Conveyed", "68%"]].map(([l, v]) => (
                    <span key={l} className="inline-flex items-center gap-2 rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">◉ {l} <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-red-500" style={{ width: v }} /></span> <span className="font-mono font-bold text-red-600">{v}</span></span>
                  ))}
                </div>
              </div>

              {[
                { key: "khasra", title: "Khasra / Plot Number", conf: "58%", diag: 'AI Diagnostic: Missing subdivision suffix "/B".', ai: "192", note: "Review Needed" },
                { key: "area", title: "Area Conveyed", conf: "68%", diag: "AI Diagnostic: Conversion verification required from Satak to Acre.", ai: "0.62", note: "Review Required" },
              ].map((f) => (
                <PortalCard key={f.key} className="!p-4 border-amber-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                      {f.title}
                      <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">⚠ {f.note}</span>
                      <span className="rounded border border-amber-800/30 bg-amber-100/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">{f.note}</span>
                    </p>
                    <p className="flex items-center gap-2 text-xs"><span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-red-500" style={{ width: f.conf }} /></span><span className="font-mono font-bold text-red-600">{f.conf}</span><span className="text-slate-400">(Low)</span><span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">◉ Page 1</span></p>
                  </div>
                  <p className="mt-2.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">ⓘ <span className="font-bold">{f.diag.split(":")[0]}:</span>{f.diag.split(":")[1]}</p>
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <label className="rounded border border-slate-200 bg-slate-50/60 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI / OCR Extraction</span>
                      <p className="mt-0.5 font-mono text-sm text-slate-700">{f.ai}</p>
                    </label>
                    <label className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Validator Value</span>
                      <input value={validatorValues[f.key]} onChange={(e) => setValidatorValues((v) => ({ ...v, [f.key]: e.target.value }))} className="mt-0.5 w-full bg-transparent font-mono text-sm font-bold text-slate-900 outline-none" />
                    </label>
                  </div>
                  <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                    <button className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><CircleCheck size={13} /> Accept AI</button>
                    <button className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"><Pencil size={13} /> Edit / Correct</button>
                    <button className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"><BadgeCheck size={13} /> Mark Verified</button>
                  </div>
                </PortalCard>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "field" && (
        <>
          <GreetingHeader
            eyebrow="Cadastral Survey • Hooghly Revenue Circle"
            title="Cadastral Field Verification & Survey Tracking"
            subtitle="Monitor physical on-ground survey inspections by revenue amins and cross-verify with digitized desk records."
          />
          <div className="rounded-xl border-2 border-red-400/70 bg-white p-4 sm:p-5">
            <p className="flex items-center gap-2 font-bold text-red-950"><TriangleAlert size={18} className="text-red-600" /> Field Survey Discrepancies Requiring Reconciliation (1)</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">Physical inspection has revealed boundaries, area measurements, or possession that differ from the uploaded document. LAO cannot validate without reconciliatory inquiry.</p>
            <div className="mt-3 rounded border border-red-200 p-3.5 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-base font-black text-slate-900">LA-2026-00132</span><span className="font-mono text-xs text-slate-500">Khasra 192/B</span><span className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-700">AREA_MISMATCH</span></p>
                <button onClick={() => openScrutinize("LA-2026-00132")} className="inline-flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Scrutinize Case <ExternalLink size={13} /></button>
              </div>
              <p className="text-xs text-slate-500">Eastern Dedicated Freight Corridor Phase-II · Singur, Hooghly</p>
              <div className="mt-2.5 rounded border border-slate-100 bg-slate-50/70 p-3 text-xs leading-relaxed">
                <p className="font-bold text-red-950">Surveyor Discrepancy Finding:</p>
                <p className="mt-1 text-slate-700">Field Officer measured 0.56 acre on ground. Deed shows 0.62 acre. Discrepancy of 0.06 acre must be reconciled.</p>
                <p className="mt-1.5 text-slate-500">Inspector: <span className="font-bold text-slate-700">Inspector P. Roy, Singur Revenue Office</span> <span className="mx-2">Visit Date: <span className="font-bold text-slate-700">2026-09-25</span></span> Boundary Match: <span className="font-bold text-red-600">Mismatch</span></p>
              </div>
            </div>
          </div>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">All Field Verification Reports</h2>
              <p className="font-mono text-xs text-slate-500">1 Verified · 7 Pending</p>
            </div>
            <TableShell minWidth="min-w-[900px]">
              <thead><tr><Th>Case ID</Th><Th>Village & Khasra</Th><Th>Inspector / Amin</Th><Th>Visit Date</Th><Th>Boundary Match</Th><Th>Area Match</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {fieldReports.map((r) => (
                  <tr key={r.caseId} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-slate-800">{r.caseId}</Td>
                    <Td><p className="font-bold text-slate-800">{r.village}</p><p className="font-mono text-[11px] text-slate-400">KHS: {r.khasra}</p></Td>
                    <Td className="text-slate-600">{r.inspector}</Td>
                    <Td className="font-mono text-slate-600">{r.visit}</Td>
                    <Td className={r.boundary === "Mismatch" ? "font-bold text-red-600" : "font-medium text-emerald-700"}>{r.boundary}</Td>
                    <Td className={r.area === "Variance" ? "font-bold text-red-600" : "font-medium text-emerald-700"}>{r.area}</Td>
                    <Td className="font-mono font-bold text-slate-800">{r.status}</Td>
                    <Td className="text-right"><button className="rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">View Report</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {view === "returned" && (
        <>
          <GreetingHeader
            eyebrow="Survey & Revisions • PIA Resubmission"
            title="Returned Cases & Resubmission Tracking"
            subtitle="Land records returned to Project Implementation Agencies (PIA) due to poor scans, missing schedules, or OCR failures."
          />
          <PortalCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-black text-slate-900">LA-2026-00115</span>
                  <span className="rounded border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-xs font-bold text-red-700">Returned: POOR_SCAN_QUALITY</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">NHAI National Highway 34 Expansion · Monoharpur, Hooghly · Khasra 340/1</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">View Dossier</button>
                <button onClick={() => openScrutinize("LA-2026-00115")} className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Resume Review <ArrowRight size={13} /></button>
              </div>
            </div>
            <div className="mt-4 rounded border border-slate-200 bg-slate-50/70 p-3.5 text-xs leading-relaxed">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <p className="text-slate-600"><span className="font-bold">Returned By:</span> Shri S. K. Mukherjee (LAO-014)</p>
                <p className="font-mono text-slate-600"><span className="font-sans font-bold">Return Date:</span> 2026-09-25 14:00</p>
                <p className="text-slate-600"><span className="font-bold">Submission Agency:</span> NHAI PIU Kolkata</p>
              </div>
              <p className="mt-3 font-bold text-slate-800">Mandatory Officer Defect Remarks:</p>
              <p className="mt-0.5 text-slate-700">Page 2 schedule of boundaries is illegible due to folded scan and low DPI. High-resolution color scan requested.</p>
              <p className="mt-2.5 text-indigo-900"><span className="font-bold">Required Action from PIA:</span> Re-scan original document at minimum 300 DPI flatbed scanner.</p>
            </div>
          </PortalCard>
        </>
      )}

      {view === "validated" && (
        <>
          <GreetingHeader
            eyebrow="Archives & Compliance"
            title="Validated Records Archive"
            subtitle="Desk-validated digitized records handed off to CALA review bench and field survey."
          />
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[["Desk Validated (this week)", "28", "border-emerald-500"], ["Handoff to CALA", "21", "border-blue-500"], ["Awaiting Field Survey", "7", "border-amber-500"]].map(([l, v, b]) => (
              <div key={l} className={`rounded-xl border border-slate-200 border-l-4 ${b} bg-white p-4 shadow-sm`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
                <p className="mt-1 text-3xl font-black text-[#0B1F44]">{v}</p>
              </div>
            ))}
          </section>
          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[860px]">
              <thead><tr><Th>Case ID</Th><Th>Owner / Khasra</Th><Th>Validated On</Th><Th>Validator</Th><Th>Confidence</Th><Th>Handoff Stage</Th></tr></thead>
              <tbody>
                {[
                  ["LA-2026-00109", "Prabir Kumar Roy · 92/4", "2026-09-25 16:22", "S. K. Mukherjee", 94, "CALA Review Bench"],
                  ["LA-2026-00098", "Anil Verma · 77/2", "2026-09-25 11:05", "S. K. Mukherjee", 92, "CALA Review Bench"],
                  ["LA-2026-00087", "Meera Devi · 310/A", "2026-09-24 17:41", "S. K. Mukherjee", 91, "Field Survey Queue"],
                ].map(([c, o, d, v, conf, h]) => (
                  <tr key={c as string} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-[#0B3B5F]">{c}</Td>
                    <Td className="text-slate-600">{o}</Td>
                    <Td className="font-mono text-slate-600">{d}</Td>
                    <Td className="text-slate-600">{v}</Td>
                    <Td><ConfidenceBar value={conf as number} /></Td>
                    <Td><span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{h}</span></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {view === "audit" && (
        <>
          <GreetingHeader
            eyebrow="Compliance • Tamper-evident log"
            title="Statutory Audit Trail & Cryptographic Log"
            subtitle="Read-only cryptographic scrutiny log of all OCR field corrections, validator approvals, and returns."
          />
          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 sm:max-w-md">
              <Search size={16} className="text-slate-400" />
              <input placeholder="Search by Actor, Field, Action, or Reason…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </PortalCard>
          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1000px]">
              <thead><tr><Th>Timestamp</Th><Th>Actor</Th><Th>Role</Th><Th>Action Code</Th><Th>Field</Th><Th>Previous Value</Th><Th>New Corrected Value</Th><Th>Reason & Evidence</Th><Th>Rev</Th></tr></thead>
              <tbody>
                {auditRows.map((r) => (
                  <tr key={r.ts} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono text-slate-600">{r.ts}</Td>
                    <Td className="font-bold text-slate-900">{r.actor}</Td>
                    <Td className="text-slate-500">{r.role}</Td>
                    <Td className="font-mono text-indigo-700">{r.action}</Td>
                    <Td className="font-mono font-medium">{r.field}</Td>
                    <Td className="font-mono text-slate-400 line-through">{r.prev}</Td>
                    <Td className="bg-amber-50/50 font-mono font-bold">{r.next}</Td>
                    <Td className="max-w-[240px] text-slate-600">{r.reason}</Td>
                    <Td className="font-mono text-slate-400">{r.rev}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {view === "notifications" && (
        <>
          <GreetingHeader
            eyebrow="System & Help • Alert Center"
            title="Statutory Notifications & Alert Center"
            subtitle="Operational alerts for assigned high-priority records, survey discrepancies, and CALA workflow progression."
          />
          <div className="space-y-3">
            {notifications.map((n) => (
              <PortalCard key={n.title} className={n.urgent ? "!border-amber-300 !bg-amber-50/40" : ""}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                      {n.urgent && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                      {n.title}
                      <span className="font-mono text-[11px] font-medium text-slate-400">{n.time}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => openScrutinize("LA-2026-00128")} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Open Case <ExternalLink size={12} /></button>
                    {n.urgent && <CircleCheck size={18} className="text-slate-300" />}
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {view === "profile" && (
        <>
          <GreetingHeader
            eyebrow="System & Help • RBAC Authority"
            title="Officer Profile, Authority & SOP"
            subtitle="Digital identity, statutory permissions and desk scrutiny standard operating procedure."
          />
          <div className="grid grid-cols-1 gap-5">
            <PortalCard>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-black text-slate-900">Shri S. K. Mukherjee</p>
                  <p className="text-xs text-slate-500">Land Acquisition Officer (Desk Scrutiny)</p>
                  <p className="font-mono text-xs text-slate-500">Badge ID: WB-LAO-2018-094</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Digital Token: ACTIVE</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                <div><p className="text-xs font-bold text-slate-700">Assigned Department & Office:</p><p className="mt-0.5 text-xs text-slate-600">Office of the District Magistrate & LA Collector, Hooghly</p></div>
                <div><p className="text-xs font-bold text-slate-700">State & Revenue Tehsils:</p><p className="mt-0.5 text-xs text-slate-600">West Bengal · Baidyabati, Serampore, Singur, Chinsurah</p></div>
              </div>
            </PortalCard>

            <PortalCard>
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800"><KeyRound size={14} className="text-indigo-600" /> Active RBAC Statutory Authority & Permissions</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {permissions.map((p) => (
                  <span key={p} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50/70 px-2.5 py-2 font-mono text-[11px] font-medium text-slate-700"><ShieldCheck size={13} className="shrink-0 text-emerald-600" />{p}</span>
                ))}
              </div>
            </PortalCard>

            <PortalCard>
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800"><BookOpen size={14} className="text-indigo-600" /> Desk Scrutiny Standard Operating Procedure (SOP)</h3>
              <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
                <li><span className="font-bold">1. Scope of Validation:</span> The Desk Validator acts as the Human-in-the-Loop validation authority to ensure AI/OCR extractions are free of typographical and character confusion errors before entering formal land acquisition compensation schedules.</li>
                <li><span className="font-bold">2. Low-Confidence Field Mandate:</span> Fields with confidence scores below 75% are highlighted with amber warnings. The officer must cross-examine the original scan in the document viewer and either correct the value or confirm its fidelity.</li>
                <li><span className="font-bold">3. Return vs. Reject:</span> If a document has illegible portions, folded pages, or missing schedules, use <em>Return for Reprocessing</em> so the survey desk can provide a high-resolution re-scan. Use <em>Reject Validation</em> only when the document is counterfeit, legally cancelled, or fundamentally invalid.</li>
                <li><span className="font-bold">4. Reservation of Statutory Power:</span> Desk Validation approves data extraction accuracy. It does NOT constitute acquisition vesting or final award declaration under Section 3G / Section 20F, which remains strictly with CALA / District Magistrate.</li>
              </ol>
            </PortalCard>
          </div>
        </>
      )}

      {/* Footer authority note — matches other portals */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]"><CircleAlert size={13} className="text-amber-500" /> Statutory Authority Scope</p>
        <p className="mt-1">LAO Desk Validation approves digitized data extraction. Statutory awards under Sec 3G / Sec 20F require CALA / DM sign-off. Every action is DSC-signed, DPDP Act 2023 protected and written to the tamper-evident audit log.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={nav("audit")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><History size={12} /> Audit Trail</button>
          <button onClick={nav("profile")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><MapPinned size={12} /> Officer Profile & SOP</button>
          <button onClick={nav("queue")} className="inline-flex items-center gap-1 rounded-lg bg-[#0B2A5B] px-2.5 py-1.5 font-bold text-white">Continue Scrutiny <ArrowRight size={12} /></button>
        </div>
      </div>
    </PortalLayout>
  );
}

export default DeskValidatorPortal;
