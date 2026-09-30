import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  IdCard,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { OFFICER, OFFICER_ACTIVITY, OFFICER_DENIED, OFFICER_POWERS } from "../features/pia/piaData";

export const Route = createFileRoute("/pia/officer")({
  component: PiaOfficer,
});

function PiaOfficer() {
  const navigate = useNavigate();

  return (
    <>
      <GreetingHeader
        eyebrow="Institutional • Nodal Officer Dossier"
        title={`Officer Profile — ${OFFICER.name}`}
        subtitle="Nodal officer identity, authorization level, jurisdiction and statutory requisition powers."
        actions={
          <>
            <button onClick={() => navigate({ to: "/pia/profile" })} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">PIA Organization &amp; Profile</button>
            <button onClick={() => navigate({ to: "/pia/proposal" })} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">+ New Proposal</button>
          </>
        }
      />

      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0B2A5B] text-lg font-black text-white">
              {OFFICER.initials}
            </span>
            <div>
              <p className="text-lg font-black text-slate-900">{OFFICER.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{OFFICER.designation}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck size={13} /> {OFFICER.level}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-slate-600">
                  <IdCard size={13} /> {OFFICER.badge}
                </span>
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> DSC Token: Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Official Email", OFFICER.email, Mail],
            ["Contact Phone", OFFICER.phone, Phone],
            ["Office", `${OFFICER.office} (PIA-IND-2024-NH-048)`, Building2],
            ["In Position Since", OFFICER.doj, Clock3],
          ].map(([l, v, Icon]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Icon size={12} /> {l as string}</p>
              <p className="mt-1 font-bold leading-snug text-slate-800">{v as string}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-slate-800"><MapPin size={13} className="text-emerald-700" /> Authorized Jurisdiction</p>
            <p className="mt-1 font-semibold text-slate-700">{OFFICER.jurisdiction}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{OFFICER.org} · {OFFICER.office} · Ministry of Road Transport and Highways (MoRTH)</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-slate-800"><KeyRound size={13} className="text-emerald-700" /> Signing Authority</p>
            <p className="mt-1 font-semibold text-slate-700">{OFFICER.dsc}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Every requisition, resubmission and dossier upload is DSC-signed and written to the tamper-evident audit log.</p>
          </div>
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard className="border-emerald-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck size={15} /> What this officer can do</h2>
          <div className="mt-3 space-y-2">
            {OFFICER_POWERS.map((t) => (
              <p key={t} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-slate-700">
                <CircleCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> {t}
              </p>
            ))}
          </div>
        </PortalCard>
        <PortalCard className="border-red-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><CircleAlert size={15} /> Outside this officer&apos;s authority</h2>
          <div className="mt-3 space-y-2">
            {OFFICER_DENIED.map((t) => (
              <p key={t} className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-xs font-medium text-slate-700">
                <CircleX size={14} className="mt-0.5 shrink-0 text-red-500" /> {t}
              </p>
            ))}
          </div>
        </PortalCard>
      </div>

      <PortalCard className="mt-5">
        <h2 className="text-sm font-bold text-[#0B1F44]">Recent officer activity</h2>
        <div className="mt-3 space-y-2.5 border-l-2 border-slate-100 pl-4">
          {OFFICER_ACTIVITY.map(([t, d]) => (
            <div key={t}>
              <p className="text-xs font-bold text-slate-800">{t}</p>
              <p className="text-[11px] text-slate-500">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
          <button onClick={() => navigate({ to: "/pia/cases" })} className="rounded-lg bg-[#0B2A5B] px-3.5 py-2 text-xs font-bold text-white">Open My Cases <ArrowRight size={12} className="ml-1 inline" /></button>
          <button onClick={() => navigate({ to: "/pia/profile" })} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">PIA Organization &amp; Profile</button>
        </div>
      </PortalCard>
    </>
  );
}
