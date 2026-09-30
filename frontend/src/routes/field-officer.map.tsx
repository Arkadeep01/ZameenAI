import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Layers, Lock, Navigation } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";

export const Route = createFileRoute("/field-officer/map")({
  component: FieldOfficerMap,
});

function FieldOfficerMap() {
  const navigate = useNavigate();
  const { mapParcel, openVerify } = useFieldOfficer();

  const verify142 = () => {
    openVerify("ASN-2026-0491");
    navigate({ to: "/field-officer/verify" });
  };

  return (
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
            <button onClick={verify142} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Start Verification <ArrowRight size={13} /></button>
          </p>
        </div>
      </div>

      <PortalCard className="mt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-800">Varanasi Ring Road Phase-2 Extension (NHAI)</p>
            <p className="mt-0.5 text-base font-black text-slate-900">Khasra 142/1 · Mauza Ramnagar</p>
          </div>
          <button onClick={verify142} className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white">Verify Khasra 142/1 <ArrowRight size={13} /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs lg:grid-cols-4">
          {[["Recorded Khatedar", "Shri Mahendra Pratap Singh"], ["Total Area", "1.78 Bigha (0.45 Ha)"], ["Coordinates", "25.26780°N, 83.02450°E"], ["Current Status", "In Progress"]].map(([l, v]) => (
            <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p></div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}
