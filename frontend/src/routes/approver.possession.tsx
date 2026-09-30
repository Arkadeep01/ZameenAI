import { createFileRoute } from "@tanstack/react-router";
import { PortalCard } from "../components/portal/PortalLayout";
import { possessionCards } from "../features/approver/approverData";
import { StatusPill } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/possession")({
  component: ApproverPossession,
});

function ApproverPossession() {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">🔑 Statutory Possession Handover Docket</h1>
          <p className="mt-1 text-sm text-slate-500">Section 38/40 Regular &amp; Urgency possession mandates. Final possession sign-off is exclusive to DM/DC.</p>
        </div>
        <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">CALA View (DM/DC executes final possession)</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {possessionCards.map((p) => (
          <PortalCard key={p.id} className="!p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[11px] font-bold text-amber-700">{p.id}</p>
              <StatusPill s={p.readiness === "Ready" ? "Possession Pending" : p.readiness === "Granted" ? "Possession Granted" : "Not Ready"} />
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-800">{p.title}</p>
            <p className="text-[11px] text-slate-500">Agency: {p.agency}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
              <p className="text-slate-500">Panchnama Reference:<br /><span className="font-mono text-slate-700">{p.state}</span></p>
              <p className="text-slate-500">Compensation Status:<br /><span className="font-semibold text-emerald-700">{p.stateNote}</span></p>
            </div>
            <button className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Inspect Possession Checklist →</button>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
