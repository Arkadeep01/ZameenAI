import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PortalCard } from "../components/portal/PortalLayout";
import { corridors, MAX_COMPARE } from "../features/executive/executiveData";
import { useExecutive } from "../features/executive/ExecutiveStore";
import { Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/comparison")({
  component: ExecutiveComparison,
});

function ExecutiveComparison() {
  const navigate = useNavigate();
  const { compare, toggleCompare, compared } = useExecutive();

  return (
    <>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 19 – Multi-Corridor Comparator</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Side-by-Side Project Performance &amp; Risk Comparison</h1>
          <p className="mt-1 text-sm text-slate-500">Select up to 4 infrastructure corridors to benchmark acquisition velocity, compensation burn rate, and displacement ratios.</p>
        </div>
        <span className="font-mono text-[11px] text-slate-500">Comparing {compare.length} of {MAX_COMPARE} max</span>
      </div>
      <PortalCard className="!p-3">
        <p className="mb-2 text-[11px] font-bold text-slate-500">Quick Select Corridors:</p>
        <div className="flex flex-wrap gap-1.5">
          {corridors.map((c) => (
            <button key={c.code} onClick={() => toggleCompare(c.name)} className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${compare.includes(c.name) ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              {c.name.split(" (")[0]}{compare.includes(c.name) ? " ×" : ""}
            </button>
          ))}
        </div>
      </PortalCard>
      <PortalCard className="mt-4 !p-0">
        <div className="overflow-x-auto">
          <table className={`text-left ${compared.length <= 2 ? "w-full" : "w-full min-w-[860px]"}`}>
            <thead>
              <tr className="bg-slate-50">
                <Th className="min-w-[180px]">Metric Dimension</Th>
                {compared.map((c) => (
                  <th key={c.code} className="min-w-[220px] border-l border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">{c.name}<br /><span className="font-mono font-medium normal-case text-slate-400">{c.code}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Statutory Health", compared.map((c) => `${c.health}/100 · ${c.status}`)],
                ["State / District", compared.map((c) => `${c.state} (${c.district})`)],
                ["Area Required", compared.map((c) => `${c.landR}`)],
                ["Area Acquired (Sec 19)", compared.map((c) => `${c.landA} Ha`)],
                ["Compensation Assessed", compared.map((c) => `₹${c.compA}`)],
                ["Compensation Disbursed", compared.map((c) => `₹${c.compP}`)],
                ["Possession Progress", compared.map((c) => `${c.poss.toFixed(1)}%`)],
              ] satisfies Array<[string, string[]]>).map(([label, vals]) => (
                <tr key={label} className="hover:bg-amber-50/40">
                  <Td className="font-bold text-slate-600">{label}</Td>
                  {vals.map((v, i) => (
                    <td key={i} className="border-l border-slate-100 px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">{v}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <Td className="font-bold text-slate-600">Executive Dossier</Td>
                {compared.map((c) => (
                  <td key={c.code} className="border-l border-slate-100 px-3 py-2.5"><button onClick={() => navigate({ to: "/executive/reports" })} className="text-[11px] font-bold text-amber-700">Open Full Dossier →</button></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </PortalCard>
    </>
  );
}
