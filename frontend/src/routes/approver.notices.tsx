import { createFileRoute } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { notices } from "../features/approver/approverData";
import { StatusPill, TableShell, Td, Th } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/notices")({
  component: ApproverNotices,
});

function ApproverNotices() {
  return (
    <>
      <GreetingHeader
        eyebrow="Sections 3A / 3D / 3G • Gazette & Claims"
        title="Statutory Notices Register"
        subtitle="Section 3A, 3D, 3G gazetted proclamations and claims invitation notices."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[960px]">
          <thead><tr><Th>Notice ID</Th><Th>Project</Th><Th>Type</Th><Th>Gazette Ref</Th><Th>Issue Date</Th><Th>Deadline</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{n.id}</Td>
                <Td className="max-w-[240px] truncate text-slate-600">{n.project}</Td>
                <Td className="whitespace-nowrap text-slate-600">{n.type}</Td>
                <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{n.gazette}</Td>
                <Td className="whitespace-nowrap font-mono text-slate-500">{n.issue}</Td>
                <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{n.deadline}</Td>
                <Td><StatusPill s={n.status} /></Td>
                <Td className="text-right"><button className="text-[11px] font-bold text-amber-700 hover:text-amber-900">Open Case</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
