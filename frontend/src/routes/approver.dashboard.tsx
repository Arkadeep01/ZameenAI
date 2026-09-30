import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { alerts, compensationTotals, recentDecisions, stages } from "../features/approver/approverData";
import { useApprover } from "../features/approver/ApproverStore";
import { StatusPill, TableShell, Td, Th } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/dashboard")({
  component: ApproverDashboard,
});

function ApproverDashboard() {
  const navigate = useNavigate();
  const { metrics, dockets, selectDocket } = useApprover();

  const openDocket = (id: string) => () => {
    selectDocket(id);
    navigate({ to: "/approver/docket" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <GreetingHeader
        eyebrow="Judicial & Statutory Overview • Gautam Buddha Nagar (Dadri)"
        title="Acquisition Approver Command Center"
        subtitle="Welcome, Smt. Ananya Deshmukh, IAS. Review acquisition dockets, statutory declarations, compensation schedules, field verification reports, and execute legally binding clearance orders."
        actions={
          <button onClick={() => navigate({ to: "/approver/pending" })} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">
            Open Pending Review Queue →
          </button>
        }
      />

      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Decision-Oriented Metrics</p>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <PortalCard key={m.label} className="!p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{m.label}</p>
            <p className="mt-1 text-3xl font-black text-[#0B1F44]">{m.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{m.sub}</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-[#0B1F44]">⚠ Priority Alerts &amp; Action Items</h2>
          <span className="text-[11px] text-slate-500">5 critical alerts require statutory attention</span>
        </div>
        <div className="space-y-2.5">
          {alerts.map((a) => (
            <div key={a.caseId} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-bold text-slate-800">
                  {a.title}{" "}
                  <span className="ml-1 whitespace-nowrap rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{a.tag}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{a.desc}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden font-mono text-[10px] font-semibold text-amber-700 xl:block">{a.caseId}</span>
                <button onClick={openDocket(a.caseId)} className="inline-flex items-center gap-1 rounded-lg bg-[#0B2A5B] px-2.5 py-1.5 text-[11px] font-bold text-white">
                  Review <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PortalCard>
          <h2 className="text-sm font-bold text-[#0B1F44]">Cases by Workflow Stage</h2>
          <p className="mt-0.5 text-right text-[11px] text-slate-400">Total: {dockets.length} dockets</p>
          <div className="mt-3 space-y-3">
            {stages.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">{s.label}</span>
                  <span className="font-semibold text-slate-500">{s.count}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">Workflow strictly gated by statutory verification</p>
        </PortalCard>
        <PortalCard>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0B1F44]">Compensation &amp; Field Status Overview</h2>
            <span className="hidden text-[10px] text-slate-400 sm:block">RFCTLARR &amp; NH Act Compliance</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {compensationTotals.map((r) => (
              <div key={r.l} className="rounded-lg bg-slate-900 p-3 text-white">
                <p className="text-xs font-semibold">{r.l}</p>
                <p className="text-[11px] text-slate-400">{r.s}</p>
                <p className="mt-1 text-right font-mono text-sm font-bold text-emerald-400">{r.v}</p>
              </div>
            ))}
          </div>
        </PortalCard>
      </div>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-bold text-[#0B1F44]">Recent Decisions &amp; Quasi-Judicial Orders</h2><p className="text-[11px] text-slate-500">Decisions signed by Competent Authority / District Magistrate</p></div>
          <button onClick={() => navigate({ to: "/approver/audit" })} className="w-fit text-xs font-bold text-amber-700 hover:text-amber-900">View Complete Audit Trail →</button>
        </div>
        <TableShell minWidth="min-w-[820px]">
          <thead><tr><Th>Case ID</Th><Th>Project</Th><Th>Decision</Th><Th>Date</Th><Th>Authority</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {recentDecisions.map(([c, p, d, dt, a]) => (
              <tr key={c} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-amber-700">{c}</Td>
                <Td className="text-slate-600">{p}</Td>
                <Td><StatusPill s={d} /></Td>
                <Td className="font-mono text-slate-500">{dt}</Td>
                <Td className="text-slate-600">{a}</Td>
                <Td className="text-right"><button onClick={openDocket(c)} className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Inspect Docket</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
