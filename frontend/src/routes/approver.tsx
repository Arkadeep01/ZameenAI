import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Clock3,
  FolderOpen,
  Gavel,
  OctagonPause,
  IndianRupee,
  Bell,
  KeyRound,
  CheckCircle2,
  History,
  TriangleAlert,
  ArrowRight,
  ArrowLeft,
  Search,
  ChevronDown,
  FileText,
  Users,
  ShieldCheck,
  CircleCheck,
  BookOpen,
  Printer,
  User,
  IdCard,
} from "lucide-react";
import PortalLayout, {
  PortalCard,
  GreetingHeader,
} from "../components/portal/PortalLayout";

export const Route = createFileRoute("/approver")({
  component: ApproverPortal,
});

type ViewKey =
  | "dashboard"
  | "pending"
  | "all"
  | "contested"
  | "stayed"
  | "compensation"
  | "notices"
  | "objections"
  | "possession"
  | "approved"
  | "audit"
  | "docket"
  | "powers";

const OFFICER = {
  name: "Smt. Ananya Deshmukh",
  initials: "AD",
  designation: "Competent Authority Land Acquisition (CALA)",
  badge: "CALA-UP-GBN-84",
  level: "Authorized CALA Officer",
  jurisdiction: "Gautam Buddha Nagar (Dadri) • Uttar Pradesh",
};

/* ================= DATA (from portal screenshots) ================= */

