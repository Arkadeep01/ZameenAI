import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PortalCard } from "../components/portal/PortalLayout";
import { compCards } from "../features/approver/approverData";
import { useApprover } from "../features/approver/ApproverStore";
import { StatusPill } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/compensation")({
  component: ApproverCompensation,
});

function ApproverCompensation() {
  const navigate = useNavigate();
  const { selectDocket } = useApprover();

  const inspect = (id: string) => () => {
    selectDocket(id);
    navigate({ to: "/approver/docket" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">💰 Compensation &amp; Award Oversight</h1>
          <p className="mt-1 text-sm text-slate-500">RFCTLARR First Schedule &amp; NH Act 3G determinations across all active acquisition corridors.</p>
        </div>
        <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">Authorised: CALA Sanction Powers</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {compCards.map((c) => (
          <PortalCard key={c.id} className="!p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[11px] font-bold text-amber-700">{c.id}</p>
              <StatusPill s={c.flag} />
            </div>
            <p className="mt-1.5 text-sm font-bold leading-snug text-slate-800">{c.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{c.basis}</p>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 font-mono text-xs">
              <p className="flex justify-between"><span className="font-sans text-slate-500">Total Award:</span><span className="font-bold text-emerald-700">{c.award}</span></p>
              <p className="flex justify-between"><span className="font-sans text-slate-500">Disbursed / Escrow:</span><span className="font-bold text-slate-700">{c.disb}</span></p>
            </div>
            <button onClick={inspect(c.id)} className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Inspect Compensation Schedule →</button>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
