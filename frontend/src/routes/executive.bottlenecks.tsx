import { createFileRoute } from "@tanstack/react-router";
import { PortalCard } from "../components/portal/PortalLayout";
import { backlogCards } from "../features/executive/executiveData";

export const Route = createFileRoute("/executive/bottlenecks")({
  component: ExecutiveBottlenecks,
});

function ExecutiveBottlenecks() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 18 – Statutory Exceptions &amp; Obstacles</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Program Exception &amp; Bottleneck Backlog Analysis</h1>
          <p className="mt-1 text-sm text-slate-500">Aggregated delay concentrations, pending Section 15 objections, PFMS treasury rejections, and court stay orders.</p>
        </div>
        <span className="w-fit rounded-lg bg-red-700 px-3 py-1.5 text-xs font-black text-white">2 Critical Bottlenecks</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {backlogCards.map((b) => (
          <PortalCard key={b.t} className={`!p-4 ${b.sev === "CRITICAL" ? "!border-l-4 !border-l-red-500" : b.sev === "HIGH" ? "!border-l-4 !border-l-amber-500" : "!border-l-4 !border-l-sky-500"}`}>
            <p className="flex items-center justify-between text-sm font-bold text-slate-800">{b.t} <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${b.sev === "CRITICAL" ? "bg-red-100 text-red-700" : b.sev === "HIGH" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{b.sev}</span></p>
            <p className="mt-0.5 text-[11px] text-slate-400">{b.imp}</p>
            <p className="mt-1.5 font-mono text-2xl font-black text-slate-900">{b.n} <span className="text-[11px] font-medium text-slate-400">{b.sub}</span></p>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-900 p-2.5 font-mono text-[10px] text-white">
              <span><span className="block text-slate-400">Blocked Area</span><b className="text-amber-400">{b.area}</b></span>
              <span><span className="block text-slate-400">Average Age</span><b className="text-red-400">{b.age}</b></span>
              <span><span className="block text-slate-400">Case Trend</span><b>{b.trend}</b></span>
              <span><span className="block text-slate-400">Aging Bracket</span><b>{b.bracket}</b></span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600"><b>Root Cause:</b> {b.cause}</p>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
