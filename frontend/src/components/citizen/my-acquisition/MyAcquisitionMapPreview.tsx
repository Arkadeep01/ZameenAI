import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Map,
  MapPin,
  ArrowRight,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { AcquisitionCase } from "../../../services/acquisition";
import { useCitizenLand } from "../../../services/citizen";
import type { Parcel } from "../../../types/gis";
import CitizenGISMap from "../../gis/CitizenGISMap";

interface MyAcquisitionMapPreviewProps {
  cases: AcquisitionCase[];
}

export const MyAcquisitionMapPreview: React.FC<MyAcquisitionMapPreviewProps> = ({
  cases,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRenderable, setIsRenderable] = useState(false);

  // Existing frontend GIS service query hook (connects to /api/gis/parcels with cached fallback)
  const { data: landSummary, isLoading, isError, refetch } = useCitizenLand();

  // Active selected acquisition case
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    cases[0]?.id || "ACQ-2026-00182",
  );

  // Ensure Leaflet is only mounted when container is visible in the viewport (handles responsive breakpoints)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const checkVisibility = () => {
      const rect = el.getBoundingClientRect();
      setIsRenderable(rect.width > 0 && rect.height > 0);
    };

    checkVisibility();
    const observer = new ResizeObserver(checkVisibility);
    observer.observe(el);
    window.addEventListener("resize", checkVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkVisibility);
    };
  }, []);

  const activeCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || cases[0],
    [cases, selectedCaseId],
  );

  // Match the active acquisition case to the corresponding GIS parcel from the GIS API
  const activeParcel = useMemo<Parcel | null>(() => {
    const parcels = landSummary?.parcels;
    if (!parcels || parcels.length === 0) return null;

    if (activeCase?.khasraNumber) {
      const cleanCaseKhasra = activeCase.khasraNumber
        .replace(/^Khasra\s*/i, "")
        .trim();

      const matched = parcels.find((p) => {
        const cleanPKhasra = p.khasraNumber
          .replace(/^Khasra\s*/i, "")
          .trim();
        return (
          cleanPKhasra === cleanCaseKhasra ||
          p.surveyNumber.includes(cleanCaseKhasra)
        );
      });

      if (matched) return matched;
    }

    // Default fallback to first acquisition-status parcel or first parcel
    return (
      parcels.find((p) => p.status === "acquisition") ||
      parcels[0] ||
      null
    );
  }, [landSummary?.parcels, activeCase]);

  // When a parcel is clicked on the GIS map, sync the selected case in the list
  const handleSelectParcel = (parcel: Parcel) => {
    const cleanPKhasra = parcel.khasraNumber
      .replace(/^Khasra\s*/i, "")
      .trim();

    const matchedCase = cases.find((c) => {
      const cleanCaseKhasra = c.khasraNumber
        .replace(/^Khasra\s*/i, "")
        .trim();
      return cleanCaseKhasra === cleanPKhasra;
    });

    if (matchedCase) {
      setSelectedCaseId(matchedCase.id);
    }
  };

  return (
    <section
      aria-label="Land Affected by Acquisition"
      className="rounded-xl border border-[#cfe2ed] bg-[#f8fbfe] p-5 shadow-xs"
    >
      {/* Header matching GIS component language */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAF3FC] pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EAF3FC] text-[#062B52]">
            <Map size={15} />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#062B52]">
            Land Affected by Acquisition
          </h2>
        </div>
        <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
          Demarcated Parcels: {cases.length}
        </span>
      </div>

      {/* Interactive GIS Cadastral Map Viewport (Reusing Existing CitizenGISMap) */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-[#b8d4e4] bg-[#dce6ef] h-[220px] sm:h-[240px] w-full shadow-inner"
      >
        {isLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#EAF3FC] text-[#062B52]">
            <Loader2 size={24} className="animate-spin text-[#1261A8]" />
            <span className="mt-2 text-xs font-semibold">
              Loading parcel map...
            </span>
          </div>
        ) : isError ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-red-50 p-4 text-center text-red-800">
            <AlertTriangle size={24} className="text-red-600 mb-1" />
            <span className="text-xs font-bold">
              Unable to load parcel boundary
            </span>
            <span className="text-[11px] text-red-600 mt-0.5">
              Please try again.
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Retry</span>
            </button>
          </div>
        ) : isRenderable ? (
          <CitizenGISMap
            parcels={landSummary?.parcels ?? []}
            selectedParcel={activeParcel}
            onSelectParcel={handleSelectParcel}
            compact={true}
            hideLegend={true}
            hidePanControl={true}
            scrollWheelZoom={false}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#dce6ef] text-slate-400 text-xs">
            Loading parcel map...
          </div>
        )}
      </div>

      {/* Affected Parcel List */}
      <div className="mt-3.5 space-y-2">
        {cases.map((c) => {
          const isSelected = c.id === activeCase?.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCaseId(c.id)}
              className={`flex w-full items-center justify-between rounded-lg p-2.5 text-xs text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#EAF3FC] border-2 border-[#1261A8] shadow-2xs"
                  : "bg-[#EAF3FC] border border-[#cfe2ed] hover:bg-[#EAF3FC]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                    isSelected
                      ? "bg-[#1261A8] text-white"
                      : "bg-[#EAF3FC] text-[#062B52]"
                  }`}
                >
                  <MapPin size={12} />
                </div>
                <div className="truncate">
                  <span className="font-bold text-[#062B52]">
                    {c.khasraNumber}
                  </span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span className="font-medium text-[#062B52]">{c.area}</span>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[#062B52] bg-white/80 border border-[#cfe2ed] rounded-md px-2 py-0.5">
                {c.village}
              </span>
            </button>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div className="mt-4 pt-3 border-t border-[#EAF3FC]">
        <Link
          to="/citizen/my-land-map"
          search={{
            parcel: activeParcel ? String(activeParcel.id) : undefined,
          }}
          className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-[#cfe4ed] bg-[#EAF3FC] px-4 py-2.5 text-xs font-bold text-[#062B52] shadow-2xs transition-all hover:bg-[#e4f2f8] hover:border-[#b8d7e6] hover:text-[#062B52] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span>View Full Map</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
};

export default MyAcquisitionMapPreview;
