import React, { useState, useEffect } from "react";
import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import Breadcrumbs from "../components/common/Breadcrumbs";
import StatusBadge from "../components/common/StatusBadge";
import LandParcelSelector from "../components/common/LandParcelSelector";
import {
  CircleHelp,
  FileText,
  MessageSquareWarning,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* SERVICE & COMPONENTS                                                       */
/* -------------------------------------------------------------------------- */
import {
  useCitizenAcquisitionCases,
  type AcquisitionCase,
} from "../services/acquisition";
import { useCitizenLand } from "../services/citizen";
import { gisParcels } from "../utils/gisMockData";
import type { Parcel } from "../types/gis";

import AcquisitionCaseHeader from "../components/citizen/acquisition/AcquisitionCaseHeader";
import CurrentStatusAndNext from "../components/citizen/acquisition/CurrentStatusAndNext";
import AboutThisLand from "../components/citizen/acquisition/AboutThisLand";
import AcquisitionProgressCard from "../components/citizen/acquisition/AcquisitionProgressCard";
import AcquisitionTimeline from "../components/citizen/acquisition/AcquisitionTimeline";
import AcquisitionEmptyState from "../components/citizen/acquisition/AcquisitionEmptyState";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

/* -------------------------------------------------------------------------- */
/* ROUTE DEFINITION                                                           */
/* -------------------------------------------------------------------------- */

interface AcquisitionStatusSearch {
  case?: string;
  parcel?: string;
}

export const Route = createFileRoute("/citizen/acquisition-status")({
  validateSearch: (
    search: Record<string, unknown>,
  ): AcquisitionStatusSearch => {
    return {
      case: (search.case as string) || undefined,
      parcel: (search.parcel as string) || undefined,
    };
  },
  component: AcquisitionStatusPage,
});

/* -------------------------------------------------------------------------- */
/* MAIN PAGE COMPONENT                                                        */
/* -------------------------------------------------------------------------- */
function AcquisitionStatusPage() {
  const searchParams = useSearch({ from: "/citizen/acquisition-status" });
  const {
    data: cases = [],
    isLoading: isCasesLoading,
    isError,
    refetch,
  } = useCitizenAcquisitionCases();

  const { data: landSummary, isLoading: isLandLoading } = useCitizenLand();
  const availableParcels = landSummary?.parcels || gisParcels;

  // Active selected parcel
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  // Active selected acquisition case state
  const [selectedCase, setSelectedCase] = useState<AcquisitionCase | null>(
    null,
  );

  // Initialize or synchronize selected parcel and case
  useEffect(() => {
    if (availableParcels.length > 0) {
      if (searchParams.parcel) {
        const found = availableParcels.find((p) => p.id === searchParams.parcel);
        if (found) {
          setSelectedParcel(found);
          return;
        }
      }
      if (searchParams.case && cases.length > 0) {
        const foundCase = cases.find((c) => c.id === searchParams.case);
        if (foundCase) {
          const matchingParcel = availableParcels.find((p) =>
            foundCase.khasraNumber.toLowerCase().includes(p.khasraNumber.toLowerCase())
          );
          setSelectedParcel(matchingParcel || availableParcels[0]);
          setSelectedCase(foundCase);
          return;
        }
      }

      // Default meaningful parcel: first under acquisition, or first available
      if (!selectedParcel) {
        const defaultAcq =
          availableParcels.find((p) => p.status === "acquisition") ||
          availableParcels[0];
        setSelectedParcel(defaultAcq);
      }
    }
  }, [availableParcels, cases, searchParams.parcel, searchParams.case]);

  // Update selectedCase whenever selectedParcel changes
  useEffect(() => {
    if (!selectedParcel) {
      setSelectedCase(null);
      return;
    }

    if (cases.length > 0) {
      const cleanKhasra = selectedParcel.khasraNumber.replace(
        /^Khasra No\.\s*/i,
        "",
      );
      const found = cases.find(
        (c) =>
          c.khasraNumber.toLowerCase().includes(cleanKhasra.toLowerCase()) ||
          c.surveyNumber === selectedParcel.cadastralId ||
          c.id === selectedParcel.id,
      );
      setSelectedCase(found || null);
    }
  }, [selectedParcel, cases]);

  const isLoading = isCasesLoading || isLandLoading;

  /* ------------------------------------------------------------------------ */
  /* LOADING SKELETON                                                         */
  /* ------------------------------------------------------------------------ */
  if (isLoading && !selectedParcel) {
    return (
      <div className="w-full min-w-0 bg-[#F4F8FB] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="w-full min-w-0 space-y-5 animate-pulse">
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="h-14 w-full rounded-xl bg-white border border-[#D9E2EC]" />
          <div className="h-28 w-full rounded-xl bg-white border border-[#D9E2EC]" />
          <div className="h-44 w-full rounded-xl bg-white border border-[#D9E2EC]" />
          <div className="h-24 w-full rounded-xl bg-white border border-[#D9E2EC]" />
          <div className="h-96 w-full rounded-xl bg-white border border-[#D9E2EC]" />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ERROR STATE                                                              */
  /* ------------------------------------------------------------------------ */
  if (isError) {
    return (
      <div className="w-full min-w-0 bg-[#F4F8FB] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <AcquisitionEmptyState type="error" onRetry={() => refetch()} />
      </div>
    );
  }

  // Active current stage inside selected case
  const currentStage = selectedCase?.stages.find(
    (s) => s.status === "CURRENT",
  );

  return (
    <div className="w-full min-w-0 bg-[#F4F8FB] text-[#062B52] px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full min-w-0 space-y-5 sm:space-y-6">
        {/* ================================================================== */}
        {/* 1. BREADCRUMB & 2. PAGE HEADER                                     */}
        {/* ================================================================== */}
        <div className="space-y-1">
          <Breadcrumbs
            items={citizenCrumbs("/citizen/acquisition-status")}
            className="mb-2"
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#062B52] sm:text-2xl">
                Acquisition Status
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Track the progress of your land acquisition.
              </p>
            </div>

            {selectedCase && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <StatusBadge
                  status={selectedCase.statusLabel || "In Progress"}
                  size="md"
                />
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* LAND SELECTION CARD (Top of page, below header, above content)     */}
        {/* ================================================================== */}
        <LandParcelSelector
          label="Select Land Parcel"
          helperText="Select a registered land parcel to view its acquisition status."
          selectedParcelId={selectedParcel?.id || null}
          onSelectParcel={(parcel) => setSelectedParcel(parcel)}
          parcels={availableParcels}
          placeholder="Select land parcel"
        />

        {/* ================================================================== */}
        {/* EMPTY STATE: NO PARCEL SELECTED                                    */}
        {/* ================================================================== */}
        {!selectedParcel && (
          <div className="rounded-xl border border-[#D9E2EC] bg-white p-8 text-center shadow-xs">
            <h3 className="text-base font-bold text-[#062B52]">
              Select a land parcel to view acquisition status.
            </h3>
            <p className="mt-1 text-xs text-[#64748B] max-w-md mx-auto">
              Choose a registered land parcel from the dropdown above to display
              its government acquisition case, statutory notices, and progression timeline.
            </p>
          </div>
        )}

        {/* ================================================================== */}
        {/* PARCEL NOT UNDER ACQUISITION                                       */}
        {/* ================================================================== */}
        {selectedParcel && !selectedCase && (
          <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#062B52]">
                    No Acquisition Proceedings for this Parcel
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Safe / Clear
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Parcel{" "}
                  <strong>
                    Khasra{" "}
                    {selectedParcel.khasraNumber.replace(
                      /^Khasra No\.\s*/i,
                      "",
                    )}
                  </strong>{" "}
                  ({selectedParcel.area}{" "}
                  {selectedParcel.areaUnit || "Acre"} in{" "}
                  {selectedParcel.village}
                  {selectedParcel.district ? `, ${selectedParcel.district}` : ""})
                  is verified in the State Cadastre and has no pending or active
                  acquisition notifications under the RFCTLARR Act, 2013.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/citizen/my-land"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#062B52] hover:bg-slate-50 transition"
              >
                <span>View in My Land</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* ACTIVE ACQUISITION CASE CONTENT                                    */}
        {/* ================================================================== */}
        {selectedCase && (
          <>
            {/* 3. CASE HEADER (Clean Horizontal Case Identity Panel) */}
            <AcquisitionCaseHeader
              cases={cases}
              selectedCase={selectedCase}
              onSelectCase={(c) => {
                setSelectedCase(c);
                const matchingParcel = availableParcels.find((p) =>
                  c.khasraNumber.toLowerCase().includes(p.khasraNumber.toLowerCase())
                );
                if (matchingParcel) {
                  setSelectedParcel(matchingParcel);
                }
              }}
            />

            {/* 4. CURRENT STATUS & 5. WHAT HAPPENS NEXT (2-Column Desktop Area) */}
            <CurrentStatusAndNext
              acquisitionCase={selectedCase}
              currentStage={currentStage}
            />

            {/* 7. COMPACT LAND INFORMATION ("ABOUT THIS LAND") */}
            <AboutThisLand acquisitionCase={selectedCase} />

            {/* 9. ACQUISITION PROGRESS */}
            <AcquisitionProgressCard acquisitionCase={selectedCase} />

            {/* 10. YOUR ACQUISITION JOURNEY (Main Scroll-Driven Timeline) */}
            <div className="flex items-start gap-8 pt-1">
              <div className="flex-1 min-w-0">
                <AcquisitionTimeline stages={selectedCase.stages} />
              </div>
            </div>
          </>
        )}
        {/* ================================================================== */}
        {/* BOTTOM HELP & SUPPORT CTA                                          */}
        {/* ================================================================== */}
        <section
          aria-labelledby="acquisition-support-heading"
          className="rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#1261A8]">
                <CircleHelp size={20} />
              </div>
              <div className="space-y-0.5">
                <h3
                  id="acquisition-support-heading"
                  className="text-base font-bold text-[#062B52]"
                >
                  Need help understanding your acquisition status?
                </h3>
                <p className="text-xs text-[#64748B] max-w-xl">
                  Contact your Competent Authority Land Acquisition (CALA)
                  officer, view gazette orders, or submit a dispute redressal
                  request.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to="/citizen/documents"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#062B52] hover:bg-slate-50 transition"
              >
                <FileText size={14} className="text-[#1261A8]" />
                <span>View Documents</span>
              </Link>

              <Link
                to="/citizen/support"
                search={{ tab: "grievance" }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50/50 transition"
              >
                <MessageSquareWarning size={14} className="text-amber-700" />
                <span>Raise a Grievance</span>
              </Link>

              <Link
                to="/citizen/support"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#062B52] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1261A8] transition shadow-xs"
              >
                <span>Contact Support</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
        {/* Official Statutory Footer */}
        <footer className="pt-4 pb-8 border-t border-[#D9E2EC] text-center text-xs text-[#64748B]">
          <p className="font-semibold text-[#062B52]">
            ZameenAI National Land Acquisition &amp; Resettlement Tracking
            System
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Regulated under Right to Fair Compensation and Transparency in Land
            Acquisition, Rehabilitation and Resettlement (RFCTLARR) Act, 2013.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default AcquisitionStatusPage;
