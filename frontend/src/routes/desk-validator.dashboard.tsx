import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { queueRows, SCRUTINY_GUIDELINES, stats, WORKFLOW_STEPS } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { ConfidenceBar, GovStrip, PriorityPill, QueueStatusPill, TableShell, Td, Th } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/dashboard")({
  component: DeskValidatorDashboard,
});

function DeskValidatorDashboard() {
  const navigate = useNavigate();
  const { selectCase } = useDeskValidator();

  const open = (caseId: string) => () => {
    selectCase(caseId);
    navigate({ to: "/desk-validator/workspace" });
  };

  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="Hooghly Special LA Cell • Desk Scrutiny"
        title="Desk Validation Dashboard"
        subtitle="Review AI-digitized land records and validate low-confidence information before downstream acquisition approval."
        actions={
          <button onClick={() => navigate({ to: "/desk-validator/queue" })} className="rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#123a75]">
            Open Validation Queue →
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border border-slate-200 border-l-4 ${s.bar} bg-white p-3.5 shadow-sm`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-black text-[#0B1F44]">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </section>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">
            ⚠ Urgent Priority Validation Queue
          </h2>
          <button onClick={() => navigate({ to: "/desk-validator/queue" })} className="inline-flex items-center gap-1 text-xs font-bold text-[#0B3B5F]">
            View All 6 Cases <ArrowRight size={13} />
          </button>
        </div>
        <TableShell>
          <thead>
            <tr>
              <Th>Case ID</Th><Th>Project / Corridor</Th><Th>Location</Th><Th>Khasra / Khata</Th>
              <Th>Document Type</Th><Th>AI Confidence</Th><Th>Flagged</Th><Th>Priority</Th><Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {queueRows.slice(0, 5).map((r) => (
              <tr key={r.caseId} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-[#0B3B5F]">{r.caseId}</Td>
                <Td><p className="font-semibold text-slate-700">{r.project}</p><p className="text-[11px] text-slate-400">{r.section}</p></Td>
                <Td className="text-slate-600">{r.village}, {r.district}</Td>
                <Td className="font-semibold text-slate-700">{r.khasra} (Khata {r.khata})</Td>
                <Td className="text-slate-600">{r.docType}</Td>
                <Td><ConfidenceBar value={r.conf} /></Td>
                <Td><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{r.flags} fields</span></Td>
                <Td><PriorityPill p={r.priority} /></Td>
                <Td><button onClick={open(r.caseId)} className="rounded bg-[#0B2A5B] px-2.5 py-1 text-[11px] font-bold text-white">Review</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Statutory Acquisition Workflow Progression</h3>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
            {WORKFLOW_STEPS.map(([label, text]) => (
              <p key={label}><span className="font-bold">{label}</span> {text}</p>
            ))}
          </div>
        </PortalCard>
        <PortalCard>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">LAO Desk Scrutiny Guidelines</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-slate-600">
            {SCRUTINY_GUIDELINES.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </PortalCard>
      </div>
    </>
  );
}
