import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Search, Upload } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { documents } from "../features/pia/piaData";
import { usePia } from "../features/pia/PiaStore";
import { DocState, FilterSelect, TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/documents")({
  component: PiaDocuments,
});

function PiaDocuments() {
  const { query, setQuery } = usePia();

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Document Repository &amp; Dossiers</h1>
          <p className="mt-1 text-sm text-slate-500">Authoritative requisition dockets, alignment blueprints, and AI extraction logs</p>
        </div>
        <button className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"><Upload size={14} /> Upload Supporting Document</button>
      </div>

      <PortalCard className="!p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Document ID, Filename, Case ID…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <FilterSelect label="All Requisition Cases" />
          <FilterSelect label="All Document Categories" />
          <FilterSelect label="All Pipeline States" />
        </div>
        <p className="mt-2.5 text-xs text-slate-500">Showing {documents.length} of {documents.length} documents</p>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1050px]">
          <thead><tr><Th>Document ID</Th><Th>Filename</Th><Th>Case ID</Th><Th>Category</Th><Th className="text-right">Size</Th><Th>Uploaded Date</Th><Th>Processing State</Th><Th className="text-right">AI Confidence</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            {documents.filter((d) => !query.trim() || `${d.id} ${d.file} ${d.caseId}`.toLowerCase().includes(query.toLowerCase())).map((d) => (
              <tr key={d.id} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono text-slate-500">{d.id}</Td>
                <Td><span className="flex max-w-[220px] items-center gap-2 truncate font-medium text-slate-700"><FileText size={14} className="shrink-0 text-emerald-600" /><span className="truncate">{d.file}</span></span></Td>
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{d.caseId}</Td>
                <Td className="max-w-[170px] truncate text-slate-600">{d.cat}</Td>
                <Td className="text-right font-mono">{d.size}</Td>
                <Td className="whitespace-nowrap font-mono text-slate-500">{d.date}</Td>
                <Td><DocState s={d.state} /></Td>
                <Td className={`text-right font-mono font-bold ${d.state === "REJECTED" ? "text-amber-600" : d.state.includes("PENDING") ? "text-blue-600" : "text-emerald-600"}`}>{d.conf}</Td>
                <Td className="text-right"><span className="inline-flex gap-3 text-[11px] font-bold text-slate-500"><button className="hover:text-slate-900">Pipeline</button><button className="hover:text-slate-900"><Download size={14} /></button></span></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
