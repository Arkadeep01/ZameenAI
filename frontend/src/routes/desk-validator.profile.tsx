import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, KeyRound, ShieldCheck } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { LAO, permissions, SOP_STEPS } from "../features/deskValidator/deskValidatorData";
import { GovStrip } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/profile")({
  component: DeskValidatorProfile,
});

function DeskValidatorProfile() {
  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="System & Help • RBAC Authority"
        title="Officer Profile, Authority & SOP"
        subtitle="Digital identity, statutory permissions and desk scrutiny standard operating procedure."
      />
      <div className="grid grid-cols-1 gap-5">
        <PortalCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-black text-slate-900">{LAO.name}</p>
              <p className="text-xs text-slate-500">{LAO.designation}</p>
              <p className="font-mono text-xs text-slate-500">Badge ID: {LAO.badgeId}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Digital Token: ACTIVE</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs font-bold text-slate-700">Assigned Department &amp; Office:</p><p className="mt-0.5 text-xs text-slate-600">{LAO.office}</p></div>
            <div><p className="text-xs font-bold text-slate-700">State &amp; Revenue Tehsils:</p><p className="mt-0.5 text-xs text-slate-600">{LAO.tehsils}</p></div>
          </div>
        </PortalCard>

        <PortalCard>
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800"><KeyRound size={14} className="text-indigo-600" /> Active RBAC Statutory Authority &amp; Permissions</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {permissions.map((p) => (
              <span key={p} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50/70 px-2.5 py-2 font-mono text-[11px] font-medium text-slate-700"><ShieldCheck size={13} className="shrink-0 text-emerald-600" />{p}</span>
            ))}
          </div>
        </PortalCard>

        <PortalCard>
          <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800"><BookOpen size={14} className="text-indigo-600" /> Desk Scrutiny Standard Operating Procedure (SOP)</h3>
          <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-600">
            {SOP_STEPS.map(([label, text]) => (
              <li key={label}><span className="font-bold">{label}</span> {text}</li>
            ))}
          </ol>
        </PortalCard>
      </div>
    </>
  );
}
