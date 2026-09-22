import { useEffect, useState } from "react";

import { MapContainer, TileLayer, useMap } from "react-leaflet";

import type { Parcel } from "../../types/gis";

import ParcelPolygon from "./ParcelPolygon";
import MapControls from "./MapControls";
import MapPanControl from "./MapPanControl";
import MapLegend from "./MapLegend";

interface CitizenGISMapProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelectParcel: (parcel: Parcel) => void;
  className?: string;
}

/* ========================================================================== */
/* MAP RESIZE HANDLER                                                         */
/* ========================================================================== */

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const resize = () => {
      requestAnimationFrame(() => {
        map.invalidateSize({
          animate: false,
          pan: false,
        });
      });
    };

    resize();

    const timer = window.setTimeout(resize, 100);

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

/* ========================================================================== */
/* SELECTED PARCEL CONTROLLER                                                 */
/* ========================================================================== */

function SelectedParcelController({ parcel }: { parcel: Parcel | null }) {
  const map = useMap();

  useEffect(() => {
    if (!parcel) {
      return;
    }

    const [lat, lng] = parcel.center;

    requestAnimationFrame(() => {
      map.invalidateSize({
        animate: false,
        pan: false,
      });

      map.flyTo([lat, lng], 17, {
        animate: true,
        duration: 0.6,
      });
    });
  }, [parcel, map]);

  return null;
}

/* ========================================================================== */
/* MAIN MAP                                                                   */
/* ========================================================================== */

export default function CitizenGISMap({
  parcels,
  selectedParcel,
  onSelectParcel,
  className,
}: CitizenGISMapProps) {
  const [satellite, setSatellite] = useState(true);

  /* ====================================================================== */
  /* TILE URLS                                                              */
  /* ====================================================================== */

  const streetUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const satelliteUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  /* ====================================================================== */
  /* RENDER                                                                 */
  /* ====================================================================== */

  return (
    <div
      className={`relative isolate z-0 w-full overflow-hidden bg-[#dce6ef] ${
        className ??
        "h-[360px] rounded-lg border border-slate-300 shadow-sm sm:h-[400px] lg:h-[440px] xl:h-[460px]"
      }`}
    >
      <MapContainer
        center={selectedParcel?.center ?? [25.3353, 82.984]}
        zoom={16}
        minZoom={8}
        maxZoom={20}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        zoomControl={false}
        attributionControl={true}
        className="absolute inset-0 z-0 !h-full !w-full"
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* ================================================================ */}
        {/* TILE LAYER                                                       */}
        {/* ================================================================ */}

        <TileLayer
          key={satellite ? "satellite" : "street"}
          url={satellite ? satelliteUrl : streetUrl}
          attribution={
            satellite ? "Tiles © Esri" : "&copy; OpenStreetMap contributors"
          }
          maxZoom={20}
          maxNativeZoom={19}
          keepBuffer={1}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />

        {/* ================================================================ */}
        {/* PARCELS                                                          */}
        {/* ================================================================ */}

        {parcels.map((parcel) => (
          <ParcelPolygon
            key={parcel.id}
            parcel={parcel}
            selected={selectedParcel?.id === parcel.id}
            onClick={onSelectParcel}
          />
        ))}

        {/* ================================================================ */}
        {/* MAP CONTROLS                                                     */}
        {/* ================================================================ */}

        <MapControls
          satellite={satellite}
          onSatelliteChange={() => setSatellite((value) => !value)}
          defaultCenter={selectedParcel?.center ?? [25.3353, 82.984]}
        />

        {/* ================================================================ */}
        {/* MAP RESIZE                                                       */}
        {/* ================================================================ */}

        <MapResizeHandler />

        {/* ================================================================ */}
        {/* SELECTED PARCEL                                                  */}
        {/* ================================================================ */}

        <SelectedParcelController parcel={selectedParcel} />

        {/* ================================================================ */}
        {/* PAN / DIRECTIONAL / NORTH CONTROLS                               */}
        {/* ================================================================ */}

        <MapPanControl
          defaultCenter={selectedParcel?.center ?? [25.3353, 82.984]}
        />
      </MapContainer>

      {/* ================================================================== */}
      {/* GIS LAYER LABEL                                                    */}
      {/* ================================================================== */}

      <div className="pointer-events-none absolute left-3 top-3 z-[1000]">
        <div className="rounded-lg border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#173b55] shadow-md backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            GIS Layer: Revenue Cadastral Boundary
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LEGEND                                                             */}
      {/* ================================================================== */}

      <MapLegend />
    </div>
  );
}
