import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { CONFIDENCE_BANDS, LAO, QUEUE_FILTER_LABELS } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { ConfidenceBar, FakeFilterSelect, GovStrip, PriorityPill, QueueStatusPill, TableShell, Td, Th } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/queue")({
  component: DeskValidatorQueue,
});

function DeskValidatorQueue() {
  const navigate = useNavigate();
  const { query, setQuery, confFilter, setConfFilter, filteredQueue, selectCase, resetFilters } = useDeskValidator();

  const open = (caseId: string) => () => {
    selectCase(caseId);
    navigate({ to: "/desk-validator/workspace" });
  };

  const bandLabel = (c: string) => (c === "All" ? "All" : c === "Low" ? "< 75% (Low)" : c === "Mid" ? "75–89%" : "90%+");

  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="LAO Desk Validation Work Queue"
        title="LAO Desk Validation Work Queue"
        subtitle="Primary scrutiny queue for low-confidence AI digitized land records requiring officer verification."
      />
      <p className="mb-3 text-right font-mono text-xs text-slate-500">Showing <span className="font-bold text-slate-800">{filteredQueue.length}</span> matching records</p>

      <PortalCard className="!p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Khasra, Khata, Owner Name, Document ID, Project…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Confidence:</span>
            {CONFIDENCE_BANDS.map((c) => (
              <button key={c} onClick={() => setConfFilter(c)} className={`rounded border px-2.5 py-1.5 ${confFilter === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {bandLabel(c)}
              </button>
            ))}
            <button onClick={resetFilters} className="rounded border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-500">⟳ Reset</button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {QUEUE_FILTER_LABELS.map((f) => (
            <FakeFilterSelect key={f} label={f} />
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[1100px]">
          <thead>
            <tr>
              <Th>Case ID</Th><Th>Document ID</Th><Th>Project</Th><Th>District / Village</Th><Th>Khasra No.</Th>
              <Th>Document Type</Th><Th>AI Confidence</Th><Th>Flagged</Th><Th>Submitted By</Th><Th>Priority</Th><Th>Status</Th><Th>Assigned LAO</Th><Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {filteredQueue.map((r) => (
              <tr key={r.caseId} className="hover:bg-sky-50/40">
                <Td className="font-mono font-bold text-[#0B3B5F]">{r.caseId}</Td>
                <Td className="font-mono text-slate-500">{r.docId}</Td>
                <Td><p className="font-semibold text-slate-700">{r.project.split(" ").slice(0, 2).join(" ")}…</p><p className="text-[11px] text-slate-400">{r.section}</p></Td>
                <Td><p className="font-medium text-slate-700">{r.village}</p><p className="text-[11px] text-slate-400">{r.district}</p></Td>
                <Td><p className="font-bold text-slate-800">{r.khasra}</p><p className="text-[11px] text-slate-400">Khata {r.khata}</p></Td>
                <Td className="max-w-[160px] truncate text-slate-600">{r.docType}</Td>
                <Td><ConfidenceBar value={r.conf} /></Td>
                <Td><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{r.flags} flags</span></Td>
                <Td><p className="font-medium text-slate-600">{r.submittedBy}</p><p className="font-mono text-[10px] text-slate-400">{r.submittedOn}</p></Td>
                <Td><PriorityPill p={r.priority} /></Td>
                <Td><QueueStatusPill status={r.status} /></Td>
                <Td className="font-mono text-slate-500">{LAO.laoCode}</Td>
                <Td><button onClick={open(r.caseId)} className="whitespace-nowrap rounded bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white">Review →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 lg:hidden">
        {filteredQueue.map((r) => (
          <div key={r.caseId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-xs font-bold text-[#0B3B5F]">{r.caseId}</p>
              <PriorityPill p={r.priority} />
            </div>
            <p className="mt-1 text-sm font-bold text-slate-800">{r.project}</p>
            <p className="text-xs text-slate-500">{r.village}, {r.district} · Khasra {r.khasra} · Khata {r.khata}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ConfidenceBar value={r.conf} />
              <QueueStatusPill status={r.status} />
            </div>
            <button onClick={open(r.caseId)} className="mt-3 w-full rounded-lg bg-[#0B2A5B] py-2 text-xs font-bold text-white">Review Case →</button>
          </div>
        ))}
      </div>
    </>
  );
}
