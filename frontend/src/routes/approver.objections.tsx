import { createFileRoute } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { objections } from "../features/approver/approverData";
import { StatusPill, TableShell, Td, Th } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/objections")({
  component: ApproverObjections,
});

function ApproverObjections() {
  return (
    <>
      <GreetingHeader
        eyebrow="Section 3C / Section 15 • Quasi-judicial hearings"
        title="Public Objections & Hearing Registry"
        subtitle="Section 3C / Section 15 RFCTLARR objections, quasi-judicial summons, and disposal orders."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[960px]">
          <thead><tr><Th>Objection ID</Th><Th>Project &amp; Khasra</Th><Th>Applicant Ref</Th><Th>Ground of Objection</Th><Th>Hearing Date</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {objections.map((o) => (
              <tr key={o.id} className="hover:bg-sky-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{o.id}</Td>
                <Td><p className="max-w-[240px] truncate font-medium text-slate-700">{o.project}</p><p className="text-[11px] text-slate-400">{o.khasra}</p></Td>
                <Td className="max-w-[240px] truncate font-mono text-[11px] text-slate-500">{o.applicant}</Td>
                <Td className="text-slate-600">{o.ground}</Td>
                <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{o.hearing}</Td>
                <Td><StatusPill s={o.status} /></Td>
                <Td className="text-right"><button className="whitespace-nowrap text-[11px] font-bold text-amber-700 hover:text-amber-900">Conduct Hearing</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
