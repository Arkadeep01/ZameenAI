import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { ACCESS_PROFILE, ENABLED_CAPABILITIES, OFFICER, PROHIBITED_CAPABILITIES } from "../features/executive/executiveData";

export const Route = createFileRoute("/executive/profile")({
  component: ExecutiveProfile,
});

function ExecutiveProfile() {
  return (
    <>
      <GreetingHeader
        eyebrow="Executive / Decision Maker • Read-Only Mode Enforced"
        title={OFFICER.title}
        subtitle={OFFICER.designation}
      />
      <div className="mx-auto w-full max-w-3xl">
        <PortalCard>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xl font-black text-white">{OFFICER.initials}</span>
            <div>
              <p className="inline-block rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-amber-800">Executive / Decision Maker</p>
              <p className="mt-1 text-xl font-black text-slate-900">{OFFICER.title}</p>
              <p className="text-xs text-slate-500">{OFFICER.designation}</p>
            </div>
          </div>
        </PortalCard>

        <PortalCard className="mt-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Jurisdictional Access &amp; Authorization Profile</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ACCESS_PROFILE.map(([l, v, c]) => (
              <div key={l} className="rounded-lg bg-slate-900 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
                <p className={`mt-0.5 text-xs font-bold text-white ${c}`}>{v}</p>
              </div>
            ))}
          </div>
        </PortalCard>

        <PortalCard className="mt-4">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700"><Lock size={13} className="text-emerald-700" /> Section 26 — Read-Only Policy &amp; Functional Boundary Audit</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">By statutory design, the Executive / Decision Maker interface is strictly configured for macro monitoring, MIS digest review, and spatial analytics. Operational data-entry and transactional workflow controls are physically decoupled:</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-red-700">Prohibited in this window:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-slate-600">
                {PROHIBITED_CAPABILITIES.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Enabled decision powers:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-slate-600">
                {ENABLED_CAPABILITIES.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </PortalCard>
      </div>
    </>
  );
}
