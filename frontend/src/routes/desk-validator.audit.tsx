import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { auditRows } from "../features/deskValidator/deskValidatorData";
import { GovStrip, TableShell, Td, Th } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/audit")({
  component: DeskValidatorAudit,
});

function DeskValidatorAudit() {
  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="Compliance • Tamper-evident log"
        title="Statutory Audit Trail & Cryptographic Log"
        subtitle="Read-only cryptographic scrutiny log of all OCR field corrections, validator approvals, and returns."
      />
      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input placeholder="Search by Actor, Field, Action, or Reason…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
      </PortalCard>
      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1000px]">
          <thead><tr><Th>Timestamp</Th><Th>Actor</Th><Th>Role</Th><Th>Action Code</Th><Th>Field</Th><Th>Previous Value</Th><Th>New Corrected Value</Th><Th>Reason &amp; Evidence</Th><Th>Rev</Th></tr></thead>
          <tbody>
            {auditRows.map((r) => (
              <tr key={r.ts} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono text-slate-600">{r.ts}</Td>
                <Td className="font-bold text-slate-900">{r.actor}</Td>
                <Td className="text-slate-500">{r.role}</Td>
                <Td className="font-mono text-indigo-700">{r.action}</Td>
                <Td className="font-mono font-medium">{r.field}</Td>
                <Td className="font-mono text-slate-400 line-through">{r.prev}</Td>
                <Td className="bg-amber-50/50 font-mono font-bold">{r.next}</Td>
                <Td className="max-w-[240px] text-slate-600">{r.reason}</Td>
                <Td className="font-mono text-slate-400">{r.rev}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