interface Docket {
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

const initialDockets: Docket[] = [
  { id: "NHAI-DEL-MUM-PKG4-2026-089", project: "Delhi-Mumbai Expressway (NE-4) Package 4", agency: "National Highways Authority of India (NHAI)", parcels: 6, area: "12.84 Ha", status: "Awaiting Approval", compensation: "₹112.89 Cr", stage: "Approver Review", priority: "High", lao: "97.4%", laoNote: "Fully Validated", field: "Verification Certified", fieldNote: "", comp: "Pending CALA Approval", compNote: "₹112.89 Cr", submitted: "2026-09-15" },
  { id: "NOIDA-AIRPORT-EXPWY-2026-118", project: "Noida International Airport Direct Rail & Road Corridor", agency: "Yamuna Expressway Industrial Development Authority (YEIDA)", parcels: 12, area: "24.5 Ha", status: "Possession Pending", compensation: "₹259.48 Cr", stage: "Possession", priority: "Critical", lao: "99.4%", laoNote: "Fully Validated", field: "Verification Certified", fieldNote: "", comp: "Assessment Approved", compNote: "₹259.48 Cr", submitted: "2026-08-10" },
  { id: "DFCCIL-WDFC-DGR-2026-042", project: "Western Dedicated Freight Corridor (WDFC)", agency: "Dedicated Freight Corridor Corporation of India (DFCCIL)", parcels: 4, area: "8.15 Ha", status: "Contested", compensation: "₹64.77 Cr", stage: "Approver Review", priority: "High", lao: "89.2%", laoNote: "Requires Approver Attention", field: "Flagged with Caveat", fieldNote: "", comp: "Pending CALA Approval", compNote: "₹64.77 Cr", submitted: "2026-09-04" },
  { id: "RRTS-DEL-MEERUT-2026-015", project: "Delhi-Ghaziabad-Meerut RRTS Rapid Rail Corridor", agency: "National Capital Region Transport Corporation (NCRTC)", parcels: 3, area: "5.4 Ha", status: "Stayed", compensation: "₹61.33 Cr", stage: "Approver Review", priority: "Critical", lao: "94%", laoNote: "Requires Approver Attention", field: "Flagged with Caveat", fieldNote: "", comp: "Returned for Recertification", compNote: "₹61.33 Cr", submitted: "2026-09-15" },
  { id: "UPEDA-GANGA-EXP-2026-077", project: "Ganga Expressway Greenfield Alignment Package 3", agency: "Uttar Pradesh Expressways Industrial Development Authority (UPEIDA)", parcels: 8, area: "26.2 Ha", status: "Awaiting Approval", compensation: "₹132.88 Cr", stage: "Approver Review", priority: "High", lao: "91.5%", laoNote: "Requires Approver Attention", field: "Flagged with Caveat", fieldNote: "Boundary Mismatch", comp: "Pending CALA Approval", compNote: "₹132.88 Cr", submitted: "2026-09-20" },
  { id: "NHAI-NH9-WIDENING-2026-031", project: "NH-9 (Delhi-Meerut Expressway) 14-Lane Expansion Package 2", agency: "National Highways Authority of India (NHAI)", parcels: 5, area: "7.1 Ha", status: "Approved", compensation: "₹72.48 Cr", stage: "Finalization", priority: "Medium", lao: "98.1%", laoNote: "Fully Validated", field: "Verification Certified", fieldNote: "", comp: "Assessment Approved", compNote: "₹72.48 Cr", submitted: "2026-07-28" },
];

const compCards = [
  { id: "NHAI-DEL-MUM-PKG4-2026-089", title: "Delhi-Mumbai Expressway (NE-4) Package 4", basis: "Basis: Circle Rate (Dadri 2025-26) + Rural Multiplier Factor (2.0x) + Solatium (100% under RFCTLARR / NH Act 3G)", award: "₹112.89 Cr", disb: "₹0.00", flag: "Pending CALA Approval" },
  { id: "NOIDA-AIRPORT-EXPWY-2026-118", title: "Noida International Airport Direct Rail & Road Corridor", basis: "Basis: RFCTLARR Act 2013 First Schedule (Solatium 100% + Solatium Interest + R&R Entitlements)", award: "₹259.48 Cr", disb: "₹259.48 Cr", flag: "Assessment Approved" },
  { id: "DFCCIL-WDFC-DGR-2026-042", title: "Western Dedicated Freight Corridor (WDFC)", basis: "Basis: Circle Rate + 100% Solatium (Escrow Deposit Recommendation under Sec 77)", award: "₹64.77 Cr", disb: "₹0.00", flag: "Pending CALA Approval" },
  { id: "RRTS-DEL-MEERUT-2026-015", title: "Delhi-Ghaziabad-Meerut RRTS Rapid Rail Corridor", basis: "Basis: Assessment prepared but stayed under judicial order", award: "₹61.33 Cr", disb: "₹0.00", flag: "Returned for Recertification" },
  { id: "UPEDA-GANGA-EXP-2026-077", title: "Ganga Expressway Greenfield Alignment Package 3", basis: "Basis: Circle Rate + Solatium 100%", award: "₹132.88 Cr", disb: "₹0.00", flag: "Pending CALA Approval" },
  { id: "NHAI-NH9-WIDENING-2026-031", title: "NH-9 (Delhi-Meerut Expressway) 14-Lane Expansion Package 2", basis: "Basis: Award Declared & Settled", award: "₹72.48 Cr", disb: "₹72.48 Cr", flag: "Assessment Approved" },
];

const notices = [
  { id: "NOT-3A-091", project: "Delhi-Mumbai Expressway (NE-4) Package 4", type: "Section 3A (Intention)", gazette: "Gazette of India SO 2954(E)", issue: "2026-07-15", deadline: "2026-08-05", status: "Closed" },
  { id: "NOT-3D-142", project: "Delhi-Mumbai Expressway (NE-4) Package 4", type: "Section 3D (Declaration)", gazette: "Gazette of India SO 3082(E)", issue: "2026-08-20", deadline: "2026-09-10", status: "Delivered" },
  { id: "NOT-3G-019", project: "Delhi-Mumbai Expressway (NE-4) Package 4", type: "Section 3G (Claims)", gazette: "Public Notice Ref CALA/DAD/2026/25-09", issue: "2026-09-12", deadline: "2026-10-02", status: "Response Pending" },
  { id: "NOT-19N-19", project: "Noida International Airport Direct Rail & Road Corridor", type: "Section 19 (Award)", gazette: "UP Gazette Extra-104", issue: "2026-08-25", deadline: "2026-09-15", status: "Closed" },
];

const objections = [
  { id: "OBJ-2026-44", project: "Delhi-Mumbai Expressway (NE-4) Package 4", khasra: "Khasra: 141", applicant: "APL-REF-7712 (Adv. G. Sharma for Shanti Devi)", ground: "Standing Crop / Tree Omission", hearing: "2026-09-08", status: "Disposed - Rectified" },
  { id: "OBJ-3FC-81", project: "Western Dedicated Freight Corridor (WDFC)", khasra: "Khasra 284/2", applicant: "APL-REF-9051 (Sunder Singh Branch)", ground: "Ancestral Joint Ownership Dispute", hearing: "2026-10-04", status: "Hearing Scheduled" },
];

const possessionCards = [
  { id: "NHAI-DEL-MUM-PKG4-2026-089", title: "Delhi-Mumbai Expressway (NE-4) Package 4", agency: "National Highways Authority of India (NHAI) · 12.84 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "DRAFT-PKGH-2026-089", stateNote: "Pending CALA Approval" },
  { id: "NOIDA-AIRPORT-EXPWY-2026-118", title: "Noida International Airport Direct Rail & Road Corridor", agency: "Yamuna Expressway Industrial Development Authority (YEIDA) · 24.5 Ha", panchnama: "—", comp: "—", readiness: "Ready", state: "PKGM-JEWAR-2026-FINAL-09", stateNote: "Assessment Approved" },
  { id: "DFCCIL-WDFC-DGR-2026-042", title: "Western Dedicated Freight Corridor (WDFC)", agency: "Dedicated Freight Corridor Corporation of India (DFCCIL) · 8.15 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "In preparation", stateNote: "Pending CALA Approval" },
  { id: "RRTS-DEL-MEERUT-2026-015", title: "Delhi-Ghaziabad-Meerut RRTS Rapid Rail Corridor", agency: "National Capital Region Transport Corporation (NCRTC) · 5.4 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "In preparation", stateNote: "Returned for Recertification" },
  { id: "UPEDA-GANGA-EXP-2026-077", title: "Ganga Expressway Greenfield Alignment Package 3", agency: "Uttar Pradesh Expressways Industrial Development Authority (UPEIDA) · 26.2 Ha", panchnama: "—", comp: "—", readiness: "Not Ready", state: "In preparation", stateNote: "Pending CALA Approval" },
  { id: "NHAI-NH9-WIDENING-2026-031", title: "NH-9 (Delhi-Meerut Expressway) 14-Lane Expansion Package 2", agency: "National Highways Authority of India (NHAI) · 7.1 Ha", panchnama: "—", comp: "—", readiness: "Granted", state: "In preparation", stateNote: "Assessment Approved" },
];

const auditRows = [
  { log: "AUD-891", ref: "NHAI-DEL-MUM-PKG4-2026-089", ts: "2026-09-18 14:35:18", actor: "Shri R.K. Sharma", auth: "LAO", action: "Forwarded Case to Approver Queue", trans: "Awaiting Approval", reason: "Complete validation of records and field reports concluded." },
  { log: "AUD-892", ref: "NHAI-DEL-MUM-PKG4-2026-089", ts: "2026-09-19 10:12:04", actor: "Smt. Ananya Deshmukh", auth: "CALA", action: "Opened Case File for Primary Review", trans: "Under Review", reason: "Statutory examination of Section 3D declaration compliance." },
  { log: "AUD-206-01", ref: "NOIDA-AIRPORT-EXPWY-2026-118", ts: "2026-09-24 10:05:08", actor: "SDM Jewar", auth: "LAO", action: "Submitted Possession Dossier to DM/DC", trans: "Possession Pending", reason: "All preconditions satisfied under RFCTLARR Section 38(2)." },
  { log: "AUD-ART-01", ref: "DFCCIL-WDFC-DGR-2026-042", ts: "2026-09-04 11:15:00", actor: "Shri R.K. Sharma", auth: "LAO", action: "Flagged Case as Contested", trans: "Contested", reason: "OS 341/2025 civil title partition suit detected." },
  { log: "AUD-ART-03", ref: "RRTS-DEL-MEERUT-2026-015", ts: "2026-09-24 13:20:00", actor: "Smt. Ananya Deshmukh", auth: "CALA", action: "Flagged Case as Stayed", trans: "Stayed", reason: "High Court Writ-C No. 19482/2026 stay order served." },
  { log: "AUD-MRW-01", ref: "NHAI-NH9-WIDENING-2026-031", ts: "2026-08-14 17:35:00", actor: "Smt. Ananya Deshmukh", auth: "CALA", action: "Granted Final Statutory Acquisition Approval", trans: "Approved", reason: "Statutory compliance complete under NH Act 1956 Section 3D & 3G." },
];

/* ================= HELPERS ================= */

function StatusPill({ s }: { s: string }) {
  const t = s.toLowerCase();
  const tone =
    t.includes("approv") && !t.includes("await") ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : t.includes("stay") ? "border-red-200 bg-red-50 text-red-700"
    : t.includes("contest") ? "border-amber-200 bg-amber-50 text-amber-800"
    : t.includes("possession") ? "border-blue-200 bg-blue-50 text-blue-700"
    : t.includes("closed") ? "border-slate-300 bg-slate-100 text-slate-600"
    : t.includes("deliver") ? "border-teal-200 bg-teal-50 text-teal-700"
    : t.includes("pending") || t.includes("await") ? "border-amber-200 bg-amber-50 text-amber-800"
    : t.includes("hearing") || t.includes("dispos") ? "border-indigo-200 bg-indigo-50 text-indigo-700"
    : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}>{s}</span>;
}

function PriPill({ p }: { p: string }) {
  const tone = p === "Critical" ? "border-red-200 bg-red-50 text-red-700" : p === "High" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}>{p}</span>;
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
function DocketCards({ rows, onOpen }: { rows: Docket[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-3 lg:hidden">
      {rows.map((d) => (
        <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[11px] font-bold text-amber-700">{d.id}</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{d.project}</p>
          <p className="text-[11px] text-slate-500">{d.parcels} parcels · {d.area} · {d.compensation}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusPill s={d.status} /> <PriPill p={d.priority} />
          </div>
          <button onClick={() => onOpen(d.id)} className="mt-3 w-full rounded-lg bg-[#0B2A5B] py-2 text-xs font-bold text-white">Open Docket →</button>
        </div>
      ))}
    </div>
  );
}

/* ================= MAIN ================= */

function ApproverPortal() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [query, setQuery] = useState("");
  const [dockets, setDockets] = useState<Docket[]>(initialDockets);
  const [selectedId, setSelectedId] = useState<string>(initialDockets[0].id);
  const [authority, setAuthority] = useState<"CALA" | "DM">("CALA");

  const nav = (key: ViewKey) => () => {
    setView(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDocket = (id: string) => {
    setSelectedId(id);
    setView("docket");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setStatus = (id: string, status: string, stage: string) => {
    setDockets((ds) => ds.map((d) => (d.id === id ? { ...d, status, stage } : d)));
  };

  const q = query.trim().toLowerCase();
  const matchQ = (d: Docket) => !q || `${d.id} ${d.project} ${d.agency}`.toLowerCase().includes(q);
  const pending = useMemo(() => dockets.filter((d) => d.stage === "Approver Review" && d.status !== "Approved"), [dockets]);
  const contestedList = useMemo(() => dockets.filter((d) => d.status === "Contested" || d.status === "Stayed"), [dockets]);
  const stayedList = useMemo(() => dockets.filter((d) => d.status === "Stayed"), [dockets]);
  const approvedList = useMemo(() => dockets.filter((d) => d.status === "Approved"), [dockets]);
  const selected = dockets.find((d) => d.id === selectedId) ?? dockets[0];

  const metrics = [
    { label: "Pending Reviews", value: String(pending.length), sub: "Action required before SLA" },
    { label: "High / Critical Priority", value: "5", sub: "Expedited infrastructure corridor" },
    { label: "Compensation Pending", value: "3", sub: "Awaiting CALA approval & award" },
    { label: "Objections Pending", value: "1", sub: "Hearings scheduled / under review" },
    { label: "Contested Parcels", value: String(contestedList.length), sub: "Title & ownership disputes" },
    { label: "Stayed Parcels", value: String(stayedList.length), sub: "Judicial court stay orders active" },
    { label: "Possession Pending", value: "1", sub: "Ready for DM/DC possession order" },
    { label: "Approved Cases", value: String(approvedList.length), sub: "Statutory clearance executed" },
  ];

  const alerts = [
    { title: "Review SLA Expiry Warning", tag: "Overdue Review", desc: "Delhi-Mumbai Expressway Package 4 SLA window expires in 48 hours.", caseId: "NHAI-DEL-MUM-PKG4-2026-089" },
    { title: "Possession Clearance Ready for DM/DC Sign-Off", tag: "Possession Readiness", desc: "Noida International Airport Direct Corridor 100% compensation disbursed. Awaiting final possession warrant.", caseId: "NOIDA-AIRPORT-EXPWY-2026-118" },
    { title: "Cadastral Boundary Discrepancy (3.4m Canal Berm)", tag: "Field Mismatch", desc: "Ganga Expressway Package 3: Surveyor reported physical encroachment onto Khasra 312/1 right-of-way.", caseId: "UPEDA-GANGA-EXP-2026-077" },
    { title: "Civil Title Partition Suit OS 341/2025", tag: "Contested Parcel", desc: "Western DFC: Rival succession claimants on Khasra 284/2. Requires LARRA deposit referral.", caseId: "DFCCIL-WDFC-DGR-2026-042" },
    { title: "Allahabad High Court Interim Injunction", tag: "Judicial Stay", desc: "RRTS Khasra 412/1 stayed till 15 Nov 2026 in Writ-C No. 19482/2026.", caseId: "RRTS-DEL-MEERUT-2026-015" },
  ];

  const stages = [
    { label: "Approver Review", pct: 67, count: "4 (67%)" },
    { label: "Compensation", pct: 0, count: "0 (0%)" },
    { label: "Possession", pct: 17, count: "1 (17%)" },
    { label: "Finalization", pct: 17, count: "1 (17%)" },
  ];

  const sidebarGroups = [
    {
      title: "Statutory Navigation",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: view === "dashboard", onClick: nav("dashboard") },
        { label: "Pending Reviews", icon: <Clock3 size={16} />, badge: pending.length, active: view === "pending", onClick: nav("pending") },
        { label: "All Cases", icon: <FolderOpen size={16} />, badge: dockets.length, active: view === "all", onClick: nav("all") },
        { label: "Contested Cases", icon: <Gavel size={16} />, badge: contestedList.length, active: view === "contested", onClick: nav("contested") },
        { label: "Stayed Cases", icon: <OctagonPause size={16} />, badge: stayedList.length, active: view === "stayed", onClick: nav("stayed") },
        { label: "Compensation", icon: <IndianRupee size={16} />, active: view === "compensation", onClick: nav("compensation") },
        { label: "Notices", icon: <FileText size={16} />, active: view === "notices", onClick: nav("notices") },
        { label: "Objections & Hearings", icon: <Users size={16} />, badge: objections.length, active: view === "objections", onClick: nav("objections") },
        { label: "Possession", icon: <KeyRound size={16} />, badge: 1, active: view === "possession", onClick: nav("possession") },
        { label: "Approved Cases", icon: <CheckCircle2 size={16} />, badge: approvedList.length, active: view === "approved", onClick: nav("approved") },
        { label: "Audit Trail", icon: <History size={16} />, active: view === "audit", onClick: nav("audit") },
      ],
    },
    {
      title: "Authority",
      items: [{ label: "CALA Powers & SOP", icon: <Gavel size={16} />, active: view === "powers", onClick: nav("powers") }],
    },
  ];

  const docketTable = (rows: Docket[], opts?: { showSubmitted?: boolean }) => (
    <>
      <div className="hidden lg:block">
        <TableShell minWidth="min-w-[1000px]">
          <thead><tr><Th>Case ID</Th><Th>Project & Implementing Agency</Th><Th className="text-center">Parcels</Th><Th className="text-right">Total Area</Th><Th>Status</Th><Th className="text-right">Compensation Assessed</Th><Th>Current Stage</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-sky-50/40">
                <Td>
                  <p className="font-mono font-bold text-amber-700">{d.id}</p>
                  {d.status === "Contested" && <p className="mt-0.5 text-[10px] font-semibold text-slate-400">● Contested Title</p>}
                  {d.status === "Stayed" && <p className="mt-0.5 text-[10px] font-semibold text-red-500">▲ Court Stay Active</p>}
                </Td>
                <Td><p className="max-w-[260px] font-semibold text-slate-800">{d.project}</p><p className="max-w-[260px] truncate text-[11px] text-slate-400">{d.agency}</p></Td>
                <Td className="text-center font-mono">{d.parcels}</Td>
                <Td className="text-right font-mono">{d.area}</Td>
                <Td><StatusPill s={d.status} /></Td>
                <Td className="text-right font-mono font-semibold">{d.compensation}</Td>
                <Td className="text-slate-600">{d.stage}</Td>
                <Td className="text-right"><button onClick={() => openDocket(d.id)} className="whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Open Docket →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
      <div className="p-4 lg:hidden"><DocketCards rows={rows} onOpen={openDocket} /></div>
      {opts?.showSubmitted !== false ? null : null}
    </>
  );

  return (
    <PortalLayout
      portalBadge="Approver Portal"
      portalSub="Land Acquisition Legal & Administrative Clearance"
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={`CALA • ${OFFICER.badge}`}
      activeContext="Gautam Buddha Nagar (Dadri) • Uttar Pradesh"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "CALA Authority & Powers",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile",
        onViewOfficerProfile: nav("powers"),
        onViewOrgProfile: nav("powers"),
        onResetDemo: () => {
          setDockets(initialDockets);
          setQuery("");
          setView("dashboard");
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 5,
        onNotificationClick: nav("dashboard"),
      }}
      topActions={
        <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold xl:inline-flex">
          <span className="text-slate-400">Authority:</span>
          {(["CALA", "DM"] as const).map((a) => (
            <button key={a} onClick={() => setAuthority(a)} className={`rounded-md px-2.5 py-1 ${authority === a ? "bg-[#0B2A5B] text-white" : "text-slate-500 hover:text-slate-800"}`}>
              {a === "CALA" ? "CALA (Competent Authority)" : "DM / DC"}
            </button>
          ))}
        </span>
      }
    >
      {/* ================= DASHBOARD ================= */}
      {view === "dashboard" && (
        <>
          <GreetingHeader
            eyebrow="Judicial & Statutory Overview • Gautam Buddha Nagar (Dadri)"
            title="Acquisition Approver Command Center"
            subtitle="Welcome, Smt. Ananya Deshmukh, IAS. Review acquisition dockets, statutory declarations, compensation schedules, field verification reports, and execute legally binding clearance orders."
            actions={
              <button onClick={nav("pending")} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">
                Open Pending Review Queue →
              </button>
            }
          />

          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Decision-Oriented Metrics</p>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((m) => (
              <PortalCard key={m.label} className="!p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{m.label}</p>
                <p className="mt-1 text-3xl font-black text-[#0B1F44]">{m.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{m.sub}</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-bold text-[#0B1F44]">⚠ Priority Alerts & Action Items</h2>
              <span className="text-[11px] text-slate-500">5 critical alerts require statutory attention</span>
            </div>
            <div className="space-y-2.5">
              {alerts.map((a) => (
                <div key={a.caseId} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">
                      {a.title}{" "}
                      <span className="ml-1 whitespace-nowrap rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{a.tag}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{a.desc}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden font-mono text-[10px] font-semibold text-amber-700 xl:block">{a.caseId}</span>
                    <button onClick={() => openDocket(a.caseId)} className="inline-flex items-center gap-1 rounded-lg bg-[#0B2A5B] px-2.5 py-1.5 text-[11px] font-bold text-white">
                      Review <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard>
              <h2 className="text-sm font-bold text-[#0B1F44]">Cases by Workflow Stage</h2>
              <p className="mt-0.5 text-right text-[11px] text-slate-400">Total: {dockets.length} dockets</p>
              <div className="mt-3 space-y-3">
                {stages.map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-600">{s.label}</span>
                      <span className="font-semibold text-slate-500">{s.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">Workflow strictly gated by statutory verification</p>
            </PortalCard>
            <PortalCard>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0B1F44]">Compensation & Field Status Overview</h2>
                <span className="hidden text-[10px] text-slate-400 sm:block">RFCTLARR & NH Act Compliance</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  { l: "Total Assessed Acquisition Value", s: "Across 6 notified corridor dockets", v: "₹4,409.86 Cr" },
                  { l: "Escrow Disbursed to Affected Khatedars", s: "Jewar Airport + NH-9 Expansions", v: "₹3,322.00 Cr" },
                  { l: "Pending CALA Determination / Release", s: "Delhi-Mumbai NE-4 + Ganga Expressway", v: "₹1,087.86 Cr" },
                ].map((r) => (
                  <div key={r.l} className="rounded-lg bg-slate-900 p-3 text-white">
                    <p className="text-xs font-semibold">{r.l}</p>
                    <p className="text-[11px] text-slate-400">{r.s}</p>
                    <p className="mt-1 text-right font-mono text-sm font-bold text-emerald-400">{r.v}</p>
                  </div>
                ))}
              </div>
            </PortalCard>
          </div>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-bold text-[#0B1F44]">Recent Decisions & Quasi-Judicial Orders</h2><p className="text-[11px] text-slate-500">Decisions signed by Competent Authority / District Magistrate</p></div>
              <button onClick={nav("audit")} className="w-fit text-xs font-bold text-amber-700 hover:text-amber-900">View Complete Audit Trail →</button>
            </div>
            <TableShell minWidth="min-w-[820px]">
              <thead><tr><Th>Case ID</Th><Th>Project</Th><Th>Decision</Th><Th>Date</Th><Th>Authority</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {[
                  ["NHAI-NH9-WIDENING-2026-031", "NH-9 14-Lane Expansion Package 2", "Approved", "2026-08-14", "CALA-Dadri"],
                  ["RRTS-DEL-MEERUT-2026-015", "Delhi-Ghaziabad-Meerut RRTS Rapid Rail", "Mark Stayed", "2026-09-24", "CALA Legal Cell"],
                  ["DFCCIL-WDFC-DGR-2026-042", "Western Dedicated Freight Corridor", "Mark Contested", "2026-09-04", "CALA / Senior LAO"],
                ].map(([c, p, d, dt, a]) => (
                  <tr key={c} className="hover:bg-sky-50/40">
                    <Td className="font-mono font-bold text-amber-700">{c}</Td>
                    <Td className="text-slate-600">{p}</Td>
                    <Td><StatusPill s={d} /></Td>
                    <Td className="font-mono text-slate-500">{dt}</Td>
                    <Td className="text-slate-600">{a}</Td>
                    <Td className="text-right"><button onClick={() => openDocket(c)} className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Inspect Docket</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= PENDING QUEUE ================= */}
      {view === "pending" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Pending Review Queue <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-xs font-black text-amber-800">{pending.length} Dockets Waiting</span></h1>
              <p className="mt-1 text-sm text-slate-500">Mandatory quasi-judicial clearance docket. Approvers must inspect evidence before issuing an acquisition award.</p>
            </div>
            <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">Strict Rule: One-click direct approval from table is disabled.</span>
          </div>

          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Project Name, or Implementing Agency…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
              <FilterSelect label="All Priorities" />
              <FilterSelect label="All Stages" />
              <FilterSelect label="All PIAs" />
              <FilterSelect label="All Statuses" />
              <FilterSelect label="Contested: All" />
              <FilterSelect label="Judicial Stay: All" />
            </div>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <div className="hidden lg:block">
              <TableShell minWidth="min-w-[1200px]">
                <thead><tr><Th>Case ID</Th><Th>Project & PIA</Th><Th>Parcels / Area</Th><Th>LAO Validation</Th><Th>Field Verification</Th><Th>Compensation</Th><Th>Priority</Th><Th>Current Stage</Th><Th>Submitted</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {pending.filter(matchQ).map((d) => (
                    <tr key={d.id} className="hover:bg-sky-50/40">
                      <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{d.id}</Td>
                      <Td><p className="max-w-[220px] font-semibold text-slate-800">{d.project}</p><p className="max-w-[220px] truncate text-[11px] text-slate-400">{d.agency}</p></Td>
                      <Td><p className="font-semibold">{d.parcels} Plots</p><p className="font-mono text-[11px] text-slate-400">{d.area}</p></Td>
                      <Td><p className="flex items-center gap-1 font-mono font-bold text-slate-700"><CircleCheck size={12} className="text-emerald-600" /> {d.lao}</p><p className="text-[10px] text-slate-400">{d.laoNote}</p></Td>
                      <Td><p className={`font-semibold ${d.field.includes("Certified") ? "text-emerald-700" : "text-amber-700"}`}>{d.field}</p>{d.fieldNote && <p className="text-[10px] text-slate-400">{d.fieldNote}</p>}</Td>
                      <Td><p className={`font-semibold ${d.comp.includes("Approved") ? "text-emerald-700" : d.comp.includes("Return") ? "text-red-600" : "text-amber-700"}`}>{d.comp}</p><p className="font-mono text-[10px] text-slate-400">{d.compNote}</p></Td>
                      <Td><PriPill p={d.priority} /></Td>
                      <Td><p className="font-semibold text-slate-700">{d.stage}</p><p className="text-[10px] text-slate-400">{d.status === "Awaiting Approval" ? "Awaiting Approval" : d.status}</p></Td>
                      <Td className="whitespace-nowrap font-mono text-slate-500">{d.submitted}</Td>
                      <Td className="text-right"><button onClick={() => openDocket(d.id)} className="whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Review Case →</button></Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
            <div className="space-y-3 p-4 lg:hidden">
              {pending.filter(matchQ).map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-mono text-[11px] font-bold text-amber-700">{d.id}</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{d.project}</p>
                  <p className="text-[11px] text-slate-500">{d.parcels} plots · {d.area} · LAO {d.lao} · {d.field}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5"><StatusPill s={d.comp} /><PriPill p={d.priority} /></div>
                  <button onClick={() => openDocket(d.id)} className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-white">Review Case →</button>
                </div>
              ))}
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= ALL / CONTESTED / STAYED / APPROVED ================= */}
      {(view === "all" || view === "contested" || view === "stayed" || view === "approved") && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">
                {view === "all" && <>All Acquisition Dockets <CountBadge n={dockets.length} /></>}
                {view === "contested" && <>Contested Acquisition Dockets <CountBadge n={contestedList.length} /></>}
                {view === "stayed" && <>Stayed Acquisition Dockets <CountBadge n={stayedList.length} /></>}
                {view === "approved" && <>Approved & Finalized Acquisitions <CountBadge n={approvedList.length} /></>}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {view === "all" && "Master directory of all land acquisition cases across all stages."}
                {view === "contested" && "Parcels flagged with title disputes, civil court suits, or boundary claims."}
                {view === "stayed" && "Parcels halted due to interim judicial injunctions from High Court or Tribunals."}
                {view === "approved" && "Statutory approvals granted, awards passed, or physical possession certified."}
              </p>
            </div>
            <button onClick={nav("pending")} className="w-fit rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">Go to Pending Reviews</button>
          </div>

          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Project, or Agency…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Districts" />
            </div>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            {docketTable(
              (view === "all" ? dockets : view === "contested" ? contestedList : view === "stayed" ? stayedList : approvedList).filter(matchQ)
            )}
          </PortalCard>
        </>
      )}

      {/* ================= COMPENSATION ================= */}
      {view === "compensation" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">💰 Compensation & Award Oversight</h1>
              <p className="mt-1 text-sm text-slate-500">RFCTLARR First Schedule & NH Act 3G determinations across all active acquisition corridors.</p>
            </div>
            <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">Authorised: CALA Sanction Powers</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {compCards.map((c) => (
              <PortalCard key={c.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-[11px] font-bold text-amber-700">{c.id}</p>
                  <StatusPill s={c.flag} />
                </div>
                <p className="mt-1.5 text-sm font-bold leading-snug text-slate-800">{c.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{c.basis}</p>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 font-mono text-xs">
                  <p className="flex justify-between"><span className="font-sans text-slate-500">Total Award:</span><span className="font-bold text-emerald-700">{c.award}</span></p>
                  <p className="flex justify-between"><span className="font-sans text-slate-500">Disbursed / Escrow:</span><span className="font-bold text-slate-700">{c.disb}</span></p>
                </div>
                <button onClick={() => openDocket(c.id)} className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Inspect Compensation Schedule →</button>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= NOTICES ================= */}
      {view === "notices" && (
        <>
          <GreetingHeader
            eyebrow="Sections 3A / 3D / 3G • Gazette & Claims"
            title="Statutory Notices Register"
            subtitle="Section 3A, 3D, 3G gazetted proclamations and claims invitation notices."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[960px]">
              <thead><tr><Th>Notice ID</Th><Th>Project</Th><Th>Type</Th><Th>Gazette Ref</Th><Th>Issue Date</Th><Th>Deadline</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{n.id}</Td>
                    <Td className="max-w-[240px] truncate text-slate-600">{n.project}</Td>
                    <Td className="whitespace-nowrap text-slate-600">{n.type}</Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{n.gazette}</Td>
                    <Td className="whitespace-nowrap font-mono text-slate-500">{n.issue}</Td>
                    <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{n.deadline}</Td>
                    <Td><StatusPill s={n.status} /></Td>
                    <Td className="text-right"><button className="text-[11px] font-bold text-amber-700 hover:text-amber-900">Open Case</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= OBJECTIONS ================= */}
      {view === "objections" && (
        <>
          <GreetingHeader
            eyebrow="Section 3C / Section 15 • Quasi-judicial hearings"
            title="Public Objections & Hearing Registry"
            subtitle="Section 3C / Section 15 RFCTLARR objections, quasi-judicial summons, and disposal orders."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[960px]">
              <thead><tr><Th>Objection ID</Th><Th>Project & Khasra</Th><Th>Applicant Ref</Th><Th>Ground of Objection</Th><Th>Hearing Date</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {objections.map((o) => (
                  <tr key={o.id} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{o.id}</Td>
                    <Td><p className="max-w-[240px] truncate font-medium text-slate-700">{o.project}</p><p className="text-[11px] text-slate-400">{o.khasra}</p></Td>
                    <Td className="max-w-[240px] truncate font-mono text-[11px] text-slate-500">{o.applicant}</Td>
                    <Td className="text-slate-600">{o.ground}</Td>
                    <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{o.hearing}</Td>
                    <Td><StatusPill s={o.status} /></Td>
                    <Td className="text-right"><button className="whitespace-nowrap text-[11px] font-bold text-amber-700 hover:text-amber-900">Conduct Hearing</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= POSSESSION ================= */}
      {view === "possession" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">🔑 Statutory Possession Handover Docket</h1>
              <p className="mt-1 text-sm text-slate-500">Section 38/40 Regular & Urgency possession mandates. Final possession sign-off is exclusive to DM/DC.</p>
            </div>
            <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">CALA View (DM/DC executes final possession)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {possessionCards.map((p) => (
              <PortalCard key={p.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-[11px] font-bold text-amber-700">{p.id}</p>
                  <StatusPill s={p.readiness === "Ready" ? "Possession Pending" : p.readiness === "Granted" ? "Possession Granted" : "Not Ready"} />
                </div>
                <p className="mt-1.5 text-sm font-bold text-slate-800">{p.title}</p>
                <p className="text-[11px] text-slate-500">Agency: {p.agency}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
                  <p className="text-slate-500">Panchnama Reference:<br /><span className="font-mono text-slate-700">{p.state}</span></p>
                  <p className="text-slate-500">Compensation Status:<br /><span className="font-semibold text-emerald-700">{p.stateNote}</span></p>
                </div>
                <button className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Inspect Possession Checklist →</button>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= AUDIT ================= */}
      {view === "audit" && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Statutory Quasi-Judicial Audit Trail <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-xs font-black text-amber-800">{auditRows.length} Recorded Entries</span></h1>
              <p className="mt-1 text-sm text-slate-500">Read-only master audit log. Cryptographically seals all acquisition approvals, rejections, stays, and warrants.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500"><ShieldCheck size={13} className="text-emerald-600" /> Tamper-evident legal ledger</span>
          </div>
          <PortalCard className="!p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input placeholder="Search by Case ID, Officer, Action, or Reason…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <FilterSelect label="All Authorities" />
            </div>
          </PortalCard>
          <PortalCard className="mt-4 !p-0">
            <TableShell minWidth="min-w-[1100px]">
              <thead><tr><Th>Log ID</Th><Th>Case Reference</Th><Th>Timestamp</Th><Th>Officer / Actor</Th><Th>Authority</Th><Th>Action Executed</Th><Th>Status Transition</Th><Th>Legal Reason / Justification</Th></tr></thead>
              <tbody>
                {auditRows.map((r) => (
                  <tr key={r.log} className="hover:bg-sky-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{r.log}</Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{r.ref}</Td>
                    <Td className="whitespace-nowrap font-mono text-slate-500">{r.ts}</Td>
                    <Td className="whitespace-nowrap font-medium text-slate-700">{r.actor}</Td>
                    <Td><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-black ${r.auth === "CALA" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>{r.auth}</span></Td>
                    <Td className="max-w-[220px] text-slate-700">{r.action}</Td>
                    <Td><StatusPill s={r.trans} /></Td>
                    <Td className="max-w-[280px] text-slate-500">{r.reason}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= DOCKET DETAIL ================= */}
      {view === "docket" && (
        <>
          <div className="mb-4 flex flex-col gap-2 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex flex-wrap items-center gap-2">
              <button onClick={nav("pending")} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800"><ArrowLeft size={14} /> Back to Pending Queue</button>
              <span className="text-slate-300">/</span>
              <span className="font-mono font-bold text-slate-900">{selected.id}</span>
            </p>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold">
              Acting as: <button onClick={() => setAuthority("CALA")} className={`rounded px-1.5 py-0.5 ${authority === "CALA" ? "bg-[#0B2A5B] text-white" : "text-slate-500"}`}>CALA</button>
              <button onClick={() => setAuthority("DM")} className={`rounded px-1.5 py-0.5 ${authority === "DM" ? "bg-[#0B2A5B] text-white" : "text-slate-500"}`}>DM / DC</button>
            </span>
          </div>

          <PortalCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-black text-slate-900">{selected.id}</span>
                  <StatusPill s={selected.status} /> <PriPill p={selected.priority} />
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-700">{selected.project}</p>
                <p className="text-xs text-slate-500">{selected.agency} · {selected.parcels} parcels · {selected.area} · {selected.compensation}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStatus(selected.id, "Approved", "Finalization")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"><CircleCheck size={14} /> Approve Award</button>
                <button onClick={() => setStatus(selected.id, "Returned / Correction", "Approver Review")} className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">Return Docket</button>
                <button onClick={() => setStatus(selected.id, "Contested", "Approver Review")} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Mark Contested</button>
                <button onClick={() => setStatus(selected.id, "Stayed", "Approver Review")} className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Mark Stayed</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["LAO Desk Validation", `${selected.lao} — ${selected.laoNote}`, "text-emerald-700"],
                ["Field Verification (JMS)", selected.field, selected.field.includes("Certified") ? "text-emerald-700" : "text-amber-700"],
                ["Compensation Schedule", `${selected.comp} (${selected.compNote})`, selected.comp.includes("Approved") ? "text-emerald-700" : "text-amber-700"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l as string}</p>
                  <p className={`mt-1 font-bold ${c as string}`}>{v as string}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-slate-700">
              <p className="font-bold text-amber-900">Quasi-judicial safeguard</p>
              <p className="mt-1">Approval executes a legally binding acquisition award and is DSC-signed into the tamper-evident audit trail. Contested titles must be referred to LARRA deposit; stayed parcels cannot be approved until the injunction is vacated.</p>
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard>
              <h2 className="text-sm font-bold text-[#0B1F44]">Statutory Compliance Checklist</h2>
              <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
                {["Section 3A intention gazette published & served", "Section 3C objections heard and disposed with speaking order", "LAO RoR validation reconciled with Bhulekh extract", "JMS field verification certified by Tehsil staff", "Compensation computed per First Schedule + solatium + R&R"].map((c, i) => (
                  <li key={c} className="flex items-start gap-2">
                    <CircleCheck size={15} className={i < 2 ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-slate-300"} />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </PortalCard>
            <PortalCard>
              <h2 className="text-sm font-bold text-[#0B1F44]">Case Audit Excerpt</h2>
              <div className="mt-3 space-y-2.5">
                {auditRows.filter((r) => r.ref === selected.id).map((r) => (
                  <div key={r.log} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                    <p className="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-800">{r.log} <span className="font-sans font-medium text-slate-400">{r.ts}</span></p>
                    <p className="mt-1 text-slate-600">{r.actor} ({r.auth}) — {r.action}</p>
                    <p className="mt-0.5 text-slate-500">{r.reason}</p>
                  </div>
                ))}
                {auditRows.filter((r) => r.ref === selected.id).length === 0 && (
                  <p className="text-xs text-slate-500">No audit entries yet for this docket in the demo ledger. Actions taken above are recorded to the quasi-judicial trail.</p>
                )}
              </div>
              <button onClick={nav("audit")} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0B3B5F]">Open full audit trail <ArrowRight size={13} /></button>
            </PortalCard>
          </div>
        </>
      )}

      {/* ================= POWERS ================= */}
      {view === "powers" && (
        <>
          <GreetingHeader
            eyebrow="Authority • CALA-UP-GBN-84"
            title="CALA Powers & Statutory SOP"
            subtitle="Competent Authority powers under RFCTLARR 2013 and NH Act 1956, plus the officer dossier."
          />
          <PortalCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0B2A5B] text-sm font-black text-white">AD</span>
                <div>
                  <p className="text-sm font-black text-[#0B1F44]">{OFFICER.name}, IAS</p>
                  <p className="text-[11px] text-slate-500">{OFFICER.designation} · Badge {OFFICER.badge}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13} /> {OFFICER.level}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right text-xs">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Jurisdiction</p>
                <p className="font-bold text-slate-800">{OFFICER.jurisdiction}</p>
                <p className="mt-1 flex items-center justify-end gap-1 font-mono text-[11px] text-slate-500"><IdCard size={12} /> {OFFICER.badge}</p>
              </div>
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard className="border-emerald-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><User size={15} /> CALA Sanction Powers</h2>
              <div className="mt-3 space-y-2">
                {["Grant Section 3D / Section 19 vesting declarations", "Determine Section 3G / Section 23 compensation awards", "Dispose Section 3C / Section 15 objections with speaking orders", "Refer contested titles to LARRA deposit / civil court", "Approve possession handover dossiers to DM/DC"].map((t) => (
                  <p key={t} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-slate-700">
                    <CircleCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> {t}
                  </p>
                ))}
              </div>
            </PortalCard>
            <PortalCard>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1F44]"><BookOpen size={15} /> Quasi-Judicial SOP</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
                <li>Never approve from the table — always open the docket and inspect LAO validation, JMS report and compensation schedule.</li>
                <li>Contested titles go to deposit, not award. Stayed parcels cannot be approved until injunction vacated.</li>
                <li>Every approve / return / contest / stay order is DSC-signed with legal reasons into the audit trail.</li>
                <li>Possession sign-off is exclusive to DM/DC after 100% compensation disbursement or escrow deposit.</li>
              </ol>
              <button onClick={() => window.print()} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Printer size={13} /> Print SOP</button>
            </PortalCard>
          </div>
        </>
      )}

      {/* Footer authority note */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]"><ShieldCheck size={13} className="text-amber-500" /> Statutory Authority Scope</p>
        <p className="mt-1">CALA approvals constitute binding acquisition awards under Sec 3G / Sec 23. Possession handover requires DM/DC sign-off. Every action is DSC-signed and written to the tamper-evident quasi-judicial audit log.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={nav("audit")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><History size={12} /> Audit Trail</button>
          <button onClick={nav("powers")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><BookOpen size={12} /> CALA Powers & SOP</button>
          <button onClick={nav("pending")} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 font-bold text-white">Continue Reviews <ArrowRight size={12} /></button>
        </div>
      </div>
    </PortalLayout>
  );
}

function CountBadge({ n }: { n: number }) {
  return <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-xs font-black text-amber-800">{n} Dockets</span>;
}

export default ApproverPortal;
