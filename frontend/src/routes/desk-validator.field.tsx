import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { fieldReports } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { GovStrip, TableShell, Td, Th } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/field")({
  component: DeskValidatorField,
});

function DeskValidatorField() {
  const navigate = useNavigate();
  const { selectCase } = useDeskValidator();

  const scrutinize = (caseId: string) => () => {
    selectCase(caseId);
    navigate({ to: "/desk-validator/workspace" });
  };

  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="Cadastral Survey • Hooghly Revenue Circle"
        title="Cadastral Field Verification & Survey Tracking"
        subtitle="Monitor physical on-ground survey inspections by revenue amins and cross-verify with digitized desk records."
      />
      <div className="rounded-xl border-2 border-red-400/70 bg-white p-4 sm:p-5">
        <p className="flex items-center gap-2 font-bold text-red-950"><TriangleAlert size={18} className="text-red-600" /> Field Survey Discrepancies Requiring Reconciliation (1)</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">Physical inspection has revealed boundaries, area measurements, or possession that differ from the uploaded document. LAO cannot validate without reconciliatory inquiry.</p>
        <div className="mt-3 rounded border border-red-200 p-3.5 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-base font-black text-slate-900">LA-2026-00132</span><span className="font-mono text-xs text-slate-500">Khasra 192/B</span><span className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-700">AREA_MISMATCH</span></p>
            <button onClick={scrutinize("LA-2026-00132")} className="inline-flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Scrutinize Case <ExternalLink size={13} /></button>
          </div>
          <p className="text-xs text-slate-500">Eastern Dedicated Freight Corridor Phase-II · Singur, Hooghly</p>
          <div className="mt-2.5 rounded border border-slate-100 bg-slate-50/70 p-3 text-xs leading-relaxed">
            <p className="font-bold text-red-950">Surveyor Discrepancy Finding:</p>
            <p className="mt-1 text-slate-700">Field Officer measured 0.56 acre on ground. Deed shows 0.62 acre. Discrepancy of 0.06 acre must be reconciled.</p>
            <p className="mt-1.5 text-slate-500">Inspector: <span className="font-bold text-slate-700">Inspector P. Roy, Singur Revenue Office</span> <span className="mx-2">Visit Date: <span className="font-bold text-slate-700">2026-09-25</span></span> Boundary Match: <span className="font-bold text-red-600">Mismatch</span></p>
          </div>
        </div>
      </div>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">All Field Verification Reports</h2>
          <p className="font-mono text-xs text-slate-500">1 Verified · 7 Pending</p>
        </div>
        <TableShell minWidth="min-w-[900px]">
          <thead><tr><Th>Case ID</Th><Th>Village &amp; Khasra</Th><Th>Inspector / Amin</Th><Th>Visit Date</Th><Th>Boundary Match</Th><Th>Area Match</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {fieldReports.map((r) => (
              <tr key={r.caseId} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-slate-800">{r.caseId}</Td>
                <Td><p className="font-bold text-slate-800">{r.village}</p><p className="font-mono text-[11px] text-slate-400">KHS: {r.khasra}</p></Td>
                <Td className="text-slate-600">{r.inspector}</Td>
                <Td className="font-mono text-slate-600">{r.visit}</Td>
                <Td className={r.boundary === "Mismatch" ? "font-bold text-red-600" : "font-medium text-emerald-700"}>{r.boundary}</Td>
                <Td className={r.area === "Variance" ? "font-bold text-red-600" : "font-medium text-emerald-700"}>{r.area}</Td>
                <Td className="font-mono font-bold text-slate-800">{r.status}</Td>
                <Td className="text-right"><button className="rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">View Report</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
