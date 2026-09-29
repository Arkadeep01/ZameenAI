import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LandPlot, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import type { Parcel } from "../../../types/gis";

interface MyLandSnapshotProps {
  parcels: Parcel[];
  isLoading?: boolean;
}

export const MyLandSnapshot: React.FC<MyLandSnapshotProps> = ({
  parcels,
  isLoading,
}) => {
  const navigate = useNavigate();

  // Show a maximum of 3 on the homepage as requested
  const displayParcels = parcels.slice(0, 3);

  if (isLoading) {
    return (
      <section className="h-full rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-36 rounded bg-slate-200" />
        <div className="h-4 w-52 rounded bg-slate-100" />
        <div className="space-y-3 pt-2">
          <div className="h-24 rounded-lg bg-slate-100" />
          <div className="h-24 rounded-lg bg-slate-100" />
          <div className="h-24 rounded-lg bg-slate-100" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="my-land-snapshot-heading"
      className="flex h-full flex-col justify-between rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-4">
          <div>
            <h2
              id="my-land-snapshot-heading"
              className="text-lg font-bold tracking-tight text-[#062B52]"
            >
              MY LAND
            </h2>
            <p className="mt-0.5 text-xs text-[#607089]">
              Your registered land parcels
            </p>
          </div>
          <span className="rounded-full bg-[#EAF3FC] px-2.5 py-0.5 text-xs font-semibold text-[#1261A8]">
            {parcels.length} Registered
          </span>
        </div>

        {/* Compact Land Rows (Max 3) */}
        <div className="mt-4 space-y-3">
          {displayParcels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <LandPlot className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No land parcels registered yet
              </p>
              <p className="text-xs text-slate-500">
                Contact your tehsil land records office to link your cadastral records.
              </p>
            </div>
          ) : (
            displayParcels.map((parcel, idx) => {
              // Standardize display values
              const khasra =
                parcel.khasraNumber || parcel.surveyNumber || `Khasra ${idx + 1}`;
              const areaText = `${parcel.area || 1.0} ${parcel.areaUnit || "Acre"}`;
              const locationText = `${parcel.village || "Haripur"} • ${parcel.tehsil || parcel.district || "Varanasi"}`;
              const projectText =
                parcel.acquisition?.reason ||
                (parcel.status === "acquisition"
                  ? "National Highway NH-31 Widening Corridor"
                  : parcel.landType || "Agricultural Land (Fasli)");

              // Status badge styling
              const isAcquisition = parcel.status === "acquisition";
              const isSafe = parcel.status === "safe";

              const badgeClass = isAcquisition
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : isSafe
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-blue-50 text-blue-800 border-blue-200";

              const badgeText = isAcquisition
                ? "Under Acquisition"
                : isSafe
                  ? "Registered"
                  : parcel.statusLabel || "Registered";

              return (
                <div
                  key={parcel.id || idx}
                  className="rounded-lg border border-[#D9E2EC] bg-white p-3.5 sm:p-4 transition hover:border-[#1261A8]/40 hover:bg-[#F9FBFE] shadow-2xs"
                >
                  {/* Top row: Khasra number & status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#062B52]">
                      Khasra {khasra.replace(/^Khasra No\.\s*/i, "")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${badgeClass}`}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {/* Middle row: Area & Location */}
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-[#607089]">
                    <MapPin size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
                    <span>
                      {areaText} • {locationText}
                    </span>
                  </div>

                  {/* Project description tag */}
                  <div className="mt-2 text-xs font-medium text-slate-700 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                    {projectText}
                  </div>

                  {/* Bottom row: Action links */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/citizen/land-details",
                          search: { parcel: String(parcel.id) },
                        })
                      }
                      className="font-semibold text-[#1261A8] hover:text-[#062B52] transition inline-flex items-center gap-1 py-1"
                    >
                      <span>View Details</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/citizen/my-land-map",
                          search: { parcel: String(parcel.id) },
                        })
                      }
                      className="font-medium text-slate-600 hover:text-[#1261A8] transition inline-flex items-center gap-1 py-1"
                    >
                      <span>View on Map</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Button: View All My Land */}
      <div className="mt-5 border-t border-[#D9E2EC] pt-4">
        <Link
          to="/citizen/my-land"
          className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-4 py-2.5 text-sm font-semibold text-[#062B52] transition hover:bg-[#EAF3FC] hover:border-[#1261A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
        >
          <span>View All My Land</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default MyLandSnapshot;
