import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { dashKpis, DASHBOARD_BOTTLENECK_SUMMARY, DASHBOARD_PREDICTIVE_SUMMARY, programStages } from "../features/executive/executiveData";
import { useExecutive } from "../features/executive/ExecutiveStore";
import { CorridorTable } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/dashboard")({
  component: ExecutiveDashboard,
});

function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { filteredCorridors } = useExecutive();

  return (
    <>
      <GreetingHeader
        eyebrow="Executive Monitoring Window • FY 2026–27"
        title="National Infrastructure Land Acquisition Dossier"
        subtitle="Aggregated statutory progress under RFCTLARR Act 2013 across notified corridors."
        actions={
          <>
            <button onClick={() => navigate({ to: "/executive/gis" })} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">Launch GIS Map</button>
            <button onClick={() => navigate({ to: "/executive/bottlenecks" })} className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-800">Review Bottlenecks (7)</button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {dashKpis.map((k) => (
          <PortalCard key={k.label} className="!p-3.5">
            <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label} <span className="rounded bg-amber-100 px-1 py-px font-mono text-[8px] text-amber-800">DEMO DATA</span></p>
            <p className="mt-1 font-mono text-xl font-black text-[#0B1F44]">{k.value}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{k.sub} · 26 Sep 2026</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Statutory Program Progress &amp; Pipeline Adherence</h2>
          <p className="font-mono text-[10px] text-slate-500">Total: 10 · <span className="text-emerald-700">On Track: 6</span> · <span className="text-amber-700">At Risk: 1</span> · <span className="text-red-600">Delayed: 2</span> · Blocked: 1</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          {programStages.map((s) => (
            <div key={s.code} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
              <p className="flex items-center justify-between font-mono text-[10px] text-slate-400">{s.code} <span className="font-bold text-slate-600">{s.pct}%</span></p>
              <p className="mt-0.5 text-[11px] font-bold leading-tight text-slate-700">{s.label}</p>
              <p className="mt-1 font-mono text-[11px] font-bold text-slate-800">{s.value}</p>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${s.pct}%` }} /></span>
            </div>
          ))}
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-red-900">Critical Bottleneck Backlog (Section 18)</h2>
            <button onClick={() => navigate({ to: "/executive/bottlenecks" })} className="text-[11px] font-bold text-amber-700">View All (7) →</button>
          </div>
          <div className="space-y-2.5 text-xs">
            {DASHBOARD_BOTTLENECK_SUMMARY.map(([t, d, s]) => (
              <div key={t} className="rounded-lg border border-slate-200 p-3">
                <p className="flex items-center justify-between font-bold text-slate-800">{t} <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${s === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{s}</span></p>
                <p className="mt-1 leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </PortalCard>
        <PortalCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Predictive Delay Indicators (Section 21)</h2>
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">PREDICTIVE INDICATORS</span>
          </div>
          <div className="space-y-2.5 text-xs">
            {DASHBOARD_PREDICTIVE_SUMMARY.map(([t, m, r]) => (
              <div key={t} className="rounded-lg border border-slate-200 p-3">
                <p className="font-bold text-slate-800">{t}</p>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-red-600">{m}</p>
                <p className="mt-1 leading-relaxed text-slate-500">“{r}”</p>
              </div>
            ))}
          </div>
        </PortalCard>
      </div>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#0B1F44]">Corridor Projects Overview ({filteredCorridors.length})</h2>
        <button onClick={() => navigate({ to: "/executive/corridors" })} className="text-xs font-bold text-amber-700">Explore All Projects →</button>
      </div>
      <CorridorTable rows={filteredCorridors.slice(0, 7)} />
    </>
  );
}
