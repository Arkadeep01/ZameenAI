import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { CASE_TABS, cases } from "../features/pia/piaData";
import { usePia } from "../features/pia/PiaStore";
import { FilterSelect, PriPill, StagePill, TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/cases")({
  component: PiaCases,
});

function PiaCases() {
  const navigate = useNavigate();
  const { query, setQuery, caseTab, setCaseTab, filteredCases } = usePia();

  const go = (to: string) => () => navigate({ to });

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Land Acquisition Cases</h1>
          <p className="mt-1 text-sm text-slate-500">Authoritative statutory land acquisition requisition cases under PIA stewardship</p>
        </div>
        <button onClick={go("/pia/proposal")} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Plus size={14} /> New Acquisition Proposal</button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
        {CASE_TABS.map(([t, n]) => (
          <button key={t} onClick={() => setCaseTab(t)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 ${caseTab === t ? "border-b-2 border-emerald-600 bg-emerald-50/60 text-emerald-800" : "text-slate-500 hover:text-slate-800"}`}>
            {t} <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${caseTab === t ? "bg-emerald-600 text-white" : t.startsWith("Action") ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>{n}</span>
          </button>
        ))}
      </div>

      <PortalCard className="!p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Requisition Title, Village, Khasra, District…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <FilterSelect label="All Projects" />
          <FilterSelect label="All Priorities" />
        </div>
        <p className="mt-2.5 text-xs text-slate-500">Showing {filteredCases.length} of {cases.length} acquisition cases</p>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1100px]">
          <thead><tr><Th>Case ID</Th><Th>Project</Th><Th>Requisition Title &amp; Purpose</Th><Th>District / Area</Th><Th className="text-right">Required (Ac)</Th><Th className="text-center">Parcels</Th><Th>Workflow Stage</Th><Th>Current Owner</Th><Th>Priority</Th></tr></thead>
          <tbody>
            {filteredCases.map((c) => (
              <tr key={c.id} className={`hover:bg-sky-50/40 ${c.stage.includes("Return") ? "bg-red-50/40" : ""}`}>
                <Td className={`whitespace-nowrap font-mono font-bold ${c.stage.includes("Return") ? "text-red-600" : "text-emerald-700"}`}>{c.id}</Td>
                <Td><p className="font-bold text-slate-800">{c.proj}</p><p className="max-w-[170px] truncate text-[11px] text-slate-400">{c.title}</p></Td>
                <Td><p className="max-w-[230px] truncate font-semibold text-slate-700">{c.title}</p><p className="max-w-[230px] truncate text-[11px] text-slate-400">{c.sub}</p></Td>
                <Td><p className="font-medium text-slate-700">{c.dist}</p></Td>
                <Td className="text-right font-mono font-bold">{c.area}</Td>
                <Td className="text-center font-mono">{c.parcels}</Td>
                <Td><StagePill stage={c.stage} /></Td>
                <Td className="max-w-[150px] truncate text-slate-500">{c.owner}</Td>
                <Td><PriPill p={c.pri} /></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
