import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { COMPENSATION_KPIS, compCorridors, compMonths, compStates } from "../features/executive/executiveData";
import { TableShell, Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/compensation")({
  component: ExecutiveCompensation,
});

function ExecutiveCompensation() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 13 – Macro Financial MIS · Treasury &amp; Award Reconciliation</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Statutory Compensation Assessment &amp; Disbursement Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Aggregated monetary payouts sanctioned under Section 23/30 of RFCTLARR Act 2013 across notified project corridors.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><ShieldCheck size={13} /> Aggregated · Privacy Compliant</span>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COMPENSATION_KPIS.map(([l, v, s]) => (
          <PortalCard key={l} className="!p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
            <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{v}</p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s} · 26 Sep 2026</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5">
        <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Monthly Assessed vs Disbursed Disbursement Pipeline</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {compMonths.map(([m, v]) => (
            <div key={m} className="rounded-lg border border-slate-200 bg-slate-900 p-2.5 text-white">
              <p className="font-mono text-[10px] text-slate-400">{m}</p>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-400">{v}</p>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full w-4/5 rounded-full bg-emerald-400" /></span>
            </div>
          ))}
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard className="!p-0">
          <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">State Compensation Disbursal Performance</h2>
          <TableShell minWidth="min-w-[560px]">
            <thead><tr><Th>State</Th><Th className="text-right">Assessed</Th><Th className="text-right">Paid</Th><Th className="text-right">Pending</Th><Th className="text-right">Disbursed %</Th></tr></thead>
            <tbody>
              {compStates.map(([s, a, p, pe, pct]) => (
                <tr key={s} className="hover:bg-amber-50/40">
                  <Td className="font-bold text-slate-800">{s}</Td>
                  <Td className="text-right font-mono">{a}</Td>
                  <Td className="text-right font-mono font-bold text-emerald-700">{p}</Td>
                  <Td className="text-right font-mono text-amber-700">{pe}</Td>
                  <Td className="text-right font-mono font-bold">{pct}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </PortalCard>
        <PortalCard className="!p-0">
          <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">Project Corridor Compensation Breakdown</h2>
          <TableShell minWidth="min-w-[560px]">
            <thead><tr><Th>Corridor</Th><Th className="text-right">Assessed</Th><Th className="text-right">Paid</Th><Th className="text-right">Progress %</Th></tr></thead>
            <tbody>
              {compCorridors.map(([c, a, p, pct]) => (
                <tr key={c} className="hover:bg-amber-50/40">
                  <Td className="max-w-[240px] truncate font-medium text-slate-700">{c}</Td>
                  <Td className="text-right font-mono">{a}</Td>
                  <Td className="text-right font-mono font-bold text-emerald-700">{p}</Td>
                  <Td className="text-right font-mono font-bold">{pct}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </PortalCard>
      </div>
    </>
  );
}
