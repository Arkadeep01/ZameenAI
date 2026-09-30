import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { projects } from "../features/pia/piaData";
import { usePia } from "../features/pia/PiaStore";
import { FilterSelect, TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/projects")({
  component: PiaProjects,
});

function PiaProjects() {
  const navigate = useNavigate();
  const { query, setQuery, filteredProjects } = usePia();

  const go = (to: string) => () => navigate({ to });

  return (
    <>
      <GreetingHeader
        eyebrow="Registered Portfolio • NHIDCL RO-IV"
        title="Infrastructure Projects"
        subtitle="Registered public infrastructure projects under NHIDCL Regional Office IV jurisdiction"
        actions={
          <button onClick={go("/pia/proposal")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Plus size={14} /> Register New Project</button>
        }
      />
      <PortalCard className="!p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Project ID, Name, Department, District…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <FilterSelect label="All Project Types" />
          <FilterSelect label="All Districts" />
        </div>
        <p className="mt-2.5 text-xs text-slate-500">Showing {filteredProjects.length} of {projects.length} projects</p>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1000px]">
          <thead><tr><Th>Project ID</Th><Th>Project Name</Th><Th>Type</Th><Th>Districts</Th><Th className="text-right">Land Required</Th><Th className="text-right">Land Acquired</Th><Th className="text-center">Active Cases</Th><Th>Vesting %</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {filteredProjects.map((p) => (
              <tr key={p.id} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{p.id}</Td>
                <Td><p className="max-w-[220px] truncate font-bold text-slate-800">{p.name}</p><p className="max-w-[220px] truncate text-[11px] text-slate-400">{p.sub}</p></Td>
                <Td><span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{p.type}</span></Td>
                <Td className="max-w-[160px] truncate text-slate-600">{p.districts}</Td>
                <Td className="text-right font-mono font-semibold">{p.req}</Td>
                <Td className="text-right font-mono font-bold text-emerald-700">{p.acq}</Td>
                <Td className="text-center font-mono">{p.cases}</Td>
                <Td>
                  <p className="font-mono text-[11px] font-bold">{p.vest.toFixed(1)}%</p>
                  <span className="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${p.vest}%` }} /></span>
                </Td>
                <Td><span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{p.status}</span></Td>
                <Td>
                  <span className="flex justify-end gap-2">
                    <button className="text-[11px] font-bold text-slate-500 hover:text-slate-900">View</button>
                    <button onClick={go("/pia/proposal")} className="whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">+ Requisition</button>
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>

      <div className="mt-4 space-y-3 lg:hidden">
        {filteredProjects.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-xs font-bold text-emerald-700">{p.id}</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{p.name}</p>
            <p className="text-xs text-slate-500">{p.districts} · {p.type}</p>
            <p className="mt-2 font-mono text-xs">Required: <b>{p.req}</b> · Acquired: <b className="text-emerald-700">{p.acq}</b> · {p.vest.toFixed(1)}%</p>
            <div className="mt-2 flex gap-2">
              <button className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">View</button>
              <button onClick={go("/pia/proposal")} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white">+ Requisition</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
