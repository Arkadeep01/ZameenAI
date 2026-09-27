import React from "react";
import type { AcquisitionCase } from "../../../services/acquisition";

interface AcquisitionProgressCardProps {
  acquisitionCase: AcquisitionCase;
}

export const AcquisitionProgressCard: React.FC<AcquisitionProgressCardProps> = ({
  acquisitionCase,
}) => {
  const totalStages = acquisitionCase.stages.length;
  const completedStages = acquisitionCase.stages.filter(
    (s) => s.status === "COMPLETED"
  ).length;

  const currentStage = acquisitionCase.stages.find(
    (s) => s.status === "CURRENT"
  );

  const progressPercentage = Math.round(
    (completedStages / (totalStages || 1)) * 100
  );

  return (
    <section
      aria-labelledby="acquisition-progress-heading"
      className="rounded-xl border border-[#D9E2EC] bg-white p-4 sm:p-5 shadow-xs space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="acquisition-progress-heading"
          className="text-xs font-bold uppercase tracking-wider text-[#64748B]"
        >
          ACQUISITION PROGRESS
        </h3>
        <span className="text-sm sm:text-base font-bold text-[#062B52]">
          {completedStages} of {totalStages} stages completed
        </span>
      </div>

      {/* Clean, Simple Progress Bar (No Analytics Gimmicks) */}
      <div
        role="progressbar"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Acquisition progress: ${completedStages} of ${totalStages} stages completed`}
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-[#1261A8] transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Compact Secondary Metadata Row */}
      <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-4 text-xs text-slate-500 pt-0.5">
        <div>
          Current stage:{" "}
          <strong className="text-[#062B52] font-semibold">
            {currentStage?.title || acquisitionCase.currentStageName}
          </strong>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Started: <strong className="text-slate-700">{acquisitionCase.startDate}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Last updated: <strong className="text-slate-700">{acquisitionCase.lastUpdated}</strong>
          </span>
        </div>
      </div>
    </section>
  );
};

export default AcquisitionProgressCard;
