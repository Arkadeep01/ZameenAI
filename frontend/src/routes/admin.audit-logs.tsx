import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";

import { PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { SevBadge, TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AdminAuditLogs,
});

function AdminAuditLogs() {
  const { auditLogs, exportAuditJson } = useAdmin();
  const [query, setQuery] = useState("");

  const auditRows = useMemo(() => {
    const x = query.trim().toLowerCase();
    if (!x) return auditLogs;
    return auditLogs.filter((l) =>
      `${l.id} ${l.user} ${l.action} ${l.entity} ${l.reason}`.toLowerCase().includes(x),
    );
  }, [auditLogs, query]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Platform Audit Trail</h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable, SHA-256-chained record of every privileged action. Exports include the full bundle.
          </p>
        </div>
        <button
          onClick={exportAuditJson}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#123a75]"
        >
          <Download size={14} /> Export JSON Bundle
        </button>
      </div>
      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, officer, action, entity or reason…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
      </PortalCard>
      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1000px]">
          <thead>
            <tr>
              <Th>Log ID</Th>
              <Th>Timestamp</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Module</Th>
              <Th>Entity</Th>
              <Th>Result</Th>
              <Th>Severity</Th>
              <Th>Reason</Th>
            </tr>
          </thead>
          <tbody>
            {auditRows.map((l) => (
              <tr key={l.id} className="hover:bg-emerald-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-slate-700">{l.id}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{l.ts}</Td>
                <Td className="whitespace-nowrap font-semibold text-slate-800">{l.user}</Td>
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{l.action}</Td>
                <Td className="whitespace-nowrap text-slate-500">{l.module}</Td>
                <Td className="font-mono text-slate-600">{l.entity}</Td>
                <Td>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      l.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {l.result}
                  </span>
                </Td>
                <Td>
                  <SevBadge sev={l.severity} />
                </Td>
                <Td className="max-w-[260px] truncate text-slate-500">{l.reason}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}

export default AdminAuditLogs;
