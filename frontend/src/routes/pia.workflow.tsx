import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { cases, workflowPhases } from "../features/pia/piaData";
import { usePia } from "../features/pia/PiaStore";
import { StagePill, TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/workflow")({
  component: PiaWorkflow,
});

function PiaWorkflow() {
  const { query, setQuery } = usePia();

  return (
    <>
      <GreetingHeader
        eyebrow="Authoritative Lifecycle • PIA → LAO → CALA → Collector"
        title="Cross-Agency Workflow Tracker"
        subtitle="Authoritative lifecycle progression across PIA, LAO, CALA, and Collectorate stages"
      />
      <PortalCard>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Authoritative Land Acquisition Stage Progression</p>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {workflowPhases.map((p) => (
            <div key={p.t} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="flex items-center justify-between text-[11px] text-slate-500">{p.n} <span className="font-mono font-bold text-emerald-700">{p.c} Cases</span></p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">{p.t}</p>
              <p className="text-[11px] text-slate-500">{p.s}</p>
            </div>
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-sm font-bold text-[#0B1F44]">Active Cases in Pipeline ({cases.length})</h2>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 lg:w-72">
            <Search size={15} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Case ID or Project…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
          </label>
        </div>
        <TableShell minWidth="min-w-[1000px]">
          <thead><tr><Th>Case ID</Th><Th>Requisition Title</Th><Th>Current Stage</Th><Th>Responsible Role</Th><Th>Assigned Authority Office</Th><Th className="text-right">Land (Ac)</Th><Th className="text-center">Parcels</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {cases.filter((c) => !query.trim() || `${c.id} ${c.title}`.toLowerCase().includes(query.toLowerCase())).map((c) => (
              <tr key={c.id} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{c.id}</Td>
                <Td className="max-w-[220px] truncate font-medium text-slate-700">{c.title}</Td>
                <Td><StagePill stage={c.stage} /></Td>
                <Td className="max-w-[170px] truncate text-slate-500">{c.owner}</Td>
                <Td className="max-w-[190px] truncate text-slate-500">Office of Special LAO (NH-19)…</Td>
                <Td className="text-right font-mono font-bold">{c.area}</Td>
                <Td className="text-center font-mono">{c.parcels}</Td>
                <Td className="text-right"><button className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Track</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
