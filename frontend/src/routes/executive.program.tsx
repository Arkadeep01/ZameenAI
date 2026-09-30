import { createFileRoute } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { funnel, PROGRAM_CORRIDOR_PROGRESS, PROGRAM_TABS } from "../features/executive/executiveData";

export const Route = createFileRoute("/executive/program")({
  component: ExecutiveProgram,
});

function ExecutiveProgram() {
  return (
    <>
      <GreetingHeader
        eyebrow="Section 20 – MIS Analytics Workspace • FY 2026–27"
        title="Cross-Dimensional Program Performance & Trend Analytics"
        subtitle="Aggregated time-series, disbursement trajectories, and displacement ratios sourced from state treasury feeds."
      />
      {/* Original control strip is presentational only (first tab pinned active) */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto text-xs font-semibold">
        {PROGRAM_TABS.map((t, i) => (
          <button key={t} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 ${i === 0 ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{t}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <PortalCard>
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Corridor Acquisition Progress (%)</h2>
          <div className="mt-3 space-y-3">
            {PROGRAM_CORRIDOR_PROGRESS.map(([l, v, pct, c]) => (
              <div key={l}>
                <div className="flex justify-between gap-2 text-[11px]"><span className="truncate font-medium text-slate-600">{l}</span><span className="shrink-0 font-mono text-slate-500">{v}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c}`} style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </PortalCard>
        <PortalCard>
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Statutory Stage Funnel Conversion</h2>
          <div className="mt-3 space-y-2">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[11px]">
                <span className="font-medium text-slate-600">{f.label}</span>
                <span className="shrink-0 font-mono font-bold text-amber-700">{f.v}</span>
              </div>
            ))}
          </div>
        </PortalCard>
      </div>
    </>
  );
}
