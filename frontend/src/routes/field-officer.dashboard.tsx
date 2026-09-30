import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Calendar,
  CircleCheck,
  ClipboardList,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";
import { PriPill, StatusPill } from "../features/fieldOfficer/fieldOfficerUi";

export const Route = createFileRoute("/field-officer/dashboard")({
  component: FieldOfficerDashboard,
});

function FieldOfficerDashboard() {
  const navigate = useNavigate();
  const { assignments, openVerify } = useFieldOfficer();

  const go = (to: string) => () => navigate({ to });
  const startVerify = (id: string) => () => {
    openVerify(id);
    navigate({ to: "/field-officer/verify" });
  };

  const overview = [
    { label: "Assigned", value: "5", tone: "text-slate-600", icon: ClipboardList },
    { label: "Pending", value: "3", tone: "text-amber-700", icon: Bell },
    { label: "In Progress", value: "1", tone: "text-blue-700", icon: RefreshCw },
    { label: "Completed", value: "2", tone: "text-emerald-800", icon: CircleCheck },
    { label: "Mismatches", value: "2", tone: "text-red-800", icon: TriangleAlert },
    { label: "Offline", value: "0", tone: "text-slate-500", icon: WifiOff },
    { label: "Pending Sync", value: "0", tone: "text-amber-700", icon: RefreshCw },
  ];

  return (
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
            <button onClick={go("/field-officer/map")} className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10"><MapPin size={14} className="text-emerald-300" /> Open Cadastral Map</button>
            <button onClick={go("/field-officer/assignments")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-600"><ClipboardList size={14} /> View All Assignments</button>
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
        <button onClick={go("/field-officer/assignments")} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900">All Assignments <ArrowRight size={13} /></button>
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
              <button onClick={startVerify(a.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">Start Verification <ArrowRight size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
