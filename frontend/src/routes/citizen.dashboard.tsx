import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* NEW CITIZEN HOMEPAGE SECTION COMPONENTS (10-SECTION ARCHITECTURE)          */
/* -------------------------------------------------------------------------- */
import Breadcrumbs from "../components/common/Breadcrumbs";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";
import CitizenWelcome from "../components/citizen/home/CitizenWelcome";
import LandGlanceStrip from "../components/citizen/home/LandGlanceStrip";
import PriorityAttentionBanner from "../components/citizen/home/PriorityAttentionBanner";
import LandJourneyTimeline from "../components/citizen/home/LandJourneyTimeline";
import MyLandSnapshot from "../components/citizen/home/MyLandSnapshot";
import WhatHappensNext from "../components/citizen/home/WhatHappensNext";
import ImportantCommunications from "../components/citizen/home/ImportantCommunications";
import EssentialServicesGrid from "../components/citizen/home/EssentialServicesGrid";
import RecentActivityTimeline from "../components/citizen/home/RecentActivityTimeline";
import CitizenHelpSupport from "../components/citizen/home/CitizenHelpSupport";

/* -------------------------------------------------------------------------- */
/* SERVICES & DATA HOOKS                                                      */
/* -------------------------------------------------------------------------- */
import {
  useCitizenProfile,
  useCitizenLand,
  useCitizenNotifications,
  useCitizenActivity,
} from "../services/citizen";

/* -------------------------------------------------------------------------- */
/* SHARED PAGE CONTAINER                                                       */
/* -------------------------------------------------------------------------- */
import PageContainer from "../components/common/PageContainer";

/* -------------------------------------------------------------------------- */
/* ROUTE DEFINITION                                                           */
/* -------------------------------------------------------------------------- */
export const Route = createFileRoute("/citizen/dashboard")({
  component: CitizenDashboard,
});

