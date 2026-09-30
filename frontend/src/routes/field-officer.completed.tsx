import { createFileRoute } from "@tanstack/react-router";
import { Eye, Lock } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { COMPLETED_VERIFICATIONS, OFFICER } from "../features/fieldOfficer/fieldOfficerData";
import { StatusPill } from "../features/fieldOfficer/fieldOfficerUi";

export const Route = createFileRoute("/field-officer/completed")({
  component: FieldOfficerCompleted,
});

function FieldOfficerCompleted() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Completed Field Verifications</h1>
          <p className="mt-1 text-sm text-slate-500">Official immutable records of ground inspections transmitted to the revenue database.</p>
        </div>
        <span className="w-fit rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">1 Submitted Record(s)</span>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
        <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" />
        <p><b>Immutable Audit Trail:</b> Submitted ground verifications cannot be altered directly. Any subsequent revisions require a formal clarification order from the Circle Officer.</p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COMPLETED_VERIFICATIONS.map((c) => (
          <div key={c.ver} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center justify-between font-mono text-[11px] font-bold text-emerald-900">{c.ver} <StatusPill s="Verified" /></p>
            <p className="mt-1 text-base font-black text-slate-900">{c.khasra}</p>
            <p className="text-xs text-slate-500">{c.village}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Recorded Owner</p><p className="font-bold">{c.owner}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Ground Occupant</p><p className="font-bold">Shri {c.owner}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Submitted At</p><p className="font-mono">{c.date}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Evidence Attached</p><p className="font-semibold">{c.photos}</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="font-mono text-[11px] text-slate-400">Officer: {OFFICER.badge}</p>
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><Eye size={13} /> View Audit Record</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
