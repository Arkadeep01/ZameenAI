import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { RR_COLONY_STATS, RR_KPIS, rrRows } from "../features/executive/executiveData";
import { Bar, HealthPill, TableShell, Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/rr")({
  component: ExecutiveRr,
});

function ExecutiveRr() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 14 &amp; 15 – Human Impact &amp; Rehabilitation MIS</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Resettlement &amp; Rehabilitation (R&amp;R) Progress Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Aggregated monitoring of displaced families, resettlement colony construction, and livelihood grant disbursement.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600"><Lock size={13} className="text-emerald-700" /> No Citizen PII Exposed</span>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {RR_KPIS.map(([l, v, s]) => (
          <PortalCard key={l} className="!p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
            <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{v}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s} · 26 Sep 2026</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Resettlement Colony Infrastructure &amp; Allotment Audit</h2>
          <p className="font-mono text-[10px] text-slate-500"><span className="text-emerald-700">19 Completed Colonies</span> · <span className="text-amber-700">5 In Construction</span></p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {RR_COLONY_STATS.map(([l, v, s]) => (
            <div key={l} className="rounded-lg bg-slate-900 p-3 text-white">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
              <p className="mt-0.5 font-mono text-lg font-black text-emerald-400">{v}</p>
              <p className="text-[10px] text-slate-400">{s}</p>
            </div>
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-5 !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">Corridor-wise R&amp;R Package Settlement Progress</h2>
        <TableShell minWidth="min-w-[760px]">
          <thead><tr><Th>Project Corridor</Th><Th>Status</Th><Th className="text-right">Sanctioned Packages</Th><Th className="text-right">Disbursed Packages</Th><Th>Progress %</Th><Th className="text-right">Inspect</Th></tr></thead>
          <tbody>
            {rrRows.map(([p, s, sa, di, pct]) => (
              <tr key={p} className="hover:bg-amber-50/40">
                <Td className="font-medium text-slate-700">{p}</Td>
                <Td><HealthPill s={s} /></Td>
                <Td className="text-right font-mono">{sa}</Td>
                <Td className="text-right font-mono font-bold text-emerald-700">{di}</Td>
                <Td><span className="font-mono text-[11px] font-bold">{pct}</span><Bar pct={parseFloat(pct)} /></Td>
                <Td className="text-right"><button className="text-[11px] font-bold text-amber-700">Inspect →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