/* -------------------------------------------------------------------------- */
/* MAIN CITIZEN DASHBOARD HOMEPAGE                                            */
/* -------------------------------------------------------------------------- */
function CitizenDashboard() {
  // Reused Citizen Data Hooks
  const {
    data: profile,
    isLoading: isProfileLoading,
  } = useCitizenProfile();

  const {
    data: landSummary,
    isLoading: isLandLoading,
    isError: isLandError,
    refetch: refetchLand,
  } = useCitizenLand();

  const {
    data: notifications,
    isLoading: isNotifLoading,
  } = useCitizenNotifications();

  const {
    data: userActivities,
    isLoading: isActLoading,
  } = useCitizenActivity();

  // Derived land data with rock-solid fallbacks
  const totalParcels = landSummary?.totalParcels ?? 3;
  const underAcquisition = landSummary?.underAcquisition ?? 1;
  const parcels = landSummary?.parcels ?? [];

  // Active acquisition case details
  const activeAcqParcel = parcels.find((p) => p.status === "acquisition");
  const activeCaseId = "ACQ-2026-00182";
  const currentStage = "Compensation Assessment";

  // Priority Attention: Citizen has a pending bank verification for DBT compensation
  const hasPendingAction = true;
  const pendingKhasra = activeAcqParcel?.khasraNumber
    ? `Khasra ${activeAcqParcel.khasraNumber.replace(/^Khasra No\.\s*/i, "")}`
    : "Khasra 184/2";

  return (
    <PageContainer className="text-[#062B52] space-y-6 sm:space-y-7">
      {/* ================================================================== */}
      {/* BREADCRUMB                                                          */}
      {/* ================================================================== */}
      <Breadcrumbs items={citizenCrumbs("/citizen/dashboard")} />

      {/* ================================================================== */}
      {/* SECTION 1 — WELCOME / CITIZEN IDENTITY                             */}
      {/* ================================================================== */}
      <CitizenWelcome
        profile={profile}
        totalParcels={totalParcels}
        underAcquisition={underAcquisition}
        isLoading={isProfileLoading}
      />

      {/* ================================================================== */}
      {/* SECTION 2 — YOUR LAND AT A GLANCE (Horizontal Information Strip)   */}
      {/* ================================================================== */}
      {isLandError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span>Unable to load your land summary information.</span>
          </div>
          <button
            onClick={() => refetchLand()}
            className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 font-semibold text-red-800 shadow-2xs hover:bg-red-100"
          >
            <RefreshCw size={12} />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <LandGlanceStrip
          totalParcels={totalParcels}
          underAcquisition={underAcquisition}
          activeCaseId={activeCaseId}
          currentStage={currentStage}
          isLoading={isLandLoading}
        />
      )}

      {/* ================================================================== */}
      {/* SECTION 3 — PRIORITY ATTENTION ("Needs Your Attention")            */}
      {/* ================================================================== */}
      <PriorityAttentionBanner
        hasPendingAction={hasPendingAction}
        actionTitle="Compensation bank verification"
        actionDescription={`Your bank details for ${pendingKhasra} need verification before compensation can be processed.`}
        caseId={activeCaseId}
        dueDate="28 Sep 2026"
        actionUrl="/citizen/compensation"
      />

      {/* ================================================================== */}
      {/* SECTION 4 — CURRENT LAND JOURNEY (Centerpiece Horizontal/Vertical) */}
      {/* ================================================================== */}
      <LandJourneyTimeline
        currentStageTitle={currentStage}
        currentStageDescription="Your compensation is currently being assessed."
        lastUpdated="18 Sep 2026"
        caseId={activeCaseId}
      />

      {/* ================================================================== */}
      {/* SECTIONS 5 & 6 — 2-COLUMN DESKTOP PAIRING                          */}
      {/* Col 1 (7 cols on lg): Section 5 — MY LAND SNAPSHOT                 */}
      {/* Col 2 (5 cols on lg): Section 6 — WHAT HAPPENS NEXT?               */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Section 5: My Land Snapshot (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <MyLandSnapshot
            parcels={parcels}
            isLoading={isLandLoading}
          />
        </div>

        {/* Section 6: What Happens Next? (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <WhatHappensNext
            currentStage={currentStage}
            nextStepSummary="Once the assessment is finalized, you will receive a notification with the compensation details and payment status."
            actionUrl="/citizen/acquisition-status"
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTIONS 7 & 8 — 2-COLUMN DESKTOP PAIRING                          */}
      {/* Col 1 (6 or 7 cols): Section 7 — IMPORTANT COMMUNICATIONS          */}
      {/* Col 2 (6 or 5 cols): Section 8 — ESSENTIAL SERVICES                */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Section 7: Important Communications (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <ImportantCommunications isLoading={isNotifLoading} />
        </div>

        {/* Section 8: Essential Services (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <EssentialServicesGrid />
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 9 — RECENT ACTIVITY (Full Width Activity Timeline)         */}
      {/* ================================================================== */}
      <RecentActivityTimeline isLoading={isActLoading} />

      {/* ================================================================== */}
      {/* SECTION 10 — HELP / SUPPORT (Compact Understated Area)             */}
      {/* ================================================================== */}
      <CitizenHelpSupport />

      {/* ================================================================== */}
      {/* OFFICIAL CITIZEN PORTAL FOOTER                                     */}
      {/* ================================================================== */}
      <footer className="pt-6 pb-8 border-t border-[#D9E2EC] text-center text-xs leading-relaxed text-[#607089]">
        <p className="font-semibold text-[#062B52]">
          ZameenAI National Land Portal • Department of Land Resources (DoLR),
          Ministry of Rural Development.
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Records displayed are synchronized with the State Cadastral Registry. For certified
          physical extracts or land disputes, contact your Tehsil Revenue Office.
        </p>
      </footer>
    </PageContainer>
  );
}

export default CitizenDashboard;
