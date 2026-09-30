import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CircleCheck, IdCard, Printer, ShieldCheck, User } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { CALA_POWERS, CALA_SOP, OFFICER } from "../features/approver/approverData";

export const Route = createFileRoute("/approver/powers")({
  component: ApproverPowers,
});

function ApproverPowers() {
  return (
    <>
      <GreetingHeader
        eyebrow="Authority • CALA-UP-GBN-84"
        title="CALA Powers & Statutory SOP"
        subtitle="Competent Authority powers under RFCTLARR 2013 and NH Act 1956, plus the officer dossier."
      />
      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0B2A5B] text-sm font-black text-white">{OFFICER.initials}</span>
            <div>
              <p className="text-sm font-black text-[#0B1F44]">{OFFICER.name}, IAS</p>
              <p className="text-[11px] text-slate-500">{OFFICER.designation} · Badge {OFFICER.badge}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13} /> {OFFICER.level}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right text-xs">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Jurisdiction</p>
            <p className="font-bold text-slate-800">{OFFICER.jurisdiction}</p>
            <p className="mt-1 flex items-center justify-end gap-1 font-mono text-[11px] text-slate-500"><IdCard size={12} /> {OFFICER.badge}</p>
          </div>
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard className="border-emerald-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><User size={15} /> CALA Sanction Powers</h2>
          <div className="mt-3 space-y-2">
            {CALA_POWERS.map((t) => (
              <p key={t} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-slate-700">
                <CircleCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> {t}
              </p>
            ))}
          </div>
        </PortalCard>
        <PortalCard>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1F44]"><BookOpen size={15} /> Quasi-Judicial SOP</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
            {CALA_SOP.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button onClick={() => window.print()} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Printer size={13} /> Print SOP</button>
        </PortalCard>
      </div>
    </>
  );
}
