import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { assignedRows } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { ConfidenceBar, GovStrip, TableShell, Td, Th } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/assigned")({
  component: DeskValidatorAssigned,
});

function DeskValidatorAssigned() {
  const navigate = useNavigate();
  const { selectCase } = useDeskValidator();

  const open = (caseId: string, target: "dossier" | "workspace") => () => {
    selectCase(caseId);
    navigate({ to: `/desk-validator/${target}` });
  };

  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="Jurisdiction Desk • Hooghly Special LA Cell"
        title="Assigned Acquisition Cases Dossier"
        subtitle="Complete register of acquisition cases assigned to the Hooghly District Desk Validator."
      />
      <p className="mb-3 text-right font-mono text-xs text-slate-500">Total Assigned: <span className="font-bold text-slate-900">10</span></p>
      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input placeholder="Search by Case, Khasra, Owner, Project…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
      </PortalCard>
      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1000px]">
          <thead>
            <tr><Th>Case Number</Th><Th>Project</Th><Th>Location</Th><Th>Khasra / Plot</Th><Th>Owner</Th><Th>Status</Th><Th>Confidence</Th><Th className="text-right">Actions</Th></tr>
          </thead>
          <tbody>
            {assignedRows.map((r) => (
              <tr key={r.caseId} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-slate-800">{r.caseId}</Td>
                <Td className="max-w-[220px] font-medium text-slate-700">{r.project}</Td>
                <Td><p className="font-medium text-slate-700">{r.location}</p><p className="text-[11px] text-slate-400">{r.sub}</p></Td>
                <Td className="font-mono font-bold">{r.khasra}</Td>
                <Td className="text-slate-600">{r.owner}</Td>
                <Td><span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold ${r.statusTone}`}>● {r.status}</span></Td>
                <Td><ConfidenceBar value={r.conf} /></Td>
                <Td>
                  <span className="flex justify-end gap-2">
                    <button onClick={open(r.caseId, "dossier")} className="rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Dossier</button>
                    <button onClick={open(r.caseId, "workspace")} className="rounded bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white">Scrutinize</button>
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
