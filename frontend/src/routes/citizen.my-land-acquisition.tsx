import React, { useState, useMemo } from "react";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import Breadcrumbs from "../components/common/Breadcrumbs";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";
import {
  CircleHelp,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* SERVICES & TYPES                                                           */
/* -------------------------------------------------------------------------- */
import {
  useCitizenAcquisitionCases,
} from "../services/acquisition";
import { useCitizenLand } from "../services/citizen";

/* -------------------------------------------------------------------------- */
/* CITIZEN ACQUISITION COMPONENTS                                             */
/* -------------------------------------------------------------------------- */
import MyAcquisitionOverview from "../components/citizen/my-acquisition/MyAcquisitionOverview";
import MyAcquisitionPriorityAlert, {
  type PendingAcquisitionAction,
} from "../components/citizen/my-acquisition/MyAcquisitionPriorityAlert";
import MyAcquisitionCaseCard from "../components/citizen/my-acquisition/MyAcquisitionCaseCard";
import MyAcquisitionMapPreview from "../components/citizen/my-acquisition/MyAcquisitionMapPreview";
import MyAcquisitionRecentUpdates from "../components/citizen/my-acquisition/MyAcquisitionRecentUpdates";
import MyAcquisitionDocuments from "../components/citizen/my-acquisition/MyAcquisitionDocuments";
import MyAcquisitionEmptyState from "../components/citizen/my-acquisition/MyAcquisitionEmptyState";

/* -------------------------------------------------------------------------- */
/* ROUTE DEFINITION                                                           */
/* -------------------------------------------------------------------------- */
export const Route = createFileRoute("/citizen/my-land-acquisition")({
  component: MyLandAcquisitionPage,
});

type FilterStatus = "ALL" | "IN_PROGRESS" | "ACTION_REQUIRED" | "COMPLETED";

export function MyLandAcquisitionPage() {
  const location = useLocation();
  const isLandServicesRoute =
    location.pathname.includes("/acquisition") &&
    !location.pathname.includes("/my-land-acquisition");

  const {
    data: cases = [],
    isLoading: isLoadingCases,
    isError: isCasesError,
    refetch,
  } = useCitizenAcquisitionCases();

  const { data: landSummary, isLoading: isLoadingLand } = useCitizenLand();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");

  // Summary counts computed dynamically from actual data
  const totalParcelsCount = landSummary?.totalParcels ?? (cases.length > 0 ? cases.length + 1 : 0);
  const underAcquisitionCount = cases.length;
  const completedCount = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.statusLabel.toUpperCase().includes("COMPLETED") ||
          c.stages.every((s) => s.status === "COMPLETED"),
      ).length,
    [cases],
  );
  const actionRequiredCount = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.statusLabel.toUpperCase().includes("ACTION") ||
          c.stages.some(
            (s) => s.status === "ACTION_REQUIRED" || s.citizenAction,
          ),
      ).length,
    [cases],
  );

  // Extract primary pending action if any exists
  const primaryPendingAction: PendingAcquisitionAction | null = useMemo(() => {
    for (const c of cases) {
      for (const stg of c.stages || []) {
        if (stg.citizenAction) {
          return {
            title: stg.citizenAction.description || "Compensation verification is pending for:",
            khasraNumber: c.khasraNumber,
            projectTitle: c.projectTitle,
            actionUrl: stg.citizenAction.actionUrl || "/citizen/compensation",
            buttonText: stg.citizenAction.buttonText || "Review Now",
            deadline: stg.citizenAction.deadline,
          };
        }
      }
    }
    return null;
  }, [cases]);

  // Filtered cases list based on search and tab filter
  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // 1. Text Search matching Khasra, Case ID, or Project
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.khasraNumber.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.projectTitle.toLowerCase().includes(query) ||
        item.village.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // 2. Filter Status matching
      const normStatus = (item.statusLabel || "").toUpperCase();
      const hasAction =
        normStatus.includes("ACTION") ||
        item.stages.some(
          (s) => s.status === "ACTION_REQUIRED" || s.citizenAction,
        );
      const isCompleted =
        normStatus.includes("COMPLETED") ||
        item.stages.every((s) => s.status === "COMPLETED");

      if (activeFilter === "ACTION_REQUIRED") return hasAction;
      if (activeFilter === "COMPLETED") return isCompleted;
      if (activeFilter === "IN_PROGRESS") return !isCompleted && !hasAction;

      return true;
    });
  }, [cases, searchQuery, activeFilter]);

  // Error state
  if (isCasesError) {
    return (
      <main
        id="main-content"
        className="w-full min-w-0 bg-[#F4F8FB] px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        aria-label="Error loading acquisition data"
      >
        <div className="w-full rounded-xl border border-red-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-[#062B52]">
            Unable to load acquisition information.
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Please check your network connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#062B52] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0C396E]"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      </main>
    );
  }

  // Loading skeleton state
  if (isLoadingCases && isLoadingLand) {
    return (
      <main
        id="main-content"
        className="w-full min-w-0 bg-[#F4F8FB] px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        aria-busy="true"
        aria-label="Loading My Land Acquisition"
      >
        <div className="w-full space-y-6 animate-pulse">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-16 w-full rounded-xl bg-white border border-[#D9E2EC]" />
          <div className="h-28 w-full rounded-xl bg-white border border-[#D9E2EC]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-44 w-full rounded-xl bg-white border border-[#D9E2EC]" />
              <div className="h-44 w-full rounded-xl bg-white border border-[#D9E2EC]" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="h-64 w-full rounded-xl bg-white border border-[#D9E2EC]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="w-full min-w-0 bg-[#F4F8FB] px-4 py-5 text-[#062B52] sm:px-6 sm:py-6 lg:px-8 select-text"
      aria-label="My Land Acquisition Portal"
    >
      <div className="w-full space-y-5">
        {/* ================================================================ */}
        {/* BREADCRUMB & PAGE HEADER                                         */}
        {/* ================================================================ */}
        <header className="space-y-1.5">
          <Breadcrumbs
            items={
              isLandServicesRoute
                ? citizenCrumbs("/citizen/acquisition")
                : citizenCrumbs("/citizen/my-land-acquisition")
            }
            className="mb-2"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#062B52]">
                MY LAND ACQUISITION
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Track government acquisition activity affecting your land.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/citizen/support"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#062B52] shadow-xs transition-colors hover:bg-slate-50 hover:text-[#1261A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Help with land acquisition"
              >
                <CircleHelp size={16} className="text-[#1261A8]" />
                <span>Help</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ================================================================ */}
        {/* TOP SUMMARY: CITIZEN ACQUISITION OVERVIEW                        */}
        {/* ================================================================ */}
        <MyAcquisitionOverview
          totalParcels={totalParcelsCount}
          underAcquisition={underAcquisitionCount}
          completed={completedCount}
          actionRequired={actionRequiredCount}
          hasCases={cases.length > 0}
        />

        {/* ================================================================ */}
        {/* PRIORITY ACTION / YOU'RE ALL CAUGHT UP                           */}
        {/* ================================================================ */}
        {cases.length > 0 && (
          <MyAcquisitionPriorityAlert pendingAction={primaryPendingAction} />
        )}

        {/* ================================================================ */}
        {/* MAIN CONTENT GRID (DESKTOP: 2-COLUMN, MOBILE: 1-COLUMN)          */}
        {/* ================================================================ */}
        {cases.length === 0 ? (
          <MyAcquisitionEmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ------------------------------------------------------------ */}
            {/* LEFT / MAIN COLUMN: CASES LIST (8 COLS ON DESKTOP)           */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-8 space-y-5">
              <section
                aria-label="My Acquisition Cases"
                className="space-y-4"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#062B52]">
                      MY ACQUISITION CASES
                    </h2>
                    <p className="text-xs text-slate-500">
                      Land acquisition cases linked to your registered land.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 self-start sm:self-auto">
                    Showing {filteredCases.length} of {cases.length} {cases.length === 1 ? "case" : "cases"}
                  </span>
                </div>

                {/* Search Bar & Case Filters */}
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by Khasra, Case ID, or Project name..."
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#1261A8] focus:outline-none focus:ring-2 focus:ring-sky-100 transition-colors"
                      aria-label="Search my acquisition cases"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs (Horizontal scroll on mobile, flex on desktop) */}
                  <div
                    role="tablist"
                    aria-label="Filter cases by status"
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFilter === "ALL"}
                      onClick={() => setActiveFilter("ALL")}
                      className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        activeFilter === "ALL"
                          ? "bg-[#062B52] text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      All ({cases.length})
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFilter === "IN_PROGRESS"}
                      onClick={() => setActiveFilter("IN_PROGRESS")}
                      className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        activeFilter === "IN_PROGRESS"
                          ? "bg-[#1261A8] text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      In Progress ({cases.filter((c) => !c.statusLabel.toUpperCase().includes("COMPLETED") && !c.stages.some((s) => s.status === "ACTION_REQUIRED" || s.citizenAction)).length})
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFilter === "ACTION_REQUIRED"}
                      onClick={() => setActiveFilter("ACTION_REQUIRED")}
                      className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        activeFilter === "ACTION_REQUIRED"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Action Required ({actionRequiredCount})
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFilter === "COMPLETED"}
                      onClick={() => setActiveFilter("COMPLETED")}
                      className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        activeFilter === "COMPLETED"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Completed ({completedCount})
                    </button>
                  </div>
                </div>

                {/* Case Cards List */}
                <div className="space-y-4 pt-1">
                  {filteredCases.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="text-xs font-bold text-slate-700">
                        No acquisition cases match the selected filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveFilter("ALL");
                        }}
                        className="mt-3 text-xs font-semibold text-[#1261A8] hover:underline"
                      >
                        Reset search &amp; filters
                      </button>
                    </div>
                  ) : (
                    filteredCases.map((caseItem) => (
                      <MyAcquisitionCaseCard
                        key={caseItem.id}
                        caseItem={caseItem}
                      />
                    ))
                  )}
                </div>
              </section>

              {/* Mobile-only secondary stack ordering: Recent Updates & Documents appear before Map on mobile */}
              <div className="block lg:hidden space-y-5 pt-2">
                <MyAcquisitionRecentUpdates cases={cases} />
                <MyAcquisitionDocuments cases={cases} />
                <MyAcquisitionMapPreview cases={cases} />
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT COLUMN: MAP PREVIEW, UPDATES, DOCUMENTS (DESKTOP ONLY) */}
            {/* ------------------------------------------------------------ */}
            <div className="hidden lg:block lg:col-span-4 space-y-5">
              <MyAcquisitionMapPreview cases={cases} />
              <MyAcquisitionRecentUpdates cases={cases} />
              <MyAcquisitionDocuments cases={cases} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default MyLandAcquisitionPage;
