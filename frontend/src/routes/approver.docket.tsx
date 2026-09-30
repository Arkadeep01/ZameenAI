import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { auditRows, COMPLIANCE_CHECKLIST, COMPLIANCE_DONE_COUNT } from "../features/approver/approverData";
import { useApprover } from "../features/approver/ApproverStore";
import { PriPill, StatusPill } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/docket")({
  component: ApproverDocket,
});

function ApproverDocket() {
  const navigate = useNavigate();
  const { selected, setStatus, authority, setAuthority } = useApprover();

  const caseAudit = auditRows.filter((r) => r.ref === selected.id);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate({ to: "/approver/pending" })} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800"><ArrowLeft size={14} /> Back to Pending Queue</button>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-900">{selected.id}</span>
        </p>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold">
          Acting as: <button onClick={() => setAuthority("CALA")} className={`rounded px-1.5 py-0.5 ${authority === "CALA" ? "bg-[#0B2A5B] text-white" : "text-slate-500"}`}>CALA</button>
          <button onClick={() => setAuthority("DM")} className={`rounded px-1.5 py-0.5 ${authority === "DM" ? "bg-[#0B2A5B] text-white" : "text-slate-500"}`}>DM / DC</button>
        </span>
      </div>

      <PortalCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-black text-slate-900">{selected.id}</span>
              <StatusPill s={selected.status} /> <PriPill p={selected.priority} />
            </p>
            <p className="mt-1.5 text-sm font-bold text-slate-700">{selected.project}</p>
            <p className="text-xs text-slate-500">{selected.agency} · {selected.parcels} parcels · {selected.area} · {selected.compensation}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatus(selected.id, "Approved", "Finalization")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"><CircleCheck size={14} /> Approve Award</button>
            <button onClick={() => setStatus(selected.id, "Returned / Correction", "Approver Review")} className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">Return Docket</button>
            <button onClick={() => setStatus(selected.id, "Contested", "Approver Review")} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Mark Contested</button>
            <button onClick={() => setStatus(selected.id, "Stayed", "Approver Review")} className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Mark Stayed</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["LAO Desk Validation", `${selected.lao} — ${selected.laoNote}`, "text-emerald-700"],
            ["Field Verification (JMS)", selected.field, selected.field.includes("Certified") ? "text-emerald-700" : "text-amber-700"],
            ["Compensation Schedule", `${selected.comp} (${selected.compNote})`, selected.comp.includes("Approved") ? "text-emerald-700" : "text-amber-700"],
          ].map(([l, v, c]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l as string}</p>
              <p className={`mt-1 font-bold ${c as string}`}>{v as string}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-slate-700">
          <p className="font-bold text-amber-900">Quasi-judicial safeguard</p>
          <p className="mt-1">Approval executes a legally binding acquisition award and is DSC-signed into the tamper-evident audit trail. Contested titles must be referred to LARRA deposit; stayed parcels cannot be approved until the injunction is vacated.</p>
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard>
          <h2 className="text-sm font-bold text-[#0B1F44]">Statutory Compliance Checklist</h2>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
            {COMPLIANCE_CHECKLIST.map((c, i) => (
              <li key={c} className="flex items-start gap-2">
                <CircleCheck size={15} className={i < COMPLIANCE_DONE_COUNT ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-slate-300"} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </PortalCard>
        <PortalCard>
          <h2 className="text-sm font-bold text-[#0B1F44]">Case Audit Excerpt</h2>
          <div className="mt-3 space-y-2.5">
            {caseAudit.map((r) => (
              <div key={r.log} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <p className="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-800">{r.log} <span className="font-sans font-medium text-slate-400">{r.ts}</span></p>
                <p className="mt-1 text-slate-600">{r.actor} ({r.auth}) — {r.action}</p>
                <p className="mt-0.5 text-slate-500">{r.reason}</p>
              </div>
            ))}
            {caseAudit.length === 0 && (
              <p className="text-xs text-slate-500">No audit entries yet for this docket in the demo ledger. Actions taken above are recorded to the quasi-judicial trail.</p>
            )}
          </div>
          <button onClick={() => navigate({ to: "/approver/audit" })} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0B3B5F]">Open full audit trail <ArrowRight size={13} /></button>
        </PortalCard>
      </div>
    </>
  );
}
