import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useExecutive } from "../features/executive/ExecutiveStore";
import { Bar, HealthPill, TableShell, Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/states")({
  component: ExecutiveStates,
});

function ExecutiveStates() {
  const navigate = useNavigate();
  const { query, setQuery, stateScope, setStateScope, allStatesRows, visibleStates, drillIntoDistrict } = useExecutive();

  const monitoredCount = allStatesRows.filter((r) => r.monitored).length;
  const totalCount = stateScope === "monitored" ? monitoredCount : allStatesRows.length;

  const drillDown = (row: { monitored: boolean; s: string }) => () => {
    drillIntoDistrict(row.monitored ? row.s : "All States");
    navigate({ to: "/executive/districts" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <GreetingHeader
        eyebrow="State Governance Matrix • Section 9 Cross-State Audit"
        title="State Land Acquisition Performance Benchmark"
        subtitle="Click on any state row to drill down into district-level Land Acquisition Officer (LAO) progress."
      />
      <PortalCard className="!p-0">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5 text-xs font-bold">
            <button onClick={() => setStateScope("monitored")} className={`rounded-lg px-3 py-1.5 ${stateScope === "monitored" ? "bg-[#0B2A5B] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              Monitored Corridors ({monitoredCount})
            </button>
            <button onClick={() => setStateScope("all")} className={`rounded-lg px-3 py-1.5 ${stateScope === "all" ? "bg-[#0B2A5B] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              All States &amp; UTs ({allStatesRows.length})
            </button>
          </div>
          <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 sm:w-64">
            <Search size={14} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search State / UT…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
          </label>
        </div>
        <p className="border-b border-slate-100 px-4 py-2 font-mono text-[11px] text-slate-500">
          Showing {visibleStates.length} of {totalCount} {stateScope === "monitored" ? "monitored states" : "States & UTs"}
        </p>
        <TableShell minWidth="min-w-[1100px]">
          <thead>
            <tr>
              <Th>State / UT</Th><Th className="text-center">Projects</Th><Th className="text-right">Land Req (Ha)</Th>
              <Th className="text-right">Notified (Ha)</Th><Th className="text-right">Acquired (Ha)</Th><Th>Acquisition %</Th>
              <Th className="text-right">Assessed (₹ Cr)</Th><Th className="text-right">Paid (₹ Cr)</Th><Th className="text-right">Affected Fam.</Th>
              <Th className="text-right">R&amp;R %</Th><Th className="text-center">Delayed</Th><Th className="text-right">Drill-down</Th>
            </tr>
          </thead>
          <tbody>
            {visibleStates.map((r) => (
              <tr key={r.s} className={`hover:bg-amber-50/40 ${r.monitored ? "" : "opacity-75"}`}>
                <Td>
                  <p className="font-bold text-slate-800">{r.s} <span className="ml-1 rounded bg-slate-100 px-1 py-px font-mono text-[9px] font-bold text-slate-500">{r.code} · {r.type}</span></p>
                  {r.monitored ? <HealthPill s={r.st} /> : <span className="inline-flex items-center whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">— No Active Corridor</span>}
                </Td>
                <Td className="text-center font-mono">{r.proj}</Td>
                <Td className="text-right font-mono">{r.req}</Td>
                <Td className="text-right font-mono">{r.not}</Td>
                <Td className="text-right font-mono font-bold text-emerald-700">{r.acq}</Td>
                <Td>
                  {r.monitored ? (
                    <><span className="font-mono text-[11px] font-bold">{r.pct}%</span><Bar pct={r.pct} color={r.pct > 90 ? "bg-emerald-500" : r.pct > 60 ? "bg-amber-500" : "bg-red-500"} /></>
                  ) : (
                    <span className="font-mono text-slate-300">—</span>
                  )}
                </Td>
                <Td className="text-right font-mono">{r.ass}</Td>
                <Td className="text-right font-mono font-bold text-emerald-700">{r.paid}</Td>
                <Td className="text-right font-mono">{r.fam}</Td>
                <Td className="text-right font-mono font-bold text-amber-700">{r.rr}</Td>
                <Td className="text-center">{r.del > 0 ? <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-red-700">{r.del}</span> : <span className="font-mono text-slate-400">0</span>}</Td>
                <Td className="text-right"><button onClick={drillDown(r)} className="text-[11px] font-bold text-amber-700">Drill-down →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
