import { createFileRoute } from "@tanstack/react-router";
import { Search, ShieldCheck } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { AUDIT_FILTER_LABELS, auditRows } from "../features/approver/approverData";
import { FilterSelect, StatusPill, TableShell, Td, Th } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/audit")({
  component: ApproverAudit,
});

function ApproverAudit() {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Statutory Quasi-Judicial Audit Trail <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-xs font-black text-amber-800">{auditRows.length} Recorded Entries</span></h1>
          <p className="mt-1 text-sm text-slate-500">Read-only master audit log. Cryptographically seals all acquisition approvals, rejections, stays, and warrants.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500"><ShieldCheck size={13} className="text-emerald-600" /> Tamper-evident legal ledger</span>
      </div>
      <PortalCard className="!p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input placeholder="Search by Case ID, Officer, Action, or Reason…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          {AUDIT_FILTER_LABELS.map((label) => (
            <FilterSelect key={label} label={label} />
          ))}
        </div>
      </PortalCard>
      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1100px]">
          <thead><tr><Th>Log ID</Th><Th>Case Reference</Th><Th>Timestamp</Th><Th>Officer / Actor</Th><Th>Authority</Th><Th>Action Executed</Th><Th>Status Transition</Th><Th>Legal Reason / Justification</Th></tr></thead>
          <tbody>
            {auditRows.map((r) => (
              <tr key={r.log} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{r.log}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{r.ref}</Td>
                <Td className="whitespace-nowrap font-mono text-slate-500">{r.ts}</Td>
                <Td className="whitespace-nowrap font-medium text-slate-700">{r.actor}</Td>
                <Td><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-black ${r.auth === "CALA" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>{r.auth}</span></Td>
                <Td className="max-w-[220px] text-slate-700">{r.action}</Td>
                <Td><StatusPill s={r.trans} /></Td>
                <Td className="max-w-[280px] text-slate-500">{r.reason}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
