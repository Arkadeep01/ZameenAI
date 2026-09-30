import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleCheck, Search } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { PENDING_FILTER_LABELS } from "../features/approver/approverData";
import { useApprover } from "../features/approver/ApproverStore";
import { FilterSelect, PriPill, StatusPill, TableShell, Td, Th } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver/pending")({
  component: ApproverPending,
});

function ApproverPending() {
  const navigate = useNavigate();
  const { query, setQuery, pending, matches, selectDocket } = useApprover();

  const openDocket = (id: string) => () => {
    selectDocket(id);
    navigate({ to: "/approver/docket" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Pending Review Queue <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-xs font-black text-amber-800">{pending.length} Dockets Waiting</span></h1>
          <p className="mt-1 text-sm text-slate-500">Mandatory quasi-judicial clearance docket. Approvers must inspect evidence before issuing an acquisition award.</p>
        </div>
        <span className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">Strict Rule: One-click direct approval from table is disabled.</span>
      </div>

      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Project Name, or Implementing Agency…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
          {PENDING_FILTER_LABELS.map((label) => (
            <FilterSelect key={label} label={label} />
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <div className="hidden lg:block">
          <TableShell minWidth="min-w-[1200px]">
            <thead>
              <tr>
                <Th>Case ID</Th><Th>Project &amp; PIA</Th><Th>Parcels / Area</Th><Th>LAO Validation</Th>
                <Th>Field Verification</Th><Th>Compensation</Th><Th>Priority</Th><Th>Current Stage</Th>
                <Th>Submitted</Th><Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {pending.filter(matches).map((d) => (
                <tr key={d.id} className="hover:bg-sky-50/40">
                  <Td className="whitespace-nowrap font-mono font-bold text-amber-700">{d.id}</Td>
                  <Td><p className="max-w-[220px] font-semibold text-slate-800">{d.project}</p><p className="max-w-[220px] truncate text-[11px] text-slate-400">{d.agency}</p></Td>
                  <Td><p className="font-semibold">{d.parcels} Plots</p><p className="font-mono text-[11px] text-slate-400">{d.area}</p></Td>
                  <Td><p className="flex items-center gap-1 font-mono font-bold text-slate-700"><CircleCheck size={12} className="text-emerald-600" /> {d.lao}</p><p className="text-[10px] text-slate-400">{d.laoNote}</p></Td>
                  <Td><p className={`font-semibold ${d.field.includes("Certified") ? "text-emerald-700" : "text-amber-700"}`}>{d.field}</p>{d.fieldNote && <p className="text-[10px] text-slate-400">{d.fieldNote}</p>}</Td>
                  <Td><p className={`font-semibold ${d.comp.includes("Approved") ? "text-emerald-700" : d.comp.includes("Return") ? "text-red-600" : "text-amber-700"}`}>{d.comp}</p><p className="font-mono text-[10px] text-slate-400">{d.compNote}</p></Td>
                  <Td><PriPill p={d.priority} /></Td>
                  <Td><p className="font-semibold text-slate-700">{d.stage}</p><p className="text-[10px] text-slate-400">{d.status === "Awaiting Approval" ? "Awaiting Approval" : d.status}</p></Td>
                  <Td className="whitespace-nowrap font-mono text-slate-500">{d.submitted}</Td>
                  <Td className="text-right"><button onClick={openDocket(d.id)} className="whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Review Case →</button></Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {pending.filter(matches).map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-mono text-[11px] font-bold text-amber-700">{d.id}</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{d.project}</p>
              <p className="text-[11px] text-slate-500">{d.parcels} plots · {d.area} · LAO {d.lao} · {d.field}</p>
              <div className="mt-2 flex flex-wrap gap-1.5"><StatusPill s={d.comp} /><PriPill p={d.priority} /></div>
              <button onClick={openDocket(d.id)} className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-white">Review Case →</button>
            </div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}
