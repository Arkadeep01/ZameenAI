import { createFileRoute } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { VALIDATED_ROWS, VALIDATED_STATS } from "../features/deskValidator/deskValidatorData";
import { ConfidenceBar, GovStrip, TableShell, Td, Th } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/validated")({
  component: DeskValidatorValidated,
});

function DeskValidatorValidated() {
  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="Archives & Compliance"
        title="Validated Records Archive"
        subtitle="Desk-validated digitized records handed off to CALA review bench and field survey."
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {VALIDATED_STATS.map(([l, v, b]) => (
          <div key={l} className={`rounded-xl border border-slate-200 border-l-4 ${b} bg-white p-4 shadow-sm`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
            <p className="mt-1 text-3xl font-black text-[#0B1F44]">{v}</p>
          </div>
        ))}
      </section>
      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[860px]">
          <thead><tr><Th>Case ID</Th><Th>Owner / Khasra</Th><Th>Validated On</Th><Th>Validator</Th><Th>Confidence</Th><Th>Handoff Stage</Th></tr></thead>
          <tbody>
            {VALIDATED_ROWS.map(([c, o, d, v, conf, h]) => (
              <tr key={c} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-[#0B3B5F]">{c}</Td>
                <Td className="text-slate-600">{o}</Td>
                <Td className="font-mono text-slate-600">{d}</Td>
                <Td className="text-slate-600">{v}</Td>
                <Td><ConfidenceBar value={conf} /></Td>
                <Td><span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{h}</span></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
