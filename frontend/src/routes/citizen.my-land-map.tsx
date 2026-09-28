import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Breadcrumbs from "../components/common/Breadcrumbs";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";
import StatusBadge from "../components/common/StatusBadge";

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Gavel,
  Landmark,
  MapPin,
  MapPinned,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

/* ========================================================================== */
/* COMPONENT IMPORTS                                                          */
/* ========================================================================== */

import CitizenGISMap from "../components/gis/CitizenGISMap";
import ParcelDetailSheet from "../components/gis/ParcelDetailSheet";
import ParcelSelector from "../components/gis/ParcelSelector";

/* ========================================================================== */
/* SERVICE & DATA IMPORTS                                                     */
/* ========================================================================== */

import { useCitizenLand } from "../services/citizen";
import { gisParcels, selectedGISParcel } from "../utils/gisMockData";

/* ========================================================================== */
/* TYPE IMPORTS                                                               */
/* ========================================================================== */

import { Parcel } from "../types/gis";

/* ========================================================================== */
/* ROUTE                                                                      */
/* ========================================================================== */

export const Route = createFileRoute("/citizen/my-land-map")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.parcel === "string" ? search.parcel : undefined;
    return {
      parcel: raw ? raw.replace(/^["']|["']$/g, "").trim() : undefined,
    };
  },

  component: RouteComponent,
});

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

