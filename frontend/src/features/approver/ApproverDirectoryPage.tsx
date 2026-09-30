import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PortalCard } from "../../components/portal/PortalLayout";
import { LIST_FILTER_LABELS, type Docket } from "./approverData";
import { useApprover } from "./ApproverStore";
import { CountBadge, DocketTable, FilterSelect } from "./approverUi";

/**
 * Shared screen for the four docket directory views of the original monolith
 * (`all`, `contested`, `stayed`, `approved`). Each remains its own route file;
 * only the identical body is factored out here.
 */
export type DocketDirectoryVariant = "all" | "contested" | "stayed" | "approved";

const COPY: Record<DocketDirectoryVariant, { title: string; subtitle: string }> = {
  all: {
    title: "All Acquisition Dockets",
    subtitle: "Master directory of all land acquisition cases across all stages.",
  },
  contested: {
    title: "Contested Acquisition Dockets",
    subtitle: "Parcels flagged with title disputes, civil court suits, or boundary claims.",
  },
  stayed: {
    title: "Stayed Acquisition Dockets",
    subtitle: "Parcels halted due to interim judicial injunctions from High Court or Tribunals.",
  },
  approved: {
    title: "Approved & Finalized Acquisitions",
    subtitle: "Statutory approvals granted, awards passed, or physical possession certified.",
  },
};

export function ApproverDirectoryPage({ variant }: { variant: DocketDirectoryVariant }) {
  const navigate = useNavigate();
  const { query, setQuery, matches, selectDocket, dockets, contestedList, stayedList, approvedList } = useApprover();

  const source: Docket[] =
    variant === "all" ? dockets : variant === "contested" ? contestedList : variant === "stayed" ? stayedList : approvedList;

  const openDocket = (id: string) => () => {
    selectDocket(id);
    navigate({ to: "/approver/docket" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">
            {COPY[variant].title} <CountBadge n={source.length} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">{COPY[variant].subtitle}</p>
        </div>
        <button onClick={() => navigate({ to: "/approver/pending" })} className="w-fit rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">Go to Pending Reviews</button>
      </div>

      <PortalCard className="!p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case ID, Project, or Agency…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          {LIST_FILTER_LABELS.map((label) => (
            <FilterSelect key={label} label={label} />
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <DocketTable rows={source.filter(matches)} onOpen={openDocket} />
      </PortalCard>
    </>
  );
}
