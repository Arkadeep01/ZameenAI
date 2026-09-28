import React from "react";
import { Calendar } from "lucide-react";
import { CitizenProfile } from "../../../services/citizen";

interface CitizenWelcomeProps {
  profile?: CitizenProfile;
  totalParcels: number;
  underAcquisition: number;
  isLoading?: boolean;
}

export const CitizenWelcome: React.FC<CitizenWelcomeProps> = ({
  profile,
  totalParcels,
  underAcquisition,
  isLoading,
}) => {
  // Determine time-appropriate greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  const citizenName = profile?.name || "Citizen";

  if (isLoading) {
    return (
      <div className="w-full rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded bg-slate-200" />
            <div className="h-4 w-80 rounded bg-slate-100" />
            <div className="h-3 w-48 rounded bg-slate-100" />
          </div>
          <div className="flex gap-4">
            <div className="h-14 w-28 rounded-lg bg-slate-100" />
            <div className="h-14 w-32 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Citizen Identity and Status"
      className="w-full rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Greeting, status, and verification */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#062B52]">
            {greeting}, {citizenName}
          </h1>
          <p className="text-sm text-[#607089]">
            Your land and acquisition information is up to date.
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs text-[#607089]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#16855B]">
              <span className="h-2 w-2 rounded-full bg-[#16855B]" aria-hidden="true" />
              Identity Verified
            </span>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Calendar size={13} className="text-slate-400" aria-hidden="true" />
              Last updated: 26 Sep 2026
            </span>
            {profile?.village && (
              <>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="text-slate-500">
                  {profile.village}, {profile.district}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Compact Contextual Summary Chips */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <div className="flex flex-col items-center justify-center rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-4 py-2 text-center min-w-[105px]">
            <span className="text-lg font-bold text-[#062B52]">
              {totalParcels}
            </span>
            <span className="text-[11px] font-medium text-[#607089]">
              Land Parcel{totalParcels !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-4 py-2 text-center min-w-[125px]">
            <span className="text-lg font-bold text-[#1261A8]">
              {underAcquisition}
            </span>
            <span className="text-[11px] font-medium text-[#607089]">
              Active Acquisition Case{underAcquisition !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CitizenWelcome;
