import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart, Printer } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { reportBars, reportProjects } from "../features/pia/piaData";
import { TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/reports")({
  component: PiaReports,
});

function PiaReports() {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><FileBarChart size={24} className="text-emerald-600" /> Land Acquisition Progress &amp; Statutory Schedules</h1>
          <p className="mt-1 text-sm text-slate-500">Auditable progress report for Ministry of Road Transport &amp; Highways (MoRTH) &amp; NITI Aayog</p>
        </div>
        <p className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Printer size={14} /> Print Report</button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Download size={14} /> Export Statutory Schedule (XLSX)</button>
        </p>
      </div>

      <PortalCard>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-sm font-bold text-[#0B1F44]">National Requisition Pipeline Progression</h2><p className="text-[11px] text-slate-500">Cumulative progress across 6 national infrastructure projects</p></div>
          <p className="font-mono text-xs text-slate-500">Reporting Date: 27/09/2026</p>
        </div>
        <div className="mt-4 space-y-4">
          {reportBars.map((b) => (
            <div key={b.label}>
              <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-600">{b.label}</span>
                <span className="font-mono font-bold text-slate-800">{b.v}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-5 !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-[#0B1F44]">Project-Wise Acquisition Summary</h2>
        <TableShell minWidth="min-w-[900px]">
          <thead><tr><Th>Project ID</Th><Th>Project Name</Th><Th>Districts</Th><Th className="text-right">Required (Ac)</Th><Th className="text-right">Acquired (Ac)</Th><Th className="text-right">Vesting Progress</Th><Th className="text-right">LA Budget (Cr)</Th></tr></thead>
          <tbody>
            {reportProjects.map((p) => (
              <tr key={p.id} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{p.id}</Td>
                <Td className="max-w-[280px] font-medium text-slate-700">{p.name}</Td>
                <Td className="max-w-[180px] truncate text-slate-500">{p.dist}</Td>
                <Td className="text-right font-mono">{p.req}</Td>
                <Td className="text-right font-mono font-bold text-emerald-700">{p.acq}</Td>
                <Td className="text-right font-mono font-bold">{p.vest}</Td>
                <Td className="text-right font-mono">{p.budget}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
