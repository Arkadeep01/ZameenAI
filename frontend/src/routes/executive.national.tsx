import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { NATIONAL_KPIS, stateBoard } from "../features/executive/executiveData";
import { Bar, HealthPill } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/national")({
  component: ExecutiveNational,
});

function ExecutiveNational() {
  const navigate = useNavigate();

  return (
    <>
      <GreetingHeader
        eyebrow="National Aggregated Scope • PM GatiShakti NMP Integration"
        title="Pan-India Land Acquisition Governance Framework"
        subtitle="Aggregated national oversight across 7 active state jurisdictions — mega expressways, freight corridors, high-speed rail, and industrial nodes."
        actions={<button onClick={() => navigate({ to: "/executive/states" })} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">State Comparison Table</button>}
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {NATIONAL_KPIS.map(([l, v, s]) => (
          <PortalCard key={l} className="!p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
            <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{v}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s} · 26 Sep 2026</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">State Performance &amp; Acquisition Velocity Leaderboard</h2>
            <p className="text-[11px] text-slate-500">States ranked by percentage of required land physically acquired and possession certified.</p>
          </div>
          <button onClick={() => navigate({ to: "/executive/states" })} className="w-fit text-xs font-bold text-amber-700">Full State Table →</button>
        </div>
        <div className="space-y-2 p-4">
          {stateBoard.map((s) => (
            <div key={s.state} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 lg:flex-row lg:items-center">
              <p className="flex items-center gap-2 lg:w-72 lg:shrink-0">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 font-mono text-[10px] font-black text-slate-600">#{s.rank}</span>
                <span>
                  <span className="block text-[13px] font-bold text-slate-800">{s.state} <HealthPill s={s.status} /></span>
                  <span className="block text-[10px] text-slate-400">{s.meta}</span>
                </span>
              </p>
              <div className="grid flex-1 grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
                <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">Acquired Area</span><b>{s.acq}</b></span>
                <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">Compensation Paid</span><b className="text-emerald-700">{s.comp}</b></span>
                <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">R&amp;R Progress</span><b>{s.rr}</b></span>
                <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">Acquisition Rate</span><b>{s.rate}%</b><Bar pct={s.rate} color={s.rate > 90 ? "bg-emerald-500" : s.rate > 60 ? "bg-amber-500" : "bg-red-500"} /></span>
              </div>
            </div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}
