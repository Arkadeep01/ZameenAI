import { createFileRoute } from "@tanstack/react-router";
import { Lock, Search } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { CADASTRAL_LEGEND, CADASTRAL_PARCELS, PARCEL_INSPECTOR_FIELDS } from "../features/executive/executiveData";
import { FilterSelect } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/gis")({
  component: ExecutiveGis,
});

function ExecutiveGis() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 12 – GIS Decision Support • WGS-84 / UTM Zone 43N</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Cadastral Parcel GIS Visualization &amp; Corridor Alignments</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only spatial viewer overlaying notified khasra boundaries, possession certification, and court stay corridors.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800"><Lock size={13} /> GIS Consumption Only — drawing &amp; edits locked</span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <PortalCard className="!p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <FilterSelect label="All Infrastructure Corridors" />
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input placeholder="Search Khasra / Village…" className="w-full bg-transparent text-[11px] outline-none placeholder:text-slate-400" />
            </label>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-slate-900 p-3 sm:p-5" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "30px 30px" }}>
            <svg viewBox="0 0 640 240" className="mx-auto w-full max-w-[640px]">
              <path d="M60 60 Q 320 20 580 200" fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" opacity={0.9} />
              <g fontSize={9} textAnchor="middle" fontWeight={700} transform="rotate(-4 320 120)">
                {CADASTRAL_PARCELS.map(([x, y, w, h, f, t], i) => (
                  <g key={i}>
                    <rect x={x} y={y} width={w} height={h} fill={f} opacity={0.55} stroke="#0f172a" strokeWidth={1.5} />
                    <text x={x + w / 2} y={y + h / 2 + 3} fill="#0f172a">{t}</text>
                  </g>
                ))}
              </g>
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-300">
              <span className="font-bold text-white">Cadastral Legend:</span>
              {CADASTRAL_LEGEND.map(([l, c]) => (
                <span key={l} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <h2 className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#0B1F44]">Parcel Executive Inspector <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">Read-Only</span></h2>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-400">Khasra / Survey Number</p>
          <p className="font-mono text-xl font-black text-slate-900">142/1</p>
          <p className="text-[11px] text-slate-500">Village: Chhani · Vadodara Rural<br />District: Vadodara, Gujarat</p>
          <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
            {PARCEL_INSPECTOR_FIELDS.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-slate-400">{k}</dt>
                <dd className={`font-bold ${v === "Acquired" || v === "Completed" || v === "Disbursed to Beneficiary" ? "text-emerald-700" : "text-slate-800"}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-500"><b className="text-slate-700">Executive View Boundary:</b> Cadastral boundary modifications and survey vertex re-alignments are reserved for authorized Survey of India &amp; LAO personnel.</p>
        </PortalCard>
      </div>
    </>
  );
}
