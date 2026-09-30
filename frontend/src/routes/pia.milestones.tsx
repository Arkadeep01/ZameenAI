import { createFileRoute } from "@tanstack/react-router";
import { Flag, Search, TriangleAlert } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { milestones } from "../features/pia/piaData";
import { FilterSelect, MStatus, TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/milestones")({
  component: PiaMilestones,
});

function PiaMilestones() {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><Flag size={24} className="text-emerald-600" /> Statutory Milestone Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Tracking Section 3A/3B/3D/3G &amp; Section 11/19 land acquisition statutory deadlines</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800"><TriangleAlert size={14} /> 3 Milestones Delayed / Requiring Action</span>
      </div>

      <PortalCard className="!p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input placeholder="Search Milestone, Statutory Section, Authority, Case ID…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <FilterSelect label="All Projects" />
          <FilterSelect label="All Milestone Statuses" />
        </div>
        <p className="mt-2.5 text-xs text-slate-500">Showing {milestones.length} of {milestones.length} milestones</p>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1050px]">
          <thead><tr><Th>Case ID</Th><Th>Milestone Description</Th><Th>Statutory Section</Th><Th>Target Date</Th><Th>Status</Th><Th>Responsible Authority</Th><Th>Delay</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.caseId + m.desc} className={`hover:bg-sky-50/40 ${m.status === "DELAYED" ? "bg-amber-50/40" : ""}`}>
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{m.caseId}</Td>
                <Td><p className="max-w-[260px] font-semibold text-slate-800">{m.desc}</p><p className="max-w-[260px] truncate text-[11px] text-slate-400">{m.sub}</p></Td>
                <Td className="whitespace-nowrap font-mono text-xs text-slate-600">{m.sec}</Td>
                <Td className="whitespace-nowrap font-mono text-slate-600">{m.date}</Td>
                <Td><MStatus s={m.status} /></Td>
                <Td className="max-w-[170px] truncate text-slate-600">{m.auth}</Td>
                <Td className={`whitespace-nowrap font-mono text-xs font-bold ${m.delay.startsWith("+") ? "text-red-600" : "text-emerald-600"}`}>{m.delay}</Td>
                <Td className="text-right"><button className="text-[11px] font-semibold text-slate-500 hover:text-slate-900">Case</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