function RouteComponent() {
  const { parcel: parcelId } = Route.useSearch();
  const navigate = useNavigate();

  const cleanParcelId = useMemo(() => {
    return parcelId
      ? String(parcelId)
          .replace(/^["']|["']$/g, "")
          .trim()
      : undefined;
  }, [parcelId]);

  /* ------------------------------------------------------------------------ */
  /* TANSTACK QUERY - REUSED CITIZEN LAND HOOK                                */
  /* ------------------------------------------------------------------------ */

  const { data: landSummary, isLoading, isError, refetch } = useCitizenLand();

  const parcels = landSummary?.parcels ?? gisParcels;

  /* ------------------------------------------------------------------------ */
  /* SELECTED PARCEL STATE                                                    */
  /* ------------------------------------------------------------------------ */

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(() => {
    if (cleanParcelId) {
      const match = parcels.find((p) => String(p.id) === cleanParcelId);
      if (match) return match;
    }
    return selectedGISParcel ?? parcels[0] ?? null;
  });

  /* ------------------------------------------------------------------------ */
  /* SYNC PARCEL FROM URL OR PARCELS LIST                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (cleanParcelId) {
      const parcel = parcels.find((item) => String(item.id) === cleanParcelId);
      if (parcel) {
        setSelectedParcel(parcel);
        return;
      }
    }
    if (!selectedParcel && parcels.length > 0) {
      setSelectedParcel(parcels[0]);
    }
  }, [cleanParcelId, parcels, selectedParcel]);

  /* ------------------------------------------------------------------------ */
  /* SEARCH & FILTER                                                          */
  /* ------------------------------------------------------------------------ */

  const [search, setSearch] = useState("");

  const filteredParcels = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return parcels;
    }

    return parcels.filter((parcel) => {
      const searchableText = [
        parcel.id,
        parcel.khasraNumber,
        parcel.surveyNumber,
        parcel.village,
        parcel.tehsil,
        parcel.district,
        parcel.cadastralId,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [search, parcels]);

  /* ------------------------------------------------------------------------ */
  /* SELECT PARCEL HANDLER                                                    */
  /* ------------------------------------------------------------------------ */

  const handleSelectParcel = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    navigate({
      to: "/citizen/my-land-map",
      search: {
        parcel: String(parcel.id),
      },
      replace: true,
    });
  };

  const isAcquisition = selectedParcel?.status === "acquisition";

  /* ------------------------------------------------------------------------ */
  /* LOADING STATE                                                            */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="w-full min-w-0 bg-[#F4F8FB] text-[#062B52]">
        <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-6">
          <div className="h-6 w-52 rounded bg-slate-200 animate-pulse" />
          <div className="h-36 rounded-2xl border border-slate-200 bg-white p-6 animate-pulse" />
          <div className="h-20 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-[550px] rounded-2xl border border-slate-200 bg-white p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ERROR STATE                                                              */
  /* ------------------------------------------------------------------------ */

  if (isError) {
    return (
      <div className="w-full min-w-0 bg-[#F4F8FB] text-[#062B52]">
        <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-6">
          <section className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
            <h2 className="text-lg font-bold text-red-800">
              Unable to load the land map.
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              There was an issue synchronizing your cadastral geometry from the revenue server. Please try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#062B52] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0c396e]"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </section>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* EMPTY STATE (Section 24)                                                 */
  /* ------------------------------------------------------------------------ */

  if (!parcels || parcels.length === 0) {
    return (
      <div className="w-full min-w-0 bg-[#F4F8FB] text-[#062B52]">
        <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-6">
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
            <MapPinned size={32} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-lg font-bold text-[#062B52]">
              No mapped land parcels found.
            </h2>
            <p className="mt-1 max-w-md mx-auto text-xs sm:text-sm text-slate-500">
              Your land records are available, but a map boundary is not currently available for this cadastre sheet.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/citizen/my-land" })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#062B52] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0c396e]"
            >
              View My Land
            </button>
          </section>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* MAIN RENDER                                                              */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="w-full min-w-0 bg-[#F4F8FB] text-[#062B52]">
      <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-6">
        {/* ================================================================= */}
        {/* BREADCRUMB                                                        */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Breadcrumbs
              items={citizenCrumbs("/citizen/my-land-map")}
              className="min-w-0"
            />

            {selectedParcel && (
              <span className="shrink-0 text-xs font-medium text-slate-500">
                Parcel #{selectedParcel.id}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <CheckCircle2 size={14} />
              Live Spatial Registry 2026
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-600">
              {filteredParcels.length} {filteredParcels.length === 1 ? "Parcel" : "Parcels"} Mapped
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* HERO HEADER CARD (Section 12)                                     */}
        {/* ================================================================= */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF3FC] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1261A8]">
                <MapPinned size={14} />
                <span>Official Revenue Cadastre</span>
              </div>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-[#062B52] sm:text-2xl">
                My Land Map
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-500">
                View your land parcels and boundaries on the map.
              </p>

              {selectedParcel && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    Village: {selectedParcel.village}, {selectedParcel.district}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>Survey No. {selectedParcel.surveyNumber}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-emerald-600">✓ WGS-84 Cadastre Active</span>
                </div>
              )}
            </div>

            {/* MAP SEARCH & ACTIONS (Section 16) */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center lg:shrink-0">
              <div className="relative min-w-[240px] sm:min-w-[280px]">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Survey / Khasra / Parcel ID"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs sm:text-sm text-[#062B52] placeholder:text-slate-400 outline-none transition focus:border-[#062B52] focus:ring-2 focus:ring-[#062B52]/10"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {selectedParcel && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/citizen/land-details",
                      search: {
                        parcel: String(selectedParcel.id),
                      },
                    })
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#062B52] px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#0c396e]"
                >
                  <FileText size={16} />
                  <span className="whitespace-nowrap">View Land Details</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* STATUS SUMMARY BAR                                                */}
        {/* ================================================================= */}
        {selectedParcel && (
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              <StatItem
                icon={<Landmark size={18} />}
                label="Registered Area"
                value={`${selectedParcel.area.toFixed(2)} Acres`}
              />

              <StatItem
                icon={<FileText size={18} />}
                label="Survey Number"
                value={selectedParcel.surveyNumber}
              />

              <StatItem
                icon={<MapPin size={18} />}
                label="Khasra / Dag"
                value={`${selectedParcel.khasraNumber} / ${selectedParcel.id}`}
              />

              <StatItem
                icon={
                  isAcquisition ? (
                    <Gavel size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )
                }
                label="Current Status"
                value={
                  isAcquisition
                    ? "Under Acquisition"
                    : selectedParcel.statusLabel || "Verified"
                }
                status={isAcquisition ? "warning" : "success"}
              />
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* ACQUISITION ALERT                                                 */}
        {/* ================================================================= */}
        {isAcquisition && selectedParcel && (
          <section className="rounded-2xl border border-amber-200 bg-[#fff9ef] p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Gavel size={19} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-amber-900">
                      Acquisition Process Active
                    </h2>

                    <StatusBadge status="Action Required" />
                  </div>

                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-amber-900/80">
                    {selectedParcel.acquisition?.reason ??
                      "This parcel is currently included in an official government land acquisition process."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/citizen/land-details",
                    search: {
                      parcel: String(selectedParcel.id),
                    },
                  })
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                View Acquisition Status
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* MAIN MAP + DETAIL GRID (Section 13, 14, 19, 20)                   */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* =============================================================== */}
          {/* LEFT COLUMN: MAP + PARCEL SELECTOR                              */}
          {/* =============================================================== */}
          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
              <SectionHeader
                icon={<MapPinned size={19} />}
                title="Cadastral Map & Boundary View"
                subtitle="Live spatial view & interactive parcel selector"
                badge="Live GIS Linked"
              />

              {/* Leaflet GIS Map Container (Section 14: 550-650px desktop) */}
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-[#dce7ef]">
                <CitizenGISMap
                  parcels={filteredParcels}
                  selectedParcel={selectedParcel}
                  onSelectParcel={handleSelectParcel}
                  className="h-[420px] sm:h-[500px] lg:h-[580px]"
                />
              </div>
            </div>

            {/* Parcel Selector List (Section 20: synchronized with map) */}
            <ParcelSelector
              parcels={parcels}
              selectedParcel={selectedParcel}
              onSelect={handleSelectParcel}
            />
          </section>

          {/* =============================================================== */}
          {/* RIGHT COLUMN: CADASTRAL DETAIL SHEET (Section 19)               */}
          {/* =============================================================== */}
          <section className="min-w-0">
            {selectedParcel ? (
              <ParcelDetailSheet parcel={selectedParcel} />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-xs">
                <div className="text-center">
                  <Search size={32} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-base font-bold text-slate-600">
                    Select a parcel
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Click any parcel polygon on the map or select from the list.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ================================================================= */}
        {/* CITIZEN PORTAL FOOTER                                              */}
        {/* ================================================================= */}
        <footer className="mt-8 border-t border-slate-200/70 py-6 text-center text-xs leading-relaxed text-slate-400">
          <p>
            ZameenAI National Land Portal • Department of Land Resources (DoLR),
            Ministry of Rural Development.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Records displayed are synchronized with the State Cadastral Registry. For certified
            physical extracts or land disputes, contact your Tehsil Revenue Office.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SECTION HEADER HELPER                                                      */
/* ========================================================================= */

function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#1261A8]">
          {icon}
        </div>

        <div>
          <h2 className="text-base font-bold text-[#062B52] sm:text-lg">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {badge && (
        <span className="w-fit rounded-full bg-[#EAF3FC] px-2.5 py-1 text-xs font-bold text-[#1261A8]">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ========================================================================= */
/* STAT ITEM HELPER                                                           */
/* ========================================================================= */

function StatItem({
  icon,
  label,
  value,
  status,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status?: "success" | "warning";
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          status === "warning"
            ? "bg-amber-100 text-amber-700"
            : status === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#EAF3FC] text-[#1261A8]",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p
          className={[
            "mt-0.5 truncate text-sm font-bold",
            status === "warning"
              ? "text-amber-800"
              : status === "success"
                ? "text-emerald-700"
                : "text-[#062B52]",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default RouteComponent;
