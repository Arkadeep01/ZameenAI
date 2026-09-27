import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, LandPlot, Map, CircleHelp } from "lucide-react";

export const MyAcquisitionEmptyState: React.FC = () => {
  return (
    <div
      aria-label="No Land Acquisition Cases"
      className="rounded-xl border border-slate-200/90 bg-white p-8 sm:p-12 text-center shadow-xs"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-4">
        <ShieldCheck size={28} />
      </div>

      <h2 className="text-base sm:text-lg font-bold text-[#062B52]">
        NO LAND ACQUISITION CASES
      </h2>

      <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-600 leading-relaxed">
        None of your registered land parcels are currently linked to an active government acquisition case. Your land rights and title records remain clear and unaffected.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/citizen/my-land"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#062B52] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#0C396E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <LandPlot size={15} />
          <span>View My Land</span>
        </Link>

        <Link
          to="/citizen/my-land-map"
          search={{ parcel: undefined }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Map size={15} />
          <span>View Land Map</span>
        </Link>

        <Link
          to="/citizen/support"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <CircleHelp size={15} />
          <span>Contact Support</span>
        </Link>
      </div>
    </div>
  );
};

export default MyAcquisitionEmptyState;
