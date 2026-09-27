import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  CircleCheck,
  TriangleAlert,
  RefreshCw,
  Bell,
  User,
  ArrowRight,
  ArrowLeft,
  Search,
  ChevronDown,
  MapPin,
  Layers,
  Calendar,
  Camera,
  Navigation,
  Lock,
  Eye,
  Wifi,
  WifiOff,
  ShieldCheck,
  CircleAlert,
  Save,
  Trash2,
  Smartphone,
} from "lucide-react";
import PortalLayout, {
  PortalCard,
  GreetingHeader,
} from "../components/portal/PortalLayout";

export const Route = createFileRoute("/field-officer")({
  component: FieldOfficerPortal,
});

type ViewKey =
  | "dashboard"
  | "assignments"
  | "map"
  | "completed"
  | "mismatches"
  | "sync"
  | "notifications"
  | "profile"
  | "verify";

const OFFICER = {
  name: "Rajesh Kumar Verma",
  initials: "RK",
  role: "Patwari",
  designation: "Patwari / Ground Verification Officer",
  badge: "FO-UP-2024-089",
  dept: "Department of Revenue & Land Records, Govt. of UP",
  phone: "+91 98765 43210",
  email: "r.verma.rev@up.gov.in",
  jurisdiction: "Varanasi · Pindra — Mauza Ramnagar & Kashi Ring Road Sector 4",
  level: "Authorized Field Officer (Ground Verification Only)",
};

interface Assignment {
  id: string;
  khasra: string;
  village: string;
  district: string;
  areaHa: string;
  areaBigha: string;
  owner: string;
  khata: string;
  project: string;
  due: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
  status: "Assigned" | "In Progress" | "Needs Clarification" | "Submitted" | "Completed";
  distance: string;
  note: string;
}

const initialAssignments: Assignment[] = [
  { id: "ASN-2026-0491", khasra: "142/1", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.450 Hectare", areaBigha: "1.78 Bigha", owner: "Shri Mahendra Pratap Singh", khata: "87", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-28", priority: "Urgent", status: "In Progress", distance: "~0.8 km away", note: "Verify road frontage encroachment claim on eastern boundary adjacent to existing PWD road." },
  { id: "ASN-2026-0492", khasra: "143", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.620 Hectare", areaBigha: "2.45 Bigha", owner: "Ram Lakhan Yadav & Ram Sunder Yadav", khata: "104", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-29", priority: "High", status: "Assigned", distance: "~1.2 km away", note: "Check presence of unrecorded tubewell and brick godown on southern corner." },
  { id: "ASN-2026-0479", khasra: "109/B", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.840 Hectare", areaBigha: "3.32 Bigha", owner: "Surendra Kumar Tripathi", khata: "63", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-25", priority: "High", status: "Needs Clarification", distance: "~2.1 km away", note: "LAO office flagged: Please re-verify northern boundary monument stone as per village sajra map." },
  { id: "ASN-2026-0487", khasra: "118/2", village: "Mauza Mirzapur Khurd", district: "Varanasi", areaHa: "0.310 Hectare", areaBigha: "1.22 Bigha", owner: "Smt. Malti Devi", khata: "41", project: "Dedicated Freight Corridor (DFCCIL)", due: "2026-09-27", priority: "Medium", status: "Submitted", distance: "~3.4 km away", note: "Completed offline during yesterday field trip. Awaiting sync from local tablet storage." },
  { id: "ASN-2026-0460", khasra: "98", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.510 Hectare", areaBigha: "2.01 Bigha", owner: "Dhananjay Singh", khata: "22", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-21", priority: "Low", status: "Completed", distance: "~1.6 km away", note: "Verified and transmitted to revenue database on 21/09/2026." },
];

const mismatches = [
  { id: "MIS-2026-0881", parcel: "Khasra 142/1", asn: "ASN-2026-0491", cls: "Boundary", sev: "High", date: "25/09/2026", status: "Under Review" },
  { id: "MIS-2026-0842", parcel: "Khasra 109/B", asn: "ASN-2026-0479", cls: "Unrecorded Structure", sev: "Medium", date: "24/09/2026", status: "Open" },
];

const notifications = [
  { unread: true, icon: "assign", time: "13:45", title: "New Priority Assignment", desc: "Khasra 143 (Ramnagar, 0.620 Ha) assigned for ground verification under NHAI Ring Road package." },
  { unread: true, icon: "clarify", time: "22:10", title: "Clarification Requested by Circle Office", desc: "LAO flagged northern boundary monument marker for Khasra 109/B. Please review request." },
  { unread: false, icon: "sync", time: "23:30", title: "Offline Record Awaiting Sync", desc: "Field report for Khasra 118/2 saved locally. Please sync when mobile network is restored." },
  { unread: false, icon: "deadline", time: "11:30", title: "Upcoming Verification Deadline", desc: "Assignment ASN-2026-0491 (Khasra 142/1) due in 2 days on 28-Sep-2026." },
];

const wizardSteps = [
  "Parcel Identity", "Ownership Verification", "Land Details", "Boundary Verification",
  "GPS Verification", "Photo Evidence", "Asset Verification", "Witness Statements", "Review & Submit",
];

const assetOptions = [
  "Borewell / Submersible / Irrigation Well", "Pucca Concrete Structure / Building",
  "Kaccha Hut / Shed / Cattle Barn", "Erected Boundary Wall or Wire Fencing",
  "Fruit Trees / Commercial Timber Plantation", "Pond / Low-lying Waterlogged Depression",
  "Overhead High-Tension (HT) Transmission Line",
];

/* ================= HELPERS ================= */

function PriPill({ p }: { p: string }) {
  const tone =
    p === "Urgent" ? "bg-red-100 text-red-800"
    : p === "High" ? "bg-amber-100 text-amber-800"
    : p === "Medium" ? "bg-slate-100 text-slate-600"
    : "bg-slate-100 text-slate-500";
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>{p}</span>;
}

