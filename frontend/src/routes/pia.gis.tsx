import { createFileRoute } from "@tanstack/react-router";
import { CircleAlert, Map, Search, ShieldCheck } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { FilterSelect } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/gis")({
  component: PiaGis,
});

function PiaGis() {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><Map size={24} className="text-emerald-600" /> GIS Cadastral Parcel Explorer</h1>
          <p className="mt-1 text-sm text-slate-500">Interactive cadastral boundary map with DGPS corridor overlay &amp; revenue parcel status</p>
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
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Acquired &amp; Vested</span>
              <span className="flex items-center gap-1.5 font-semibold text-amber-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Contested / Objection Flagged</span>
            </div>
          </div>
        </div>
      </PortalCard>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-600">
        <p className="flex items-start gap-2"><CircleAlert size={14} className="mt-0.5 shrink-0 text-emerald-600" /><span><span className="font-bold text-slate-800">Cadastral GIS Integrity Policy:</span> Cadastral boundary coordinates and revenue polygons are imported directly from State Land Records (Bhulekh / DGPS Survey). PIAs can nominate and select parcels for acquisition requisition proposals, but cannot manipulate official boundary vectors without Tehsil Joint Measurement Survey (JMS) validation.</span></p>
      </div>
    </>
  );
}
