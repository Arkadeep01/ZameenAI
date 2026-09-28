import React from "react";
import type { AcquisitionCase } from "../../../services/acquisition";

interface AboutThisLandProps {
  acquisitionCase: AcquisitionCase;
}

export const AboutThisLand: React.FC<AboutThisLandProps> = ({
  acquisitionCase,
}) => {
  return (
    <section
      aria-labelledby="about-this-land-heading"
      className="rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs space-y-3.5"
    >
      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
        <h3
          id="about-this-land-heading"
          className="text-xs font-bold uppercase tracking-wider text-[#64748B]"
        >
          ABOUT THIS LAND
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">
          Survey: {acquisitionCase.surveyNumber || "CAD-IND-1842"}
        </span>
      </div>

      {/* Horizontal Compact Information Layout (No giant box grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-3 gap-x-4 sm:divide-x sm:divide-slate-200">
        {/* Khasra */}
        <div className="space-y-0.5">
          <span className="block text-[11px] font-semibold uppercase text-slate-400">
            Khasra
          </span>
          <p className="text-sm sm:text-base font-bold text-[#062B52]">
            {acquisitionCase.khasraNumber}
          </p>
        </div>

        {/* Khata */}
        <div className="space-y-0.5 sm:pl-4">
          <span className="block text-[11px] font-semibold uppercase text-slate-400">
            Khata
          </span>
          <p className="text-sm sm:text-base font-bold text-[#062B52]">
            {acquisitionCase.khataNumber || "KH-9912"}
          </p>
        </div>

        {/* Area */}
        <div className="space-y-0.5 sm:pl-4">
          <span className="block text-[11px] font-semibold uppercase text-slate-400">
            Area
          </span>
          <p className="text-sm sm:text-base font-bold text-[#062B52]">
            {acquisitionCase.area}
          </p>
        </div>

        {/* Village */}
        <div className="space-y-0.5 sm:pl-4">
          <span className="block text-[11px] font-semibold uppercase text-slate-400">
            Village
          </span>
          <p className="text-sm sm:text-base font-bold text-[#062B52]">
            {acquisitionCase.village}
          </p>
        </div>

        {/* District */}
        <div className="space-y-0.5 sm:pl-4">
          <span className="block text-[11px] font-semibold uppercase text-slate-400">
            District
          </span>
          <p className="text-sm sm:text-base font-bold text-[#062B52]">
            {acquisitionCase.district}
          </p>
        </div>

        {/* State */}
        <div className="space-y-0.5 sm:pl-4">
          <span className="block text-[11px] font-semibold uppercase text-slate-400">
            State
          </span>
          <p className="text-sm sm:text-base font-bold text-[#062B52]">
            {acquisitionCase.state}
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutThisLand;
