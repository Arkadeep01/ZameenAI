import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { INDIA_DISTRICTS, INDIA_STATES } from "../utils/indiaGeo";
import { useExecutive } from "../features/executive/ExecutiveStore";
import { Bar, HealthPill, TableShell, Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/districts")({
  component: ExecutiveDistricts,
});

function ExecutiveDistricts() {
  const {
    query, setQuery,
    districtState, setDistrictState,
    districtPage, setDistrictPage,
    districtDirectory, visibleDistricts, districtPages, districtRows,
  } = useExecutive();

  const monitoredCount = districtDirectory.filter((r) => r.monitored).length;

  return (
    <>
      <GreetingHeader
        eyebrow="District Revenue Administration • Section 10 LAO Oversight"
        title="District Land Acquisition &amp; Compensation Directory"
        subtitle="Read-only performance review of district land acquisition collectorates — all-India directory with monitored KPIs merged in."
      />
      <PortalCard className="!p-0">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 sm:w-64">
            <span className="truncate">{districtState === "All States" ? `All States (${INDIA_STATES.length})` : districtState}</span>
            <select
              value={districtState}
              onChange={(e) => { setDistrictState(e.target.value); setDistrictPage(0); }}
              className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
              aria-label="Filter districts by State"
            >
              <option value="All States">All States</option>
              {INDIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>{s.name} ({(INDIA_DISTRICTS[s.name] ?? []).length})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
            <Search size={14} className="text-slate-400" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setDistrictPage(0); }} placeholder="Search District or State…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
          </label>
        </div>
        <p className="border-b border-slate-100 px-4 py-2 font-mono text-[11px] text-slate-500">
          Showing {districtRows.length} of {visibleDistricts.length} districts
          {districtState !== "All States" ? ` in ${districtState}` : " pan-India"}
          {" "}· {monitoredCount} with live corridor KPIs · Page {districtPage + 1} of {districtPages}
        </p>
        <TableShell minWidth="min-w-[1050px]">
          <thead>
            <tr>
              <Th>District</Th><Th className="text-center">Projects</Th><Th className="text-right">Area (Ha)</Th><Th>Acquisition %</Th>
              <Th className="text-right">Compensation Paid</Th><Th className="text-right">Affected Fam.</Th><Th className="text-right">R&amp;R %</Th>
              <Th className="text-right">Possession %</Th><Th>Timeline Adherence</Th><Th className="text-right">View Detail</Th>
            </tr>
          </thead>
          <tbody>
            {districtRows.map((r) => (
              <tr key={`${r.s}|${r.d}`} className={`hover:bg-amber-50/40 ${r.monitored ? "" : "opacity-80"}`}>
                <Td>
                  <p className="font-bold text-slate-800">{r.d} {r.monitored && <span className="ml-1 rounded bg-emerald-100 px-1 py-px font-mono text-[9px] font-black text-emerald-800">LIVE</span>}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{r.s}</p>
                </Td>
                <Td className="text-center font-mono">{r.p}</Td>
                {r.monitored ? (
                  <>
                    <Td className="text-right font-mono"><b className="text-emerald-700">{r.area.split(" / ")[0]}</b> <span className="text-slate-400">/ {r.area.split(" / ")[1]}</span></Td>
                    <Td><span className="font-mono text-[11px] font-bold">{r.acq}%</span><Bar pct={r.acq} color={r.acq > 90 ? "bg-emerald-500" : r.acq > 60 ? "bg-amber-500" : "bg-red-500"} /></Td>
                    <Td className="text-right font-mono text-[11px] text-slate-600">{r.comp}</Td>
                    <Td className="text-right font-mono">{r.fam}</Td>
                    <Td className="text-right font-mono font-bold text-amber-700">{r.rr}</Td>
                    <Td className="text-right font-mono">{r.poss}</Td>
                    <Td><HealthPill s={r.adh} /></Td>
                    <Td className="text-right"><button className="text-[11px] font-bold text-amber-700">Inspect →</button></Td>
                  </>
                ) : (
                  <>
                    <Td className="text-right font-mono text-slate-300">—</Td>
                    <Td><span className="font-mono text-[11px] text-slate-300">—</span></Td>
                    <Td className="text-right font-mono text-slate-300">—</Td>
                    <Td className="text-right font-mono text-slate-300">—</Td>
                    <Td className="text-right font-mono text-slate-300">—</Td>
                    <Td className="text-right font-mono text-slate-300">—</Td>
                    <Td><span className="inline-flex items-center whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">No Active Corridor</span></Td>
                    <Td className="text-right"><span className="font-mono text-[11px] text-slate-300">—</span></Td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </TableShell>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
          <p className="font-mono text-[11px] text-slate-500">Page {districtPage + 1} of {districtPages}</p>
          <div className="flex gap-2">
            <button disabled={districtPage === 0} onClick={() => setDistrictPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40">← Prev</button>
            <button disabled={districtPage + 1 >= districtPages} onClick={() => setDistrictPage((p) => Math.min(districtPages - 1, p + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40">Next →</button>
          </div>
        </div>
      </PortalCard>
    </>
  );
}
