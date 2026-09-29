import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, LandPlot, CircleHelp, RefreshCw, AlertTriangle } from "lucide-react";

interface AcquisitionEmptyStateProps {
  type?: "empty" | "error";
  onRetry?: () => void;
}

export const AcquisitionEmptyState: React.FC<AcquisitionEmptyStateProps> = ({
  type = "empty",
  onRetry,
}) => {
  if (type === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-red-900">
            Unable to load acquisition status
          </h3>
          <p className="text-xs text-red-700 leading-relaxed">
            The revenue server encountered a temporary delay. Please try reloading your record.
          </p>
        </div>
        {onRetry && (
          <div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-900 transition"
            >
              <RefreshCw size={13} />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#D9E2EC] bg-white p-10 text-center space-y-5 max-w-xl mx-auto my-12 shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#16855B]">
        <ShieldCheck size={28} />
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded">
          ALL LAND RECORDS SAFE
        </span>
        <h3 className="text-lg font-bold text-[#062B52]">
          NO ACTIVE ACQUISITION CASE
        </h3>
        <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-md mx-auto">
          No government land acquisition notification under the RFCTLARR Act is currently linked to your registered land parcels.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/citizen/my-land"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#062B52] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1261A8] transition"
        >
          <LandPlot size={15} />
          <span>View My Land</span>
        </Link>

        <Link
          to="/citizen/support"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-5 py-2.5 text-xs font-semibold text-[#062B52] hover:bg-slate-100 transition"
        >
          <CircleHelp size={15} />
          <span>Contact Support</span>
        </Link>
      </div>
    </div>
  );
};

export default AcquisitionEmptyState;
