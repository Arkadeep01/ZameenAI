import { type ReactNode, useEffect, useMemo, useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Gavel,
  Landmark,
  Layers3,
  MapPin,
  MapPinned,
  Search,
  ShieldCheck,
} from "lucide-react";

import CitizenGISMap from "../components/gis/CitizenGISMap";
import ParcelDetailSheet from "../components/gis/ParcelDetailSheet";
import ParcelSelector from "../components/gis/ParcelSelector";

import { gisParcels, selectedGISParcel } from "../utils/gisMockData";

import type { Parcel } from "../types/gis";

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

  /* ====================================================================== */
  /* SELECTED PARCEL                                                        */
  /* ====================================================================== */

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(() => {
    if (cleanParcelId) {
      const match = gisParcels.find((p) => p.id === cleanParcelId);
      if (match) return match;
    }
    return selectedGISParcel ?? gisParcels[0] ?? null;
  });

  /* ====================================================================== */
  /* LOAD PARCEL FROM URL                                                   */
  /* ====================================================================== */

  useEffect(() => {
    if (!cleanParcelId) {
      return;
    }

    const parcel = gisParcels.find((item) => item.id === cleanParcelId);

    if (parcel) {
      setSelectedParcel(parcel);
    }
  }, [cleanParcelId]);

  /* ====================================================================== */
  /* SEARCH                                                                 */
  /* ====================================================================== */

  const [search, setSearch] = useState("");

  const filteredParcels = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return gisParcels;
    }

    return gisParcels.filter((parcel) => {
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
  }, [search]);

  /* ====================================================================== */
  /* SELECT PARCEL                                                          */
  /* ====================================================================== */

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

  /* ====================================================================== */
  /* RENDER                                                                 */
  /* ====================================================================== */

  return (
    <div className="min-h-screen w-full bg-[#f5f8fa] text-slate-800">
      <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        {/* ================================================================= */}
        {/* BREADCRUMB                                                        */}
        {/* ================================================================= */}

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate({ to: "/citizen/my-land" })}
              className="font-medium text-slate-500 transition hover:text-[#123f5c]"
            >
              My Land
            </button>

            <span className="text-slate-300">/</span>

            <span className="font-semibold text-[#123f5c]">My Land Map</span>

            {selectedParcel && (
              <>
                <span className="text-slate-300">/</span>

                <span className="rounded-md bg-[#e5f2f8] px-2 py-1 font-semibold text-[#174b69]">
                  Parcel {selectedParcel.id}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} />
            Live Spatial Registry 2026
          </div>
        </div>

        {/* ================================================================= */}
        {/* HERO HEADER CARD                                                  */}
        {/* ================================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#123f5c] text-white shadow-sm sm:h-14 sm:w-14">
                  <MapPinned size={26} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[#173c56] sm:text-3xl">
                      My Land Map
                    </h1>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={13} />
                      Official Revenue Cadastre
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm text-slate-500">
                    See where your land is located on the map with complete
                    boundary transparency.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {selectedParcel && (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f0f7fa] px-2.5 py-1.5 text-xs font-semibold text-[#174b69]">
                          <MapPin size={13} />
                          {selectedParcel.village}, {selectedParcel.district}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                          Survey No. {selectedParcel.surveyNumber}
                        </span>
                      </>
                    )}

                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e5f3fb] px-2.5 py-1.5 text-xs font-semibold text-[#174b69]">
                      <Layers3 size={13} />
                      Haripur Village (3 Registered Parcels)
                    </span>
                  </div>
                </div>
              </div>

              {/* SEARCH & QUICK ACTION */}

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center lg:shrink-0">
                <div className="flex min-w-[240px] items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2 text-xs sm:text-sm text-[#173b55] focus-within:border-[#123f5c] focus-within:bg-white">
                  <Search size={16} className="shrink-0 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search Khasra 342/2..."
                    className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm font-medium outline-none placeholder:text-slate-400"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      ×
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
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0c3048] hover:shadow-md"
                  >
                    <FileText size={16} />
                    View Land Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* STATUS SUMMARY BAR                                                */}
        {/* ================================================================= */}

        {selectedParcel && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
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
        {/* ACQUISITION ALERT                                                  */}
        {/* ================================================================= */}

        {isAcquisition && selectedParcel && (
          <section className="mt-4 rounded-xl border border-amber-200 bg-[#fff9ef] shadow-sm">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Gavel size={19} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-amber-900">
                      Acquisition Process Active
                    </h2>

                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Action may be required
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-amber-900/70">
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
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c3048]"
              >
                View Acquisition Status
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* SEARCH MATCHES NOTIFICATION                                       */}
        {/* ================================================================= */}

        {search && (
          <div className="mt-4 rounded-xl border border-sky-100 bg-[#eaf6fc] px-4 py-3 text-xs sm:text-sm text-[#174b69]">
            {filteredParcels.length} matching parcels for "{search}".
          </div>
        )}

        {/* ================================================================= */}
        {/* MAIN 2-COLUMN GRID                                                */}
        {/* ================================================================= */}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          {/* =============================================================== */}
          {/* LEFT COLUMN: MAP + PARCEL SELECTOR                              */}
          {/* =============================================================== */}

          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<MapPinned size={19} />}
                title="Cadastral Map & Boundary View"
                subtitle="Live spatial view & interactive parcel selector"
                badge="Live GIS Linked"
              />

              {/* Leaflet GIS Map Container */}
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <CitizenGISMap
                  parcels={filteredParcels}
                  selectedParcel={selectedParcel}
                  onSelectParcel={handleSelectParcel}
                  className="h-[520px] sm:h-[560px] lg:h-[600px]"
                />
              </div>
            </div>

            {/* Parcel Selector */}
            <ParcelSelector
              parcels={gisParcels}
              selectedParcel={selectedParcel}
              onSelect={handleSelectParcel}
            />
          </section>

          {/* =============================================================== */}
          {/* RIGHT COLUMN: CADASTRAL DETAIL SHEET                            */}
          {/* =============================================================== */}

          <section className="min-w-0">
            {selectedParcel ? (
              <ParcelDetailSheet parcel={selectedParcel} />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
                <div className="text-center">
                  <Search size={32} className="mx-auto text-slate-300" />

                  <p className="mt-3 text-base font-bold text-slate-600">
                    Select a parcel
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Select a coloured parcel on the map.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ================================================================= */}
        {/* FOOTER DISCLAIMER                                                 */}
        {/* ================================================================= */}

        <footer className="mt-8 border-t border-slate-200/80 pt-6 pb-8 text-center text-xs leading-relaxed text-slate-400">
          Records displayed are synchronized with the Revenue Registry. GIS
          boundaries are provided for citizen information and transparency. For
          certified cadastral copies, contact your Tehsil Revenue Office.
        </footer>
      </main>
    </div>
  );
}

/* ========================================================================= */
/* SECTION HEADER                                                             */
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f4f8] text-[#174b69]">
          {icon}
        </div>

        <div>
          <h2 className="text-base font-bold text-[#173c56] sm:text-lg">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {badge && (
        <span className="w-fit rounded-full bg-[#edf7fa] px-2.5 py-1 text-xs font-semibold text-[#174b69]">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ========================================================================= */
/* STAT ITEM                                                                  */
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
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          status === "warning"
            ? "bg-amber-100 text-amber-700"
            : status === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#e8f4f8] text-[#174b69]",
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
                : "text-[#173c56]",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default RouteComponent;
