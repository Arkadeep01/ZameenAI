import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  CheckCircle2,
  Download,
  FileCheck2,
  Grid2X2,
  LandPlot,
  MapPin,
  Printer,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

/* ========================================================================== */
/* COMPONENT IMPORTS                                                          */
/* ========================================================================== */

import CitizenGISMap from "../components/gis/CitizenGISMap";
import ParcelCard from "../components/gis/ParcelCard";
import ServiceCard from "../components/gis/ServiceCard";
import StatCard from "../components/gis/StatCard";

/* ========================================================================== */
/* DATA IMPORTS                                                               */
/* ========================================================================== */

import {
  acquisitionParcels,
  citizenInfo,
  gisParcels,
  totalArea,
} from "../utils/gisMockData";

/* ========================================================================== */
/* TYPE IMPORTS                                                               */
/* ========================================================================== */

import type { Parcel } from "../types/gis";

/* ========================================================================== */
/* ROUTE                                                                      */
/* ========================================================================== */

export const Route = createFileRoute("/citizen/my-land")({
  component: RouteComponent,
});

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

function RouteComponent() {
  const navigate = useNavigate();

  /* ------------------------------------------------------------------------ */
  /* STATE                                                                    */
  /* ------------------------------------------------------------------------ */

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(
    gisParcels.length > 0 ? gisParcels[0] : null,
  );

  const [search, setSearch] = useState("");

  /* ------------------------------------------------------------------------ */
  /* FILTERED PARCELS                                                         */
  /* ------------------------------------------------------------------------ */

  const filteredParcels = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return gisParcels;
    }

    return gisParcels.filter((parcel: Parcel) => {
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
  }, [search]);

  /* ------------------------------------------------------------------------ */
  /* SELECT PARCEL                                                            */
  /* ------------------------------------------------------------------------ */

  const handleSelectParcel = (parcel: Parcel) => {
    setSelectedParcel(parcel);
  };

  /* ------------------------------------------------------------------------ */
  /* VIEW MAP                                                                 */
  /* ------------------------------------------------------------------------ */

  const handleViewMap = (parcel: Parcel) => {
    navigate({
      to: "/citizen/my-land-map",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  /* ------------------------------------------------------------------------ */
  /* VIEW LAND DETAILS                                                        */
  /* ------------------------------------------------------------------------ */

  const handleViewDetails = (parcel: Parcel) => {
    navigate({
      to: "/citizen/land-details",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f8fb] text-[#17324d]">
      <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        {/* ================================================================== */}
        {/* CITIZEN IDENTITY                                                    */}
        {/* ================================================================== */}

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Citizen information */}

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf7fc] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1b658e]">
                <ShieldCheck size={14} />

                <span>RoR Citizen Identity</span>
              </div>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-[#153550] sm:text-2xl">
                Welcome, {citizenInfo.name}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} />
                  Village: {citizenInfo.village}
                </span>

                <span className="text-slate-300">•</span>

                <span>Tehsil: {citizenInfo.tehsil}</span>

                <span className="text-slate-300">•</span>

                <span>District: {citizenInfo.district}</span>
              </div>
            </div>

            {/* Revenue authority */}

            <div className="flex w-full items-center gap-3 rounded-xl border border-sky-100 bg-[#f6fbfe] p-3 transition-all duration-200 hover:border-sky-200 hover:bg-[#f0faff] sm:w-auto sm:min-w-[220px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#164f73]">
                <LandPlot size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  REVENUE AUTHORITY
                </p>

                <p className="text-sm font-bold text-[#1a4665]">
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
        {/* PAGE HEADER                                                          */}
        {/* ================================================================== */}

        <section className="flex flex-col gap-3 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              LAND ADMINISTRATION WORKSPACE
            </span>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#153550] sm:text-3xl">
              My Land
            </h2>

            <p className="mt-1 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-500">
              View your registered land, location and current status in one
              place.
            </p>
          </div>

          {/* Header actions */}

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-[#edf7fc] px-3.5 text-xs font-semibold text-[#204d69] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-xs sm:flex-none"
            >
              <FileCheck2 size={14} />
              Sync Records
            </button>

            <button
              type="button"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-[#edf7fc] px-3.5 text-xs font-semibold text-[#204d69] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-xs sm:flex-none"
            >
              <Printer size={14} />
              Print Summary
            </button>
          </div>
        </section>

        {/* ================================================================== */}
        {/* STATISTICS                                                           */}
        {/* ================================================================== */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="MY LAND"
            value={String(gisParcels.length)}
            suffix="Parcels"
            description="Registered in your name"
          />

          <StatCard
            label="TOTAL AREA"
            value={Number(totalArea).toFixed(2)}
            suffix="Acres"
            description="Total registered land area"
          />

          <StatCard
            label="LAND UNDER ACQUISITION"
            value={String(acquisitionParcels.length)}
            suffix={acquisitionParcels.length === 1 ? "Parcel" : "Parcels"}
            description="Government project notice issued"
            type="warning"
          />

          <StatCard
            label="URGENT ACTION REQUIRED"
            value="1"
            suffix="Item"
            description="Submit details for Parcel 1025"
            type="danger"
          />
        </section>

        {/* ================================================================== */}
        {/* MY LAND PARCELS                                                      */}
        {/* ================================================================== */}

        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#193b55]">
                My Land Parcels
              </h3>

              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Click on any parcel to see details, map view, or acquisition
                status.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CheckCircle2 size={14} className="text-emerald-600" />

              <span>Cadastral records synchronized</span>
            </div>
          </div>

          {/* Search */}

          <div className="mb-3 flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-xs transition-all duration-200 focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100">
            <Search size={16} className="shrink-0 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Khasra, Survey No., Village..."
              className="w-full border-0 bg-transparent text-xs sm:text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 text-xs font-semibold text-slate-400 transition hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Parcel list */}

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

            {/* No results */}

            {filteredParcels.length === 0 && (
              <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center transition-all hover:border-sky-300 hover:shadow-xs">
                <Search size={22} className="text-slate-400" />

                <strong className="mt-2.5 text-sm font-bold text-slate-700">
                  No parcels found
                </strong>

                <p className="mt-1 text-xs text-slate-500">
                  Try another Khasra number, village or parcel ID.
                </p>

                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-3 rounded-lg bg-[#14384f] px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-[#0b2b3e] hover:shadow-xs"
                >
                  Show All Parcels
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* GIS MAP                                                              */}
        {/* ================================================================== */}

        <section className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <LandPlot size={13} />
                HIGH-RESOLUTION SATELLITE CADASTRE
              </div>

              <h3 className="mt-1 text-lg sm:text-xl font-bold text-[#193b55]">
                Integrated Cadastral GIS Mesh
              </h3>

              <p className="mt-1 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-500">
                View your registered parcels and their cadastral boundaries on
                the integrated GIS map.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedParcel) {
                  handleViewMap(selectedParcel);
                }
              }}
              disabled={!selectedParcel}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#14394f] px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#0b2d40] hover:shadow-xs disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Grid2X2 size={14} />
              Open Fullscreen GIS Viewer
            </button>
          </div>

          {/* Map */}

          <div className="w-full overflow-hidden rounded-xl border border-slate-200/80">
            <CitizenGISMap
              parcels={gisParcels}
              selectedParcel={selectedParcel}
              onSelectParcel={handleSelectParcel}
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* QUICK CITIZEN SERVICES                                               */}
        {/* ================================================================== */}

        <section className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-[#193b55]">
              Quick Citizen Land Services
            </h3>

            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Access commonly used land-record services.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ServiceCard
              icon={<Search size={18} />}
              title="Find Another Land Record"
              description="Search by Khasra, Khatian or Plot ID"
              action="Search"
            />

            <ServiceCard
              icon={<Download size={18} />}
              title="Download All RoR / Khatiyan"
              description="Get your digital land ownership record"
              action="Download"
            />

            <ServiceCard
              icon={<TriangleAlert size={18} />}
              title="Report a Problem / Grievance"
              description="Submit a land-record or cadastral issue"
              action="Report"
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* FOOTER                                                               */}
        {/* ================================================================== */}

        <footer className="mt-8 border-t border-slate-200/60 py-6 text-center text-xs leading-relaxed text-slate-400">
          Records displayed are synchronized with the Revenue Registry. GIS
          boundaries are provided for citizen information and transparency. For
          certified cadastral copies, contact your Tehsil Revenue Office.
        </footer>
      </main>
    </div>
  );
}

export default RouteComponent;
