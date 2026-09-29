import React from "react";
import { Link } from "@tanstack/react-router";
import { Info, ArrowRight, ShieldCheck } from "lucide-react";

interface WhatHappensNextProps {
  currentStage?: string;
  nextStepSummary?: string;
  adviceNote?: string;
  actionUrl?: string;
}

export const WhatHappensNext: React.FC<WhatHappensNextProps> = ({
  currentStage = "Compensation Assessment",
  nextStepSummary = "Once the assessment is finalized, you will receive a notification with the compensation details and payment status.",
  adviceNote = "Ensure your Aadhaar is linked to your active bank account for direct electronic credit via PFMS without office visits.",
  actionUrl = "/citizen/acquisition-status",
}) => {
  return (
    <section
      aria-labelledby="what-happens-next-heading"
      className="flex h-full flex-col justify-between rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-[#D9E2EC] pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EAF3FC] text-[#1261A8]">
              <Info size={16} aria-hidden="true" />
            </div>
            <h2
              id="what-happens-next-heading"
              className="text-lg font-bold tracking-tight text-[#062B52]"
            >
              WHAT HAPPENS NEXT?
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#607089]">
            Plain-language guidance on your current government proceeding
          </p>
        </div>

        {/* Current State Indicator */}
        <div className="rounded-lg bg-[#F6F8FB] p-3.5 border border-[#D9E2EC]">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
            CURRENT IN PROGRESS
          </span>
          <p className="mt-1 text-sm font-bold text-[#062B52]">
            Your compensation assessment is currently in progress.
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Valuation officers are verifying circle rates, solatium factor, and structural assets.
          </p>
        </div>

        {/* Next Step Information */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
              NEXT STEP
            </span>
          </div>

          <p className="text-sm leading-relaxed text-[#062B52] font-medium">
            {nextStepSummary}
          </p>
        </div>

        {/* Reassuring Government Advisory Note */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-[#EAF3FC]/60 p-3 text-xs text-[#062B52]">
          <ShieldCheck size={16} className="text-[#1261A8] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong>Citizen Advisory:</strong> {adviceNote}
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="mt-5 border-t border-[#D9E2EC] pt-4">
        <Link
          to={actionUrl}
          className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#062B52] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1261A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#062B52]"
        >
          <span>View Acquisition Status</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default WhatHappensNext;
