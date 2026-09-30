import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { INITIAL_ACTIVITIES } from "../features/admin/adminData";
import { TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/user-activity")({
  component: AdminUserActivity,
});

function AdminUserActivity() {
  return (
    <>
      <GreetingHeader
        eyebrow="Identity Telemetry • Jan Parichay Bridge"
        title="User Activity Log"
        subtitle="Authentication, authorization and session telemetry across all operational portals."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[960px]">
          <thead>
            <tr>
              <Th>Officer</Th>
              <Th>Action</Th>
              <Th>IP Address</Th>
              <Th>Device</Th>
              <Th>Location</Th>
              <Th>Timestamp</Th>
              <Th>Status</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_ACTIVITIES.map((a) => (
              <tr key={a.id} className="hover:bg-emerald-50/40">
                <Td className="font-bold text-slate-800">{a.user}</Td>
                <Td className="text-slate-600">{a.action}</Td>
                <Td className="font-mono text-slate-500">{a.ip}</Td>
                <Td className="text-slate-500">{a.agent}</Td>
                <Td className="text-slate-500">{a.loc}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{a.ts}</Td>
                <Td>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      a.status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700"
                        : a.status === "FAILED"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {a.status}
                  </span>
                </Td>
                <Td className="max-w-[220px] truncate text-slate-500">{a.details}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}

export default AdminUserActivity;
