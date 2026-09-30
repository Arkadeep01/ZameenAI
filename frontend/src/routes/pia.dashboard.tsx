import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import {
  DASHBOARD_TIMELINE,
  actionItems,
  cases,
  kpis,
  pipeline,
  projectShortName,
} from "../features/pia/piaData";
import { PriPill, StagePill, TableShell, Td, Th } from "../features/pia/piaUi";

export const Route = createFileRoute("/pia/dashboard")({
  component: PiaDashboard,
});

function PiaDashboard() {
  const navigate = useNavigate();
  const go = (to: string) => () => navigate({ to });

  return (
    <>
      <GreetingHeader
        eyebrow="Requisition Workspace • NHIDCL RO-IV"
        title="PIA Acquisition Dashboard"
        subtitle="Initiate, manage and monitor land acquisition proposals across your projects."
        actions={
          <>
            <button onClick={go("/pia/gis")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              Open GIS Explorer
            </button>
            <button onClick={go("/pia/proposal")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">
              + Initiate Proposal
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <PortalCard key={k.label} className="!p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${k.tone}`}>{k.value}</span>
            </div>
            <p className="mt-1 text-3xl font-black text-[#0B1F44]">{k.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{k.sub}</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5 border-red-200">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-900"><TriangleAlert size={15} /> Action Required by PIA <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-black">4 ITEMS</span></h2>
          <p className="text-[11px] text-slate-500">Prompt response required to avoid statutory delay</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actionItems.map((a) => (
            <div key={a.caseId + a.title} className="rounded-xl border border-red-200 bg-red-50/50 p-3.5">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold text-slate-800">{a.caseId} <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-white">{a.tag}</span></p>
              <p className="mt-1.5 text-xs font-bold text-slate-800">{a.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{a.desc}</p>
              <p className="mt-1.5 font-mono text-[10px] text-slate-500">{a.meta}</p>
              <button onClick={go("/pia/cases")} className="mt-2.5 w-full rounded-lg bg-slate-900 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700">Respond →</button>
            </div>
          ))}
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <PortalCard>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#0B1F44]">Project Portfolio Land Requisition Pipeline</h2>
              <p className="text-[11px] text-slate-500">Aggregate statutory acquisition progress across 6 major infrastructure projects</p>
            </div>
            <p className="text-right text-xs"><span className="block text-[10px] uppercase tracking-wider text-slate-400">Total Requirement</span><span className="font-mono font-black text-slate-900">2,707.4 Acres</span></p>
          </div>
          <div className="mt-4 space-y-3.5">
            {pipeline.map((p) => (
              <div key={p.label}>
                <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-slate-600">{p.label}</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{p.v}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Direct sync with District Revenue RoR &amp; SLAO Portal</p>
        </PortalCard>

        <PortalCard>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0B1F44]">Authoritative Workflow Updates</h2>
            <span className="text-[11px] text-slate-400">Live Timeline</span>
          </div>
          <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
            {DASHBOARD_TIMELINE.map(([t, d]) => (
              <div key={t}>
                <p className="text-xs font-bold text-slate-800">{t}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <button onClick={go("/pia/workflow")} className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">View Full Audit Timeline</button>
        </PortalCard>
      </div>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-bold text-[#0B1F44]">Active Acquisition Cases</h2><p className="text-[11px] text-slate-500">Current proposals under formulation, validation, and statutory approval</p></div>
          <button onClick={go("/pia/cases")} className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">View All (10)</button>
        </div>
        <TableShell minWidth="min-w-[900px]">
          <thead><tr><Th>Case ID</Th><Th>Project Name</Th><Th>Target Area / Block</Th><Th>Land (Acres)</Th><Th>Parcels</Th><Th>Workflow Stage</Th><Th>Current Owner</Th><Th>Priority</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {cases.slice(0, 6).map((c) => (
              <tr key={c.id} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-emerald-700">{c.id}</Td>
                <Td className="max-w-[180px] truncate font-medium text-slate-700">{projectShortName(c.proj)}</Td>
                <Td className="text-slate-600">{c.dist}</Td>
                <Td className="font-mono font-semibold">{c.area}</Td>
                <Td className="font-mono">{c.parcels}</Td>
                <Td><StagePill stage={c.stage} /></Td>
                <Td className="max-w-[150px] truncate text-slate-500">{c.owner}</Td>
                <Td><PriPill p={c.pri} /></Td>
                <Td className="text-right"><button onClick={go("/pia/workflow")} className="text-[11px] font-bold text-slate-500 hover:text-slate-900">View</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
