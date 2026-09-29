import React from "react";
import { LandPlot, AlertCircle, FileSpreadsheet, Activity } from "lucide-react";

interface LandGlanceStripProps {
  totalParcels: number;
  underAcquisition: number;
  activeCaseId?: string;
  currentStage?: string;
  isLoading?: boolean;
}

export const LandGlanceStrip: React.FC<LandGlanceStripProps> = ({
  totalParcels,
  underAcquisition,
  activeCaseId = "ACQ-2026-00182",
  currentStage = "Compensation Assessment",
  isLoading,
}) => {
  if (isLoading) {
    return (
      <section className="w-full space-y-2">
        <div className="h-4 w-44 rounded bg-slate-200 animate-pulse" />
        <div className="h-20 w-full rounded-xl border border-[#D9E2EC] bg-white animate-pulse" />
      </section>
    );
  }

  // Format numbers to two digits (e.g. "03 registered")
  const formattedTotal = `${String(totalParcels).padStart(2, "0")} registered`;
  const formattedAffected = `${String(underAcquisition).padStart(2, "0")} under acquisition`;

  return (
    <section aria-labelledby="land-glance-heading" className="w-full space-y-2.5">
      <h2
        id="land-glance-heading"
        className="text-xs font-bold uppercase tracking-wider text-[#607089]"
      >
        Your Land at a Glance
      </h2>

      {/* Connected horizontal information strip */}
      <div className="overflow-hidden rounded-xl border border-[#D9E2EC] bg-white shadow-xs">
        <div className="grid grid-cols-1 divide-y divide-[#D9E2EC] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {/* Block 1: Land Parcels */}
          <div className="flex items-start gap-3.5 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#1261A8]">
              <LandPlot size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                Land Parcels
              </span>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-[#062B52]">
                {formattedTotal}
              </p>
              <span className="text-[11px] text-slate-500">
                In official state registry
              </span>
            </div>
          </div>

          {/* Block 2: Affected Parcels */}
          <div className="flex items-start gap-3.5 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <AlertCircle size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                Affected
              </span>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-[#062B52]">
                {formattedAffected}
              </p>
              <span className="text-[11px] text-amber-700 font-medium">
                Notified under RFCTLARR
              </span>
            </div>
          </div>

          {/* Block 3: Active Case */}
          <div className="flex items-start gap-3.5 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileSpreadsheet size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                Active Case
              </span>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-[#062B52]">
                {activeCaseId}
              </p>
              <span className="text-[11px] text-slate-500">
                NH-31 Highway Widening
              </span>
            </div>
          </div>

          {/* Block 4: Current Stage */}
          <div className="flex items-start gap-3.5 p-4 sm:p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#16855B]">
              <Activity size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#607089]">
                Current Stage
              </span>
              <p className="mt-0.5 text-base sm:text-lg font-bold text-[#062B52]">
                {currentStage}
              </p>
              <span className="text-[11px] text-[#16855B] font-medium">
                Stage 4 of 6 · Valuation Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandGlanceStrip;
