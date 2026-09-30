import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useExecutive } from "../features/executive/ExecutiveStore";
import { CorridorTable } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/corridors")({
  component: ExecutiveCorridors,
});

function ExecutiveCorridors() {
  const { filteredCorridors, compare, query, setQuery } = useExecutive();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">National Corridor Registry • Section 11 Project Dossier Directory</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Infrastructure Corridor Projects ({filteredCorridors.length})</h1>
          <p className="mt-1 text-sm text-slate-500">Click any project to inspect statutory milestones, compensation disbursal, GIS parcels, and risk forecasts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-white">Compare Selected ({compare.length}) →</button>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project or code…" className="w-44 bg-transparent text-xs outline-none placeholder:text-slate-400" />
          </label>
        </div>
      </div>
      <CorridorTable rows={filteredCorridors} />
      <p className="mt-3 text-[11px] text-slate-500">Select up to 4 corridors with the checkboxes on the comparison view to benchmark acquisition velocity and risk side-by-side.</p>
    </>
  );
}
