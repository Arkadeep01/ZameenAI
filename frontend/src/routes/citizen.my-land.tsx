import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Breadcrumbs from "../components/common/Breadcrumbs";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

import {
  CheckCircle2,
  Compass,
  Download,
  Grid2X2,
  LandPlot,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

/* ========================================================================== */
/* COMPONENT IMPORTS                                                          */
/* ========================================================================== */

import CitizenGISMap from "../components/gis/CitizenGISMap";
import ParcelCard from "../components/gis/ParcelCard";
import ServiceCard from "../components/gis/ServiceCard";
import StatCard from "../components/gis/StatCard";

/* ========================================================================== */
/* SERVICE & DATA IMPORTS                                                     */
/* ========================================================================== */

import { useCitizenLand } from "../services/citizen";
import { citizenInfo, gisParcels } from "../utils/gisMockData";

/* ========================================================================== */
/* TYPE IMPORTS                                                               */
/* ========================================================================== */

import { Parcel } from "../types/gis";

/* ========================================================================== */
/* ROUTE                                                                      */
/* ========================================================================== */

export const Route = createFileRoute("/citizen/my-land")({
  component: RouteComponent,
});

/* ========================================================================== */
/* PAGE COMPONENT                                                             */
/* ========================================================================== */

function RouteComponent() {
  const navigate = useNavigate();

  /* ------------------------------------------------------------------------ */
  /* TANSTACK QUERY - REUSED CITIZEN LAND HOOK                                */
  /* ------------------------------------------------------------------------ */

  const { data: landSummary, isLoading, isError, refetch } = useCitizenLand();

  const parcels = landSummary?.parcels ?? gisParcels;

  /* ------------------------------------------------------------------------ */
  /* STATE                                                                    */
  /* ------------------------------------------------------------------------ */

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedParcel && parcels.length > 0) {
      setSelectedParcel(parcels[0]);
    }
  }, [parcels, selectedParcel]);

  /* ------------------------------------------------------------------------ */
  /* FILTERED PARCELS                                                         */
  /* ------------------------------------------------------------------------ */

  const filteredParcels = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return parcels;
    }

    return parcels.filter((parcel: Parcel) => {
      const searchableValues = [
        parcel.id,
        parcel.cadastralId,
        parcel.surveyNumber,
        parcel.khasraNumber,
        parcel.plotNumber,
        parcel.dagNumber,
        parcel.village,
        parcel.tehsil,
        parcel.district,
        parcel.state,
        parcel.landType,
        parcel.statusLabel,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [search, parcels]);

  /* ------------------------------------------------------------------------ */
  /* NAVIGATION HANDLERS                                                      */
  /* ------------------------------------------------------------------------ */

  const handleSelectParcel = (parcel: Parcel) => {
    setSelectedParcel(parcel);
  };

  const handleViewMap = (parcel: Parcel) => {
    navigate({
      to: "/citizen/my-land-map",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  const handleViewDetails = (parcel: Parcel) => {
    navigate({
      to: "/citizen/land-details",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  /* ------------------------------------------------------------------------ */
  /* PAGE RENDER                                                              */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="w-full min-w-0 bg-[#F4F8FB] text-[#062B52]">
      <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-6">
        {/* ================================================================== */}
        {/* BREADCRUMB                                                         */}
        {/* ================================================================== */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={citizenCrumbs("/citizen/my-land")}
            className="min-w-0"
          />

          <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <ShieldCheck size={14} />
              RoR Cadastre Verified
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-600">
              {filteredParcels.length} {filteredParcels.length === 1 ? "Parcel" : "Parcels"} Available
            </span>
          </div>
        </div>

        {/* ================================================================== */}
        {/* HERO HEADER CARD                                                   */}
        {/* ================================================================== */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF3FC] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1261A8]">
                <ShieldCheck size={14} />
                <span>RoR Citizen Identity</span>
              </div>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-[#062B52] sm:text-2xl">
                My Land
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-500">
                View and manage your registered land parcels.
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  Primary Holder: {citizenInfo.name}
                </span>
                <span className="text-slate-300">•</span>
                <span>Village: {citizenInfo.village}</span>
                <span className="text-slate-300">•</span>
                <span>Tehsil: {citizenInfo.tehsil}</span>
                <span className="text-slate-300">•</span>
                <span>District: {citizenInfo.district}</span>
              </div>
            </div>

            {/* Revenue Authority Badge */}
            <div className="flex w-full items-center gap-3 rounded-xl border border-sky-100 bg-[#f6fbfe] p-3 transition-all duration-200 hover:border-sky-200 hover:bg-[#f0faff] sm:w-auto sm:min-w-[220px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1261A8]">
                <LandPlot size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  REVENUE AUTHORITY
                </p>
                <p className="text-sm font-bold text-[#062B52]">
                  Tehsildar Office
                </p>
                <p className="text-xs font-semibold text-emerald-600">
                  ✓ Registry Active &amp; Valid
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SUMMARY STATISTICS                                                 */}
        {/* ================================================================== */}
        {isLoading ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse"
              >
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="mt-3 h-8 w-16 rounded bg-slate-300" />
                <div className="mt-3 h-3 w-36 rounded bg-slate-100" />
              </div>
            ))}
          </section>
        ) : isError || !landSummary ? (
          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
            <p className="text-sm font-semibold text-red-700">
              Unable to load land parcel statistics.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#062B52] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0c396e]"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="TOTAL PARCELS"
              value={String(landSummary.totalParcels)}
              suffix={landSummary.totalParcels === 1 ? "Parcel" : "Parcels"}
              description="Registered in your name"
            />

            <StatCard
              label="VERIFIED"
              value={String(landSummary.verifiedParcels)}
              suffix="Parcels"
              description="RoR & Cadastre digitally confirmed"
            />

            <StatCard
              label="PENDING VERIFICATION"
              value={String(landSummary.pendingVerification)}
              suffix="Under Review"
              description="Routine mutation verification"
            />

            <StatCard
              label="UNDER ACQUISITION"
              value={String(landSummary.underAcquisition)}
              suffix={landSummary.underAcquisition === 1 ? "Parcel" : "Parcels"}
              description={
                landSummary.underAcquisition > 0
                  ? "Government project notice active"
                  : "No active acquisition notices"
              }
              type={landSummary.underAcquisition > 0 ? "warning" : "normal"}
            />
          </section>
        )}

        {/* ================================================================== */}
        {/* PARCEL LIST & SEARCH                                               */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                REGISTERED LAND HOLDINGS
              </span>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#062B52] sm:text-2xl">
                My Land Parcels
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Click on any parcel to inspect boundaries, map location, or acquisition status.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Cadastral records synchronized</span>
              </div>
            </div>
          </div>

          {/* Unified Search Input (matching Find Land) */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Khasra, Survey No., Village, or Parcel ID..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs sm:text-sm text-[#062B52] placeholder:text-slate-400 outline-none transition focus:border-[#062B52] focus:ring-2 focus:ring-[#062B52]/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/citizen/find-land" })}
              className="flex h-11 items-center gap-2 rounded-xl border border-sky-200 bg-[#EAF3FC] px-4 text-xs sm:text-sm font-semibold text-[#1261A8] shadow-xs transition hover:bg-sky-100"
            >
              <Compass size={16} />
              <span className="hidden sm:inline">Find Other Land</span>
            </button>
          </div>

          {/* Parcel Cards List */}
          <div className="space-y-3">
            {filteredParcels.map((parcel: Parcel) => (
              <ParcelCard
                key={parcel.id}
                parcel={parcel}
                selected={selectedParcel?.id === parcel.id}
                onSelect={() => handleSelectParcel(parcel)}
                onViewMap={() => handleViewMap(parcel)}
                onViewDetails={() => handleViewDetails(parcel)}
              />
            ))}

            {/* Empty State (Section 10) */}
            {filteredParcels.length === 0 && (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <LandPlot size={24} />
                </div>
                <h3 className="mt-3 text-base font-bold text-[#062B52]">
                  No Land Records Found
                </h3>
                <p className="mt-1 max-w-sm text-xs sm:text-sm text-slate-500">
                  {search
                    ? `No registered parcels matched "${search}". Try searching with another survey or khasra number.`
                    : "Your registered land parcels will appear here once linked with your RoR account."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Clear Search
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/citizen/find-land" })}
                    className="rounded-xl bg-[#062B52] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0c396e]"
                  >
                    Find Land
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* INTEGRATED CADASTRAL GIS MAP PREVIEW                               */}
        {/* ================================================================== */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <LandPlot size={13} />
                HIGH-RESOLUTION SATELLITE CADASTRE
              </div>

              <h3 className="mt-1 text-lg sm:text-xl font-bold text-[#062B52]">
                Integrated Cadastral GIS Mesh
              </h3>

              <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-500">
                View your registered parcels and their cadastral boundaries on the integrated GIS map.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedParcel) {
                  handleViewMap(selectedParcel);
                } else if (parcels.length > 0) {
                  handleViewMap(parcels[0]);
                }
              }}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#062B52] px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#0c396e] sm:w-auto"
            >
              <Grid2X2 size={15} />
              Open Fullscreen GIS Viewer
            </button>
          </div>

          {/* Map Preview Container */}
          <div className="w-full overflow-hidden rounded-xl border border-slate-200/90">
            <CitizenGISMap
              parcels={parcels}
              selectedParcel={selectedParcel}
              onSelectParcel={handleSelectParcel}
              className="h-[380px] sm:h-[440px] lg:h-[480px]"
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* QUICK CITIZEN LAND SERVICES                                        */}
        {/* ================================================================== */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md sm:p-6">
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              REVENUE UTILITIES
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-[#062B52]">
              Quick Citizen Land Services
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Access commonly used land-record services and certified extract requests.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div onClick={() => navigate({ to: "/citizen/find-land" })}>
              <ServiceCard
                icon={<Search size={18} />}
                title="Find Another Land Record"
                description="Search by Khasra, Khatian or Plot ID"
                action="Search"
              />
            </div>

            <div
              onClick={() => {
                if (selectedParcel) {
                  handleViewDetails(selectedParcel);
                }
              }}
            >
              <ServiceCard
                icon={<Download size={18} />}
                title="Download All RoR / Khatiyan"
                description="Get your digital land ownership record"
                action="Download"
              />
            </div>

            <div
              onClick={() => {
                if (selectedParcel) {
                  handleViewDetails(selectedParcel);
                }
              }}
            >
              <ServiceCard
                icon={<TriangleAlert size={18} />}
                title="Report a Problem / Grievance"
                description="Submit a land-record or cadastral issue"
                action="Report"
              />
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* CITIZEN PORTAL FOOTER                                              */}
        {/* ================================================================== */}
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

export default RouteComponent;
