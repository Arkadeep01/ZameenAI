import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleCheck, CircleX, ShieldCheck } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { OFFICER, allowed, restricted } from "../features/pia/piaData";

export const Route = createFileRoute("/pia/profile")({
  component: PiaProfile,
});

function PiaProfile() {
  const navigate = useNavigate();

  return (
    <>
      <GreetingHeader
        eyebrow="Institutional Identity • Statutory RBAC Matrix"
        title="PIA Profile &amp; Requisition Controls"
        subtitle="Institutional identity, nodal officer credentials, and statutory role-based access control matrix."
        actions={
          <button onClick={() => navigate({ to: "/pia/proposal" })} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">+ New Acquisition Proposal</button>
        }
      />

      <PortalCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white">ZA</span>
            <div>
              <p className="font-mono text-[10px] font-bold text-emerald-700">PIA-IND-2024-NH-048</p>
              <p className="text-sm font-black text-[#0B1F44]">National Highways &amp; Infrastructure Development Corporation (NHIDCL)</p>
              <p className="text-[11px] text-slate-500">Ministry of Road Transport and Highways (MoRTH)</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Authorized Jurisdiction</p>
            <p className="font-bold text-slate-800">Northern Corridor Zone IV (Uttar Pradesh &amp; Bihar)</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {[["Nodal Officer", OFFICER.name, OFFICER.designation], ["Official Email", "ro4.lao@nhidcl.gov.in", ""], ["Contact Phone", "+91 542 258 4491", ""], ["Officer Badge / Authorization ID", "PIA-OFFICER-7741", ""]].map(([l, v, s]) => (
            <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p>{s ? <p className="text-[11px] text-slate-500">{s}</p> : null}</div>
          ))}
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard className="border-emerald-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck size={15} /> PIA Authorized Requisition Powers</h2>
          <p className="mt-1 text-[11px] text-slate-500">Statutory authorities permitted to the Project Implementing Agency under RFCTLARR 2013:</p>
          <div className="mt-3 space-y-2">
            {allowed.map(([t, code]) => (
              <div key={code} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-700"><CircleCheck size={14} className="shrink-0 text-emerald-600" />{t}</span>
                <span className="hidden shrink-0 font-mono text-[9px] text-slate-400 sm:block">{code}</span>
              </div>
            ))}
          </div>
        </PortalCard>
        <PortalCard className="border-red-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><ShieldCheck size={15} /> Restricted Revenue Authorities (LAO / CALA / DM)</h2>
          <p className="mt-1 text-[11px] text-slate-500">Enforced statutory boundaries; PIA cannot perform or tamper with these functions:</p>
          <div className="mt-3 space-y-2">
            {restricted.map(([t, code]) => (
              <div key={code} className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-700"><CircleX size={14} className="shrink-0 text-red-500" />{t}</span>
                <span className="hidden shrink-0 font-mono text-[9px] text-slate-400 sm:block">{code}</span>
              </div>
            ))}
          </div>
        </PortalCard>
      </div>
    </>
  );
}