function StatusPill({ s }: { s: string }) {
  const tone =
    s === "In Progress" ? "bg-blue-50 text-blue-700"
    : s === "Assigned" ? "bg-slate-100 text-slate-600"
    : s === "Needs Clarification" ? "bg-red-50 text-red-700"
    : s === "Submitted" ? "bg-emerald-50 text-emerald-700"
    : s === "Completed" || s === "Verified" ? "bg-emerald-100 text-emerald-800"
    : s === "Under Review" ? "bg-blue-50 text-blue-700"
    : s === "Open" ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-600";
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>{s}</span>;
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50/70 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}
function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={16} className="shrink-0 text-slate-500" />
    </label>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-bold text-slate-700">{children}</p>;
}
function TextInput({ value, onChange, placeholder }: { value: string; onChange?: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600"
    />
  );
}
function RadioCard({ selected, onClick, title, desc }: { selected: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start justify-between gap-2 rounded-xl border p-3.5 text-left transition ${selected ? "border-emerald-800 bg-emerald-50/60 ring-1 ring-emerald-800" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <span>
        <span className="block text-xs font-bold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{desc}</span>
      </span>
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-emerald-800" : "border-slate-300"}`}>
        {selected && <span className="h-2 w-2 rounded-full bg-emerald-800" />}
      </span>
    </button>
  );
}

/* ================= MAIN ================= */

function FieldOfficerPortal() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedId, setSelectedId] = useState("ASN-2026-0492");
  const [mapParcel, setMapParcel] = useState("Khasra 142/1 (Ramnagar)");
  const [wStep, setWStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // wizard answers
  const [parcelVerdict, setParcelVerdict] = useState("Verified");
  const [possession, setPossession] = useState("Confirmed");
  const [areaVerdict, setAreaVerdict] = useState("Matches Record");
  const [boundaries, setBoundaries] = useState<Record<string, string>>({ North: "Matches record", South: "Matches record", East: "Matches record", West: "Matches record" });
  const [gps, setGps] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const nav = (key: ViewKey) => () => {
    setView(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openVerify = (id: string) => {
    setSelectedId(id);
    setWStep(1);
    setSubmitted(false);
    setAssignments((list) => list.map((a) => (a.id === id && a.status === "Assigned" ? { ...a, status: "In Progress" } : a)));
    setView("verify");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selected = assignments.find((a) => a.id === selectedId) ?? assignments[0];
  const filtered = useMemo(() => {
    const x = query.trim().toLowerCase();
    if (!x) return assignments;
    return assignments.filter((a) => `${a.id} ${a.khasra} ${a.owner} ${a.village}`.toLowerCase().includes(x));
  }, [query, assignments]);

  const overview = [
    { label: "Assigned", value: "5", tone: "text-slate-600", icon: ClipboardList },
    { label: "Pending", value: "3", tone: "text-amber-700", icon: Bell },
    { label: "In Progress", value: "1", tone: "text-blue-700", icon: RefreshCw },
    { label: "Completed", value: "2", tone: "text-emerald-800", icon: CircleCheck },
    { label: "Mismatches", value: "2", tone: "text-red-800", icon: TriangleAlert },
    { label: "Offline", value: "0", tone: "text-slate-500", icon: WifiOff },
    { label: "Pending Sync", value: "0", tone: "text-amber-700", icon: RefreshCw },
  ];

  const sidebarGroups = [
    {
      title: "Field Officer Mode",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: view === "dashboard", onClick: nav("dashboard") },
        { label: "My Assignments", icon: <ClipboardList size={16} />, active: view === "assignments" || view === "verify", onClick: nav("assignments") },
        { label: "Map", icon: <MapIcon size={16} />, active: view === "map", onClick: nav("map") },
        { label: "Completed", icon: <CircleCheck size={16} />, active: view === "completed", onClick: nav("completed") },
        { label: "Mismatches", icon: <TriangleAlert size={16} />, badge: 2, active: view === "mismatches", onClick: nav("mismatches") },
        { label: "Sync Center", icon: <RefreshCw size={16} />, active: view === "sync", onClick: nav("sync") },
        { label: "Notifications", icon: <Bell size={16} />, badge: 2, active: view === "notifications", onClick: nav("notifications") },
        { label: "Profile", icon: <User size={16} />, active: view === "profile", onClick: nav("profile") },
      ],
    },
  ];

  const pct = Math.round((wStep / 9) * 100);

  return (
    <PortalLayout
      portalBadge="Field Verification"
      portalSub="Field Officer Mode · Authorized Ground Verification Only"
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={OFFICER.role}
      activeContext="Varanasi · Pindra"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "Field Jurisdiction & Profile",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile",
        onViewOfficerProfile: nav("profile"),
        onViewOrgProfile: nav("profile"),
        onResetDemo: () => {
          setAssignments(initialAssignments);
          setQuery("");
          setWStep(1);
          setSubmitted(false);
          setView("dashboard");
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 2,
        onNotificationClick: nav("notifications"),
      }}
      topActions={
        <button
          onClick={() => setOnline((v) => !v)}
          className={`hidden items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold lg:inline-flex ${online ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-600" : "bg-amber-600"}`} />
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? "ONLINE" : "OFFLINE"}
          <span className="font-medium opacity-70">| {online ? "Field Mode" : "Simulated"}</span>
        </button>
      }
    >
      {/* ================= DASHBOARD ================= */}
      {view === "dashboard" && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white sm:p-7">
            <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(600px 200px at 10% 0%, rgba(52,211,153,.35), transparent), radial-gradient(500px 220px at 90% 100%, rgba(52,211,153,.18), transparent)" }} />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300"><ShieldCheck size={13} /> Field Verification Console</p>
                <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">Ground Verification Workspace</h1>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">Physical ground verification of land boundaries, occupant possession, structures, and GPS coordinates for assigned infrastructure projects.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={nav("map")} className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10"><MapPin size={14} className="text-emerald-300" /> Open Cadastral Map</button>
                <button onClick={nav("assignments")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-600"><ClipboardList size={14} /> View All Assignments</button>
              </div>
            </div>
          </div>

          <p className="mb-2 mt-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Verification Overview</p>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {overview.map((o) => (
              <div key={o.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <p className="flex items-center justify-between text-[11px] font-semibold text-slate-500">{o.label} <o.icon size={14} className={o.tone} /></p>
                <p className={`mt-1 text-2xl font-black ${o.tone}`}>{o.value}</p>
              </div>
            ))}
          </section>

          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Today&apos;s Field Work <span className="ml-1 rounded-md bg-slate-100 px-2 py-0.5 align-middle text-[11px] font-bold text-slate-500">4 parcels</span></h2>
            <button onClick={nav("assignments")} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900">All Assignments <ArrowRight size={13} /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assignments.slice(0, 4).map((a) => (
              <div key={a.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="flex items-center justify-between font-mono text-[11px] font-bold text-emerald-900">{a.id} <PriPill p={a.priority} /></p>
                <p className="mt-1 text-base font-black text-slate-900">Khasra {a.khasra}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><MapPin size={12} className="shrink-0 text-slate-400" /> {a.village}, {a.district} <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-800">{a.distance}</span></p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Layers size={12} className="shrink-0 text-slate-400" /> {a.areaHa} ({a.areaBigha}) <span className="mx-1">·</span> {a.owner}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Calendar size={12} className="shrink-0 text-slate-400" /> Due Date: {a.due}</p>
                <p className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] leading-snug text-slate-600"><span className="font-bold text-slate-800">Circle Note:</span> {a.note}</p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <StatusPill s={a.status} />
                  <button onClick={() => openVerify(a.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">Start Verification <ArrowRight size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= ASSIGNMENTS ================= */}
      {view === "assignments" && (
        <>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">My Ground Assignments</h1>
              <p className="mt-1 text-sm text-slate-500">All land parcels assigned to your jurisdiction for physical boundary & ownership verification.</p>
            </div>
            <span className="w-fit rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Showing <b>{filtered.length}</b> of {assignments.length} assignments</span>
          </div>

          <PortalCard className="!p-4">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Khasra number, Assignment ID, Owner name, or Village…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p><FilterSelect label="All Statuses" /></div>
              <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</p><FilterSelect label="All Priorities" /></div>
              <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Village / Mauza</p><FilterSelect label="All Villages" /></div>
              <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</p><FilterSelect label="All Projects" /></div>
            </div>
          </PortalCard>

          <PortalCard className="mt-4 !p-0">
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead><tr><Th>Assignment ID</Th><Th>Parcel / Khasra</Th><Th>Project</Th><Th>Village / District</Th><Th>Area</Th><Th>Priority</Th><Th>Status</Th><Th>Due Date</Th><Th className="text-right">Action</Th></tr></thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="hover:bg-emerald-50/40">
                        <Td className="whitespace-nowrap font-mono font-bold text-slate-800">{a.id}</Td>
                        <Td><p className="font-bold text-slate-900">Khasra {a.khasra}</p><p className="max-w-[180px] truncate text-[11px] text-slate-400">{a.owner}</p></Td>
                        <Td className="max-w-[170px] truncate text-slate-500">{a.project.split("(")[0]}</Td>
                        <Td><p className="text-slate-600">{a.village.replace("Mauza ", "")},</p><p className="text-slate-500">{a.district}</p></Td>
                        <Td><p className="font-medium text-slate-700">{a.areaHa}</p><p className="text-[11px] text-slate-400">({a.areaBigha})</p></Td>
                        <Td><PriPill p={a.priority} /></Td>
                        <Td><StatusPill s={a.status} /></Td>
                        <Td className="whitespace-nowrap font-mono text-slate-500">{a.due}</Td>
                        <Td className="text-right"><button onClick={() => openVerify(a.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Eye size={12} /> Details</button></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3 p-4 lg:hidden">
              {filtered.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="flex items-center justify-between font-mono text-[11px] font-bold text-slate-700">{a.id} <PriPill p={a.priority} /></p>
                  <p className="mt-1 text-sm font-black text-slate-900">Khasra {a.khasra} · {a.owner}</p>
                  <p className="text-[11px] text-slate-500">{a.village}, {a.district} · {a.areaBigha} · Due {a.due}</p>
                  <div className="mt-2"><StatusPill s={a.status} /></div>
                  <button onClick={() => openVerify(a.id)} className="mt-3 w-full rounded-xl bg-emerald-900 py-2 text-xs font-bold text-white">Open Verification →</button>
                </div>
              ))}
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= MAP ================= */}
      {view === "map" && (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Cadastral Field Map</h1>
              <p className="mt-1 text-sm text-slate-500">Inspect official village sajra parcels, project corridor boundaries, and officer ground location.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              Select Parcel:
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-800">
                {mapParcel} <ChevronDown size={15} className="text-slate-500" />
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5"><Lock size={13} className="text-slate-500" /> <b>Cadastral Boundary Lock:</b> Official cadastral boundaries are read-only and cannot be redrawn by the field surveyor.</p>
            <p className="font-mono text-[11px] text-slate-400">WGS-84 / UTM Zone 44N</p>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-900 p-4 sm:p-6" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white">CADASTRAL SHEET: RAMNAGAR<br />Khasra 142/1 | 1.78 Bigha</span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-300"><Lock size={12} /> Official Boundary Locked (Read-Only)</span>
              <span className="ml-auto hidden items-center gap-3 rounded-xl border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-slate-300 sm:inline-flex"><Layers size={13} /> Cadastral <span className="text-slate-400">Sunlight Mode</span></span>
            </div>
            <svg viewBox="0 0 640 300" className="mx-auto mt-2 w-full max-w-[680px]">
              <rect x={120} y={40} width={400} height={220} rx={4} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="8 6" opacity={0.8} />
              <text x={140} y={58} fill="#f59e0b" fontSize={10} fontWeight={800}>PROPOSED HIGHWAY CORRIDOR</text>
              <g fontSize={10} textAnchor="middle" fontWeight={700}>
                <g transform="rotate(-6 320 160)">
                  <rect x={130} y={100} width={110} height={110} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                  <text x={185} y={155} fill="#cbd5e1">Khasra 140/2</text>
                  <rect x={240} y={60} width={130} height={70} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                  <text x={305} y={95} fill="#cbd5e1">Khasra 141</text>
                  <rect x={240} y={130} width={140} height={110} fill="rgba(52,211,153,.22)" stroke="#34d399" strokeWidth={2} />
                  <text x={310} y={178} fill="#fff" fontSize={12}>Khasra 142/1</text>
                  <text x={310} y={192} fill="#a7f3d0" fontSize={9}>1.78 Bigha</text>
                  <text x={310} y={112} fill="#a7f3d0" fontSize={8}>North: 54.2 m</text>
                  <text x={310} y={232} fill="#a7f3d0" fontSize={8}>South: 53.8 m</text>
                  <circle cx={310} cy={185} r={14} fill="rgba(96,165,250,.25)" stroke="#60a5fa" strokeDasharray="3 3" />
                  <circle cx={310} cy={185} r={5} fill="#60a5fa" stroke="#fff" strokeWidth={2} />
                  <text x={310} y={215} fill="#7dd3fc" fontSize={9}>You (Officer GPS ±2.1m)</text>
                  <rect x={380} y={110} width={110} height={120} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                  <text x={435} y={162} fill="#cbd5e1">PWD Road</text>
                  <text x={435} y={174} fill="#94a3b8" fontSize={8}>Existing 2-Lane</text>
                  <rect x={240} y={240} width={140} height={45} fill="rgba(148,163,184,.2)" stroke="#64748b" />
                  <text x={310} y={262} fill="#cbd5e1">Khasra 143</text>
                  {[[240, 130], [380, 130], [240, 240], [380, 240]].map(([x, y]) => (<circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill="#fff" />))}
                </g>
              </g>
            </svg>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[11px] text-emerald-300">⊕ Parcel Center: 25.26780°N, 83.02450°E <span className="ml-2 text-sky-300">◉ Acc: ±2.1m</span></p>
              <p className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3.5 py-2 text-xs font-bold text-white"><Navigation size={13} className="text-emerald-300" /> Locate Me</button>
                <button onClick={() => openVerify("ASN-2026-0491")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Start Verification <ArrowRight size={13} /></button>
              </p>
            </div>
          </div>

          <PortalCard className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-800">Varanasi Ring Road Phase-2 Extension (NHAI)</p>
                <p className="mt-0.5 text-base font-black text-slate-900">Khasra 142/1 · Mauza Ramnagar</p>
              </div>
              <button onClick={() => openVerify("ASN-2026-0491")} className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white">Verify Khasra 142/1 <ArrowRight size={13} /></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs lg:grid-cols-4">
              {[["Recorded Khatedar", "Shri Mahendra Pratap Singh"], ["Total Area", "1.78 Bigha (0.45 Ha)"], ["Coordinates", "25.26780°N, 83.02450°E"], ["Current Status", "In Progress"]].map(([l, v]) => (
                <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p></div>
              ))}
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= COMPLETED ================= */}
      {view === "completed" && (
        <>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Completed Field Verifications</h1>
              <p className="mt-1 text-sm text-slate-500">Official immutable records of ground inspections transmitted to the revenue database.</p>
            </div>
            <span className="w-fit rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">1 Submitted Record(s)</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
            <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <p><b>Immutable Audit Trail:</b> Submitted ground verifications cannot be altered directly. Any subsequent revisions require a formal clarification order from the Circle Officer.</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { ver: "VER-2026-UP-8820", khasra: "Khasra 98", village: "Mauza Ramnagar, Varanasi", owner: "Dhananjay Singh", date: "21/09/2026", photos: "0 Photo(s) · GPS Locked" },
              { ver: "VER-2026-UP-8841", khasra: "Khasra 118/2", village: "Mauza Mirzapur Khurd, Varanasi", owner: "Smt. Malti Devi", date: "25/09/2026", photos: "4 Photo(s) · GPS Locked" },
            ].map((c) => (
              <div key={c.ver} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="flex items-center justify-between font-mono text-[11px] font-bold text-emerald-900">{c.ver} <StatusPill s="Verified" /></p>
                <p className="mt-1 text-base font-black text-slate-900">{c.khasra}</p>
                <p className="text-xs text-slate-500">{c.village}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Recorded Owner</p><p className="font-bold">{c.owner}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Ground Occupant</p><p className="font-bold">Shri {c.owner}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Submitted At</p><p className="font-mono">{c.date}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Evidence Attached</p><p className="font-semibold">{c.photos}</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="font-mono text-[11px] text-slate-400">Officer: {OFFICER.badge}</p>
                  <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><Eye size={13} /> View Audit Record</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= MISMATCHES ================= */}
      {view === "mismatches" && (
        <>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Ground Discrepancy Queue</h1>
              <p className="mt-1 text-sm text-slate-500">Official field mismatches reported by the Patwari/Surveyor awaiting Circle Office review.</p>
            </div>
            <span className="w-fit rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">2 Active Discrepancy Record(s)</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
            <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <p><b>Role Boundary Enforced:</b> The Field Officer reports physical discrepancies. Final resolution, compensation adjustment, and title dispute adjudication are restricted to the Land Acquisition Officer (LAO).</p>
          </div>
          <PortalCard className="mt-4 !p-0">
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead><tr><Th>Mismatch ID</Th><Th>Parcel / Khasra</Th><Th>Classification</Th><Th>Severity</Th><Th>Submitted Date</Th><Th>Review Status</Th><Th className="text-right">Action</Th></tr></thead>
                  <tbody>
                    {mismatches.map((m) => (
                      <tr key={m.id} className="hover:bg-amber-50/40">
                        <Td className="whitespace-nowrap font-mono font-bold text-amber-800">{m.id}</Td>
                        <Td><p className="font-bold text-slate-800">{m.parcel}</p><p className="font-mono text-[11px] text-slate-400">Assignment: {m.asn}</p></Td>
                        <Td className="text-slate-600">{m.cls}</Td>
                        <Td><span className={`rounded px-2 py-0.5 text-[11px] font-bold ${m.sev === "High" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{m.sev}</span></Td>
                        <Td className="font-mono text-slate-500">{m.date}</Td>
                        <Td><StatusPill s={m.status} /></Td>
                        <Td className="text-right"><button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Eye size={12} /> Inspect</button></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {mismatches.map((m) => (
                <div key={m.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-mono text-[11px] font-bold text-amber-800">{m.id}</p>
                  <p className="mt-1 text-sm font-bold">{m.parcel} · {m.cls}</p>
                  <p className="text-[11px] text-slate-500">{m.date} · {m.status}</p>
                  <button className="mt-2.5 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold">Inspect</button>
                </div>
              ))}
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= SYNC ================= */}
      {view === "sync" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Field Synchronization Center</h1>
              <p className="mt-1 text-sm text-slate-500">Offline storage buffer and bidirectional synchronization queue for field evidence and reports.</p>
            </div>
            <button disabled className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-400"><RefreshCw size={14} /> Sync Now (0 Pending)</button>
          </div>

          <PortalCard>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><WifiOff size={18} /></span>
                <span><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Connection State</span><span className="block text-sm font-black text-slate-900">OFFLINE (Field Simulated)</span></span>
              </p>
              <button onClick={() => setOnline((v) => !v)} className="w-fit rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">{online ? "Switch to Offline Mode" : "Switch to Online Mode"}</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 lg:grid-cols-4">
              {[["Pending Uploads", "0", "text-amber-700"], ["Successfully Synced", "2", "text-emerald-800"], ["Retry Required", "0", "text-red-800"], ["Local Device Cache", "14.8 MB", "text-slate-900"]].map(([l, v, c]) => (
                <div key={l as string}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l as string}</p><p className={`mt-0.5 text-lg font-black ${c as string}`}>{v as string}</p></div>
              ))}
            </div>
          </PortalCard>

          <div className="mb-2 mt-6 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Synchronization Queue (2)</h2>
            <p className="text-[11px] text-slate-400">Local data is preserved even if network fails</p>
          </div>
          <div className="space-y-3">
            {[
              ["Khasra 118/2", "ASN-2026-0487", "4 photos attached", "Payload: 1420 KB", "25/09/2026, 23:15:00"],
              ["Khasra 98", "ASN-2026-0460", "3 photos attached", "Payload: 980 KB", "21/09/2026, 17:00:00"],
            ].map(([k, a, p, s, d]) => (
              <PortalCard key={a as string} className="!p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">{k as string} <span className="font-mono text-[11px] font-medium text-slate-400">· Assignment {a as string}</span> <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">SYNCED</span></p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">{p as string} <span className="mx-1">·</span> {s as string} <span className="mx-1">·</span> {d as string}</p>
                  </div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800"><CircleCheck size={15} /> Transmitted</p>
                </div>
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
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Field Notifications</h1>
              <p className="mt-1 text-sm text-slate-500">Alerts, assignments, and clarification directives from the Circle Revenue Office.</p>
            </div>
            <button className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50">Mark All as Read</button>
          </div>
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {notifications.map((n) => (
              <PortalCard key={n.title} className={`!p-4 ${n.unread ? "!border-emerald-200 !bg-emerald-50/40" : ""}`}>
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-emerald-800">
                    {n.icon === "assign" ? <ClipboardList size={17} /> : n.icon === "clarify" ? <CircleAlert size={17} className="text-red-600" /> : n.icon === "sync" ? <RefreshCw size={17} className="text-amber-600" /> : <Bell size={17} className="text-blue-600" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start justify-between gap-2 text-sm font-bold text-slate-900">{n.title} <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-medium text-slate-400">{n.time} {n.unread && <span className="h-2 w-2 rounded-full bg-emerald-700" />}</span></p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                    <button onClick={nav("assignments")} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-900">Open Assignment <ArrowRight size={13} /></button>
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= PROFILE ================= */}
      {view === "profile" && (
        <>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Field Officer Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Authorized credentials, field jurisdiction, and device offline storage management.</p>

          <PortalCard className="mx-auto mt-5 w-full max-w-3xl">
            <div className="flex items-start gap-3.5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-base font-black text-white">RK</span>
              <div>
                <p className="flex flex-wrap items-center gap-2 text-base font-black text-slate-900">{OFFICER.name} <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-900">{OFFICER.badge}</span></p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">{OFFICER.designation}</p>
                <p className="text-[11px] text-slate-400">{OFFICER.dept}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><MapPin size={12} /> Assigned Jurisdiction</p>
                <p className="mt-1 font-bold text-slate-800">Varanasi · Pindra</p>
                <p className="mt-0.5 leading-relaxed text-slate-500">Mauza Ramnagar & Kashi Ring Road Sector 4 (Parcels 101 to 240)</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><Bell size={12} /> Contact & Official Communications</p>
                <p className="mt-1 font-bold text-slate-800">{OFFICER.phone}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{OFFICER.email}</p>
              </div>
            </div>
          </PortalCard>

          <PortalCard className="mx-auto mt-4 w-full max-w-3xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Smartphone size={16} className="text-emerald-800" /> Field Tablet & Offline Storage Diagnostics</h2>
              <span className="w-fit rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">ZameenAI Field 2.6.4-offline-ready</span>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3.5 lg:grid-cols-4">
              {[["Device Model", "Rugged Tab FO-80 (Andr…)"], ["Cached Parcels", "16 Parcels"], ["Local Storage Used", "14.8 MB"], ["Pending Sync Queue", "0 Items"]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
                  <p className={`mt-0.5 font-black ${l === "Pending Sync Queue" ? "text-amber-800" : "text-slate-900"}`}>{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
              <button onClick={() => setOnline(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"><Wifi size={14} className="text-emerald-700" /> Switch Online</button>
              <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><Trash2 size={14} /> Clear Local Drafts Cache</button>
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= VERIFY WIZARD ================= */}
      {view === "verify" && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={nav("assignments")} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"><ArrowLeft size={14} /> Assignments</button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"><Save size={13} /> Save Draft</button>
          </div>

          <PortalCard>
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-800">{selected.project}</p>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-black text-slate-900">Ground Verification: Khasra {selected.khasra}</h1>
              <p className="text-xs text-slate-500">Due: <span className="font-mono font-bold text-slate-800">{selected.due}</span> <span className="mx-1">·</span> <span className="font-bold text-amber-700">{selected.priority} Priority</span></p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs lg:grid-cols-4">
              {[["Village / District", `${selected.village.replace("Mauza ", "")}, ${selected.district}`], ["Recorded Owner", selected.owner], ["Official Area", selected.areaBigha], ["Khata Number", selected.khata]].map(([l, v]) => (
                <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold leading-snug text-slate-800">{v}</p></div>
              ))}
            </div>
          </PortalCard>

          <PortalCard className="mt-4 !p-4">
            <p className="flex items-center justify-between text-xs font-bold text-slate-800">Step {wStep} of 9: {wizardSteps[wStep - 1]} <span className="font-mono text-[11px] font-medium text-slate-400">{pct}% Complete</span></p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-800 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
              {wizardSteps.map((s, i) => (
                <button key={s} onClick={() => setWStep(i + 1)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${i + 1 === wStep ? "bg-emerald-900 text-white" : i + 1 < wStep ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-400"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${i + 1 < wStep ? "border-emerald-700" : "border-current"}`}>{i + 1 < wStep ? "✓" : i + 1}</span> {s}
                </button>
              ))}
            </div>
          </PortalCard>

          {!submitted ? (
            <PortalCard className="mt-4">
              {wStep === 1 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 1: Parcel Identity Verification</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Verify that the physical field on ground matches the assigned cadastral entry.</p>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Lock size={13} /> Authoritative Land Record Reference (Read-Only)</span><span className="font-mono text-[10px] font-medium text-slate-400">ROR Ref: ROR-UP-VNS-PIN-9021</span></p>
                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-xs sm:grid-cols-3">
                      {[["Khasra / Survey No", selected.khasra], ["Khata Number", selected.khata], ["Village / Tehsil", `${selected.village.replace("Mauza ", "")}, Pindra`], ["Recorded Area", `${selected.areaBigha} (${selected.areaHa.replace("Hectare", "Ha")})`], ["Land Classification", "Fasli 1432 - Irrigated Agricultural"], ["Project Reference", "NHAI/VRR-P2/SEC4/143"]].map(([l, v]) => (
                        <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p></div>
                      ))}
                    </div>
                  </div>
                  <FieldLabel><span className="mt-4 block text-sm">Does the physical parcel correspond to the assigned parcel?</span></FieldLabel>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <RadioCard selected={parcelVerdict === "Verified"} onClick={() => setParcelVerdict("Verified")} title="Verified" desc="Ground location matches cadastral survey sheet" />
                    <RadioCard selected={parcelVerdict === "Mismatch"} onClick={() => setParcelVerdict("Mismatch")} title="Mismatch" desc="Discrepancy in location or numbering" />
                    <RadioCard selected={parcelVerdict === "Unable to Verify"} onClick={() => setParcelVerdict("Unable to Verify")} title="Unable to Verify" desc="Physical access obstructed / markers missing" />
                  </div>
                  <div className="mt-4"><FieldLabel>Field Officer Remarks</FieldLabel>
                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Record any observation regarding survey stones, boundary stones, or village sajra alignment…" rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  </div>
                </>
              )}

              {wStep === 2 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 2: Ownership Verification</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Check physical possession on ground against digitized revenue register.</p>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Lock size={13} /> Digitized Ownership Information (Read-Only)</span><span className="font-mono text-[10px] font-medium text-slate-400">Mutation Ref: MUT/2012/33102/REV</span></p>
                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-xs sm:grid-cols-2">
                      {[["Recorded Khatedar / Owner", selected.owner], ["Parent / Spouse Name", "Late Chhote Lal Yadav"], ["Ownership Type", "Joint"], ["Mutation Date", "2012-04-18"]].map(([l, v]) => (
                        <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p></div>
                      ))}
                    </div>
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] italic leading-relaxed text-slate-600">Note: The Field Officer cannot directly overwrite authoritative ownership records. Any discrepancies found on ground will be logged as an official Discrepancy Report.</p>
                  </div>
                  <FieldLabel><span className="mt-4 block text-sm">Ground Possession Status</span></FieldLabel>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <RadioCard selected={possession === "Confirmed"} onClick={() => setPossession("Confirmed")} title="Confirmed" desc="Recorded owner is in peaceful possession" />
                    <RadioCard selected={possession === "Mismatch"} onClick={() => setPossession("Mismatch")} title="Mismatch" desc="Third-party occupant or disputed succession" />
                    <RadioCard selected={possession === "Unable to Verify"} onClick={() => setPossession("Unable to Verify")} title="Unable to Verify" desc="Occupant absent during field visit" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><FieldLabel>Person in Physical Possession on Ground</FieldLabel><TextInput value={selected.owner} placeholder="Occupant name" /></div>
                    <div><FieldLabel>Relationship to Recorded Owner</FieldLabel><TextInput value="Self (Recorded Owner)" placeholder="Relationship" /></div>
                  </div>
                  <label className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                    <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-emerald-800" /> Unrecorded tenancy, civil court litigation, or family partition dispute observed
                  </label>
                  <div className="mt-4"><FieldLabel>Ownership Verification Notes</FieldLabel>
                    <textarea placeholder="State occupant statements, witness names, or ground possession context…" rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  </div>
                </>
              )}

              {wStep === 3 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 3: Land Details Verification</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Verify physical land use, visible assets, cultivation, and ground condition.</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><FieldLabel>Verified Ground Land Use</FieldLabel><FilterSelect label="Agricultural (Farming/Crops)" /></div>
                    <div><FieldLabel>Cultivation & Farming Status</FieldLabel><FilterSelect label="Active Cultivation (Standing Crop)" /></div>
                  </div>
                  <div className="mt-3"><FieldLabel>Active Crop or Vegetation Type (if applicable)</FieldLabel><TextInput value="Paddy / Seasonal Grain" /></div>
                  <FieldLabel><span className="mt-4 block">Visible Structures & Physical Assets on Ground</span></FieldLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {assetOptions.map((a) => (
                      <label key={a} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700">
                        <input type="checkbox" checked={assets.includes(a)} onChange={() => setAssets((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))} className="h-3.5 w-3.5 accent-emerald-800" /> {a}
                      </label>
                    ))}
                  </div>
                  <FieldLabel><span className="mt-4 block">Ground Area Alignment (Recorded: {selected.areaBigha})</span></FieldLabel>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {["Matches Record", "Appears Significantly Larger", "Appears Significantly Smaller", "Indeterminate"].map((o) => (
                      <button key={o} onClick={() => setAreaVerdict(o)} className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold ${areaVerdict === o ? "border-emerald-800 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-500"}`}>{o}</button>
                    ))}
                  </div>
                  <div className="mt-4"><FieldLabel>Land Condition Observations</FieldLabel>
                    <textarea placeholder="Describe soil elevation, irrigation channel availability, or structural details…" rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                  </div>
                </>
              )}

              {wStep === 4 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 4: Boundary Verification</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Inspect physical boundaries on North, South, East, and West cardinal directions.</p>
                  <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-900 p-4" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
                    <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-white"><span className="rounded bg-white/10 px-2 py-1">CADASTRAL SHEET: RAMNAGAR · Khasra {selected.khasra} | {selected.areaBigha}</span><span className="inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-500/15 px-2 py-1 text-amber-300"><Lock size={11} /> Official Boundary Locked (Read-Only)</span></p>
                    <svg viewBox="0 0 560 220" className="mx-auto mt-1 w-full max-w-[560px]">
                      <rect x={110} y={20} width={340} height={180} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="7 5" opacity={0.85} />
                      <g transform="rotate(-5 280 120)" fontSize={10} textAnchor="middle" fontWeight={700}>
                        <rect x={130} y={70} width={100} height={90} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                        <text x={180} y={118} fill="#cbd5e1">140/2</text>
                        <rect x={230} y={40} width={120} height={50} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                        <text x={290} y={68} fill="#cbd5e1">141</text>
                        <rect x={230} y={90} width={130} height={90} fill="rgba(52,211,153,.22)" stroke="#34d399" strokeWidth={2} />
                        <text x={295} y={132} fill="#fff" fontSize={12}>Khasra {selected.khasra}</text>
                        <text x={295} y={146} fill="#a7f3d0" fontSize={9}>{selected.areaBigha}</text>
                        <circle cx={295} cy={140} r={12} fill="rgba(96,165,250,.25)" stroke="#60a5fa" strokeDasharray="3 3" />
                        <circle cx={295} cy={140} r={4.5} fill="#60a5fa" stroke="#fff" strokeWidth={2} />
                        <rect x={360} y={80} width={100} height={100} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                        <text x={410} y={128} fill="#cbd5e1">PWD Road</text>
                        <rect x={230} y={180} width={130} height={32} fill="rgba(148,163,184,.2)" stroke="#64748b" />
                        <text x={295} y={200} fill="#cbd5e1">Khasra 143</text>
                        {[[230, 90], [360, 90], [230, 180], [360, 180]].map(([x, y]) => (<circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#fff" />))}
                      </g>
                    </svg>
                    <p className="font-mono text-[11px] text-emerald-300">⊕ Parcel Center: 25.26590°N, 83.02520°E <span className="ml-2 text-sky-300">Acc: ±2.1m</span></p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[["North Boundary", "Mahendra Pratap Singh"], ["South Boundary", "Hari Shankar Mishra"], ["East Boundary", "Existing 2-Lane Highway"], ["West Boundary", "Kewat Community Path"]].map(([side, adj]) => (
                      <div key={side} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <p className="text-xs font-bold text-slate-800">◉ {side} <span className="font-medium text-slate-400">({adj})</span></p>
                        <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                          {["Matches record", "Does not match", "Partially matches", "Unable to verify"].map((o) => (
                            <button key={o} onClick={() => setBoundaries((b) => ({ ...b, [side]: o }))} className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${boundaries[side] === o ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-200 bg-white text-slate-500"}`}>{o}</button>
                          ))}
                        </div>
                        <input placeholder={`Notes on ${side.toLowerCase()} marks, bunds, encroachment, or dispute…`} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none placeholder:text-slate-400" />
                      </div>
                    ))}
                  </div>
                  <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium text-slate-700">
                    <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-amber-600" /> Physical boundary encroachment into government land, chakmarg, or adjoining parcel observed
                  </label>
                </>
              )}

              {wStep === 5 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 5: GPS Ground Verification</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Acquire certified hardware GPS coordinates at the center or key boundary marker of the parcel.</p>
                  {!gps && (
                    <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] font-medium text-red-700"><CircleAlert size={14} /> Please capture GPS coordinates before proceeding to photo evidence.</p>
                  )}
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Navigation size={13} className="text-emerald-800" /> Active Satellite Signal Status</span><span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">{gps ? "Locked ±2.1m" : "Awaiting Capture"}</span></p>
                    <p className={`mt-2.5 rounded-lg border border-dashed px-3 py-3 text-center font-mono text-[11px] ${gps ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 text-slate-400"}`}>
                      {gps ?? "No GPS point captured yet for this session. Stand at the parcel marker and press “Capture Current Location”."}
                    </p>
                    <button onClick={() => setGps(`25.26780°N, 83.02450°E · Acc ±2.1m · ${new Date().toLocaleString("en-IN")}`)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 py-3 text-xs font-bold text-white hover:bg-emerald-800"><Navigation size={14} /> Capture Current Location</button>
                  </div>
                </>
              )}

              {wStep === 6 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 6: Photo Evidence</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Capture geo-tagged ground photos. Stored offline until sync is available.</p>
                  {!online && (
                    <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-800"><WifiOff size={14} /> Offline mode — photos are saved to the encrypted local buffer ({photos.length} staged).</p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {["North boundary pillar", "South boundary / occupant", "Standing crop / land use", "Structure / asset close-up"].map((slot) => {
                      const added = photos.includes(slot);
                      return (
                        <button key={slot} onClick={() => setPhotos((p) => (p.includes(slot) ? p.filter((x) => x !== slot) : [...p, slot]))} className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${added ? "border-emerald-700 bg-emerald-50" : "border-dashed border-slate-300 bg-white"}`}>
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${added ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-400"}`}>{added ? <CircleCheck size={18} /> : <Camera size={18} />}</span>
                          <span><span className="block text-xs font-bold text-slate-800">{slot}</span><span className="block font-mono text-[10px] text-slate-400">{added ? "Geo-tagged · queued for sync" : "Tap to capture (simulated)"}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {wStep === 7 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 7: Asset Verification</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Confirm the structures and physical assets observed on ground.</p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {assetOptions.map((a) => (
                      <label key={a} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${assets.includes(a) ? "border-emerald-700 bg-emerald-50 font-bold text-emerald-900" : "border-slate-200 text-slate-700"}`}>
                        <input type="checkbox" checked={assets.includes(a)} onChange={() => setAssets((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))} className="h-3.5 w-3.5 accent-emerald-800" /> {a}
                      </label>
                    ))}
                  </div>
                  {assets.length === 0 && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">No structures selected — parcel recorded as vacant agricultural land.</p>}
                </>
              )}

              {wStep === 8 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 8: Witness Statements</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Record two independent village witnesses present during ground verification.</p>
                  <div className="mt-4 space-y-3">
                    {[1, 2].map((n) => (
                      <div key={n} className="rounded-xl border border-slate-200 p-3.5">
                        <p className="text-xs font-bold text-slate-800">Witness {n}</p>
                        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <div><FieldLabel>Full Name</FieldLabel><TextInput value="" placeholder="e.g. Hari Shankar Mishra" /></div>
                          <div><FieldLabel>Phone / Village</FieldLabel><TextInput value="" placeholder="e.g. Ramnagar" /></div>
                        </div>
                        <div className="mt-2.5"><FieldLabel>Statement</FieldLabel>
                          <textarea placeholder="Occupant / boundary confirmation statement…" rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {wStep === 9 && (
                <>
                  <h2 className="text-base font-black text-slate-900">Step 9: Review & Submit</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Confirm the ground report before transmitting to the revenue database. Submitted records are immutable.</p>
                  <div className="mt-4 space-y-2 text-xs">
                    {[
                      ["Parcel Identity", parcelVerdict],
                      ["Possession", possession],
                      ["Area Alignment", areaVerdict],
                      ["Boundaries", (["North", "South", "East", "West"] as const).map((s) => `${s}: ${boundaries[s]}`).join(" · ")],
                      ["GPS", gps ?? "Not captured"],
                      ["Photos", photos.length > 0 ? `${photos.length} staged (${photos.join(", ")})` : "None staged"],
                      ["Assets", assets.length > 0 ? assets.join(", ") : "Vacant agricultural land"],
                    ].map(([l, v]) => (
                      <div key={l as string} className="flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 sm:flex-row sm:gap-3">
                        <span className="w-32 shrink-0 font-bold text-slate-500">{l as string}</span>
                        <span className="font-medium text-slate-800">{v as string}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setSubmitted(true);
                      setAssignments((list) => list.map((a) => (a.id === selected.id ? { ...a, status: "Submitted" } : a)));
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 py-3 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    <ShieldCheck size={15} /> Submit Ground Report {online ? "(Online)" : "(Save Offline)"}
                  </button>
                </>
              )}
            </PortalCard>
          ) : (
            <PortalCard className="mt-4 border-emerald-200 bg-emerald-50/50 text-center">
              <CircleCheck size={36} className="mx-auto text-emerald-700" />
              <h2 className="mt-2 text-lg font-black text-slate-900">Ground Report Submitted</h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600">Khasra {selected.khasra} ({selected.id}) saved {online ? "and transmitted" : "to the offline buffer — it will sync automatically"} . Reference: VER-2026-UP-{selectedId.slice(-4)}.</p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button onClick={nav("completed")} className="rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white">View Completed Records</button>
                <button onClick={nav("assignments")} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700">Back to Assignments</button>
              </div>
            </PortalCard>
          )}

          {!submitted && (
            <div className="mt-4 flex items-center justify-between">
              <button disabled={wStep === 1} onClick={() => setWStep((s) => Math.max(1, s - 1))} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40"><ArrowLeft size={13} /> Previous Step</button>
              {wStep < 9 && (
                <button onClick={() => setWStep((s) => Math.min(9, s + 1))} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white">Proceed to Step {wStep + 1} <ArrowRight size={13} /></button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer authority note */}
      <div className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-relaxed text-slate-500 sm:max-w-none">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jurisdiction</p>
        <p className="mt-0.5 font-bold text-slate-700">Varanasi · Pindra</p>
        <p>Mauza Ramnagar & Kashi Ring Road Sector 4 · Read-only cadastral view · Discrepancies are adjudicated by the LAO.</p>
      </div>
    </PortalLayout>
  );
}

export default FieldOfficerPortal;
