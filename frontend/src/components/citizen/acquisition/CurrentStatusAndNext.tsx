import React from "react";
import { Link } from "@tanstack/react-router";
import StatusBadge from "../../common/StatusBadge";
import {
  ArrowRight,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";
import { AcquisitionCase, AcquisitionStage } from "../../../services/acquisition";

interface CurrentStatusAndNextProps {
  acquisitionCase: AcquisitionCase;
  currentStage?: AcquisitionStage;
}

export const CurrentStatusAndNext: React.FC<CurrentStatusAndNextProps> = ({
  acquisitionCase,
  currentStage,
}) => {
  const currentStageTitle = currentStage?.title || acquisitionCase.currentStageName;
  const lastUpdated = currentStage?.date || acquisitionCase.lastUpdated;
  const hasCitizenAction = !!currentStage?.citizenAction;

  // Find the next upcoming stage from the backend stages array
  const upcomingStages = acquisitionCase.stages.filter(
    (s) => s.status === "UPCOMING"
  );
  const nextStage = upcomingStages[0];

  const scrollToJourney = () => {
    const el = document.getElementById("timeline-heading");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      aria-label="Current Status and Next Step"
      className="grid grid-cols-1 lg:grid-cols-2 gap-5"
    >
      {/* ================================================================== */}
      {/* 1. CURRENT STATUS (Left Column - Most Important Information)       */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-[#1261A8]/30 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden">
        {/* Subtle accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1261A8]" />

        <div className="space-y-3 pt-1">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1261A8]">
              CURRENT STATUS
            </span>
            <StatusBadge status="In Progress" size="md" />
          </div>

          {/* Current Stage Large Text */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#062B52]">
              {currentStageTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              {currentStage?.description ||
                "Your compensation assessment is currently being processed."}
            </p>
          </div>

          {/* Citizen Action Block (if applicable) */}
          {hasCitizenAction && currentStage?.citizenAction ? (
            <div className="rounded-lg border border-amber-300 bg-[#FFFDF8] p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="rounded bg-amber-200/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                  ACTION REQUIRED
                </span>
                {currentStage.citizenAction.deadline && (
                  <span className="text-xs font-semibold text-amber-900">
                    Deadline: {currentStage.citizenAction.deadline}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {currentStage.citizenAction.description}
              </p>
              <div className="pt-0.5">
                <Link
                  to={currentStage.citizenAction.actionUrl || "/citizen/compensation"}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#062B52] px-4 py-2 text-xs font-bold text-white hover:bg-[#1261A8] transition shadow-xs"
                >
                  <span>{currentStage.citizenAction.buttonText || "Review Now"}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-[#F8FCFA] p-3 text-xs text-[#16855B]">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>No action is currently required from you.</span>
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Last updated: <strong className="text-slate-700">{lastUpdated}</strong>
          </span>
          <span className="text-slate-400">Stage {currentStage?.stageNumber || 6} of {acquisitionCase.stages.length}</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. WHAT HAPPENS NEXT? (Right Column)                               */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              WHAT HAPPENS NEXT?
            </span>
            {nextStage && (
              <span className="text-xs font-semibold text-[#1261A8]">
                Stage {nextStage.stageNumber}
              </span>
            )}
          </div>

          {/* Next Stage Title & Explanation */}
          <div>
            <span className="text-xs text-slate-400 font-medium">Next Stage</span>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#062B52]">
              {nextStage ? nextStage.title : "Possession & Corridor Handover"}
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              {currentStage?.whatHappensNext ||
                nextStage?.description ||
                "Once compensation processing is completed, the next stage will be possession and corridor handover."}
            </p>
          </div>

          <div className="rounded-lg bg-[#FAFBFD] border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-[#062B52] block">
              Statutory Protection
            </span>
            <p className="leading-relaxed">
              Under Section 38 of the RFCTLARR Act, physical possession of your land parcel can only be scheduled after complete compensation is disbursed.
            </p>
          </div>
        </div>

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={scrollToJourney}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1261A8] hover:text-[#062B52] transition"
          >
            <span>View Full Journey</span>
            <ArrowDown size={13} />
          </button>

          <Link
            to="/citizen/documents"
            className="text-xs font-semibold text-slate-500 hover:text-[#1261A8] transition"
          >
            Related Notices &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CurrentStatusAndNext;
