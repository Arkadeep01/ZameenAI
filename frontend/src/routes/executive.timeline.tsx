import { createFileRoute } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { milestones } from "../features/executive/executiveData";
import { HealthPill, TableShell, Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/timeline")({
  component: ExecutiveTimeline,
});

function ExecutiveTimeline() {
  return (
    <>
      <GreetingHeader
        eyebrow="Section 17 – Milestone Adherence Ledger"
        title="Project Milestone Timeline &amp; Statutory Delay Tracking"
        subtitle="Read-only statutory timeline monitoring for Preliminary Notifications, Declarations, and Award deadlines under RFCTLARR Act 2013."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[1100px]">
          <thead><tr><Th>Project Corridor</Th><Th>Statutory Milestone</Th><Th>Legal Provision</Th><Th>Planned Date</Th><Th>Actual / Projected</Th><Th>Current Date</Th><Th>Delay Duration</Th><Th>Status</Th></tr></thead>
          <tbody>
            {milestones.map(([p, m, l, pl, ac, cu, dl, s]) => (
              <tr key={`${p}-${m}`} className="hover:bg-amber-50/40">
                <Td className="max-w-[160px] truncate font-medium text-slate-700">{p}</Td>
                <Td className="max-w-[260px] text-slate-600">{m}</Td>
                <Td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{l}</Td>
                <Td className="whitespace-nowrap font-mono text-slate-500">{pl}</Td>
                <Td className="whitespace-nowrap font-mono font-bold">{ac}</Td>
                <Td className="whitespace-nowrap font-mono text-slate-500">{cu}</Td>
                <Td className={`whitespace-nowrap font-mono text-[11px] font-bold ${dl.startsWith("+") ? "text-red-600" : "text-emerald-700"}`}>{dl}</Td>
                <Td><HealthPill s={s} /></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
