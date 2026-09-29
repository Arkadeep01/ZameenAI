import { useEffect, useState } from "react";

import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

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
  compact?: boolean;
  hideLegend?: boolean;
  hidePanControl?: boolean;
  scrollWheelZoom?: boolean;
  /**
   * Optional: enables click-to-pick on the map. When omitted the map keeps its
   * default (non-interactive picking) behaviour.
   */
  onMapClick?: (lat: number, lng: number) => void;
  /** Optional: coordinate previously picked via `onMapClick`, rendered as a pin. */
  clickedLocation?: [number, number] | null;
}

/* ========================================================================== */
/* MAP CLICK HANDLER (only mounted when onMapClick is provided)                */
/* ========================================================================== */

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

/* ========================================================================== */
/* MAP RESIZE HANDLER                                                         */
/* ========================================================================== */

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const resize = () => {
      requestAnimationFrame(() => {
        try {
          const size = map.getSize();
          if (size.x > 0 && size.y > 0) {
            map.invalidateSize({
              animate: false,
              pan: false,
            });
          }
        } catch {
          // Safe catch for detached or unmounted containers
        }
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
    if (isNaN(lat) || isNaN(lng)) return;

    requestAnimationFrame(() => {
      try {
        const size = map.getSize();
        if (size.x > 0 && size.y > 0) {
          map.invalidateSize({
            animate: false,
            pan: false,
          });

          map.flyTo([lat, lng], 16, {
            animate: true,
            duration: 0.6,
          });
        }
      } catch {
        // Safe catch for zero-dimension containers
      }
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
  compact = false,
  hideLegend = false,
  hidePanControl = false,
  scrollWheelZoom = true,
  onMapClick,
  clickedLocation = null,
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
        scrollWheelZoom={scrollWheelZoom}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        zoomControl={false}
        attributionControl={!compact}
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
        {/* CLICKED COORDINATE (optional)                                    */}
        {/* ================================================================ */}

        {clickedLocation && (
          <Marker position={clickedLocation}>
            <Popup>
              <span className="text-xs font-semibold">
                Selected Map Coordinate: {clickedLocation[0].toFixed(4)},{" "}
                {clickedLocation[1].toFixed(4)}
              </span>
            </Popup>
          </Marker>
        )}

        {/* ================================================================ */}
        {/* MAP CLICK PICKING (optional)                                     */}
        {/* ================================================================ */}

        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* ================================================================ */}
        {/* MAP CONTROLS                                                     */}
        {/* ================================================================ */}

        <MapControls
          satellite={satellite}
          onSatelliteChange={() => setSatellite((value) => !value)}
          defaultCenter={selectedParcel?.center ?? [25.3353, 82.984]}
          compact={compact}
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

        {!hidePanControl && (
          <MapPanControl
            defaultCenter={selectedParcel?.center ?? [25.3353, 82.984]}
          />
        )}
      </MapContainer>

      {/* ================================================================== */}
      {/* GIS LAYER LABEL                                                    */}
      {/* ================================================================== */}

      <div
        className={`pointer-events-none absolute z-[1000] ${
          compact ? "left-2.5 top-2.5" : "left-3 top-3"
        }`}
      >
        <div
          className={`rounded-md border border-white/90 bg-white/95 font-bold text-[#062B52] shadow-md backdrop-blur-xs ${
            compact
              ? "px-2.5 py-1 text-[10px] sm:text-[11px]"
              : "px-3 py-1.5 text-xs"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {compact ? "GIS Cadastral Layer" : "GIS Layer: Revenue Cadastral Boundary"}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* COMPACT COMPASS & SCALE NOTATION                                   */}
      {/* ================================================================== */}

      {compact && (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-[1000] flex items-center gap-1 rounded bg-[#062B52]/85 border border-white/15 px-2 py-0.5 text-[9px] font-mono text-slate-200 backdrop-blur-xs">
          <span className="font-bold text-sky-300">N ▲</span>
          <span className="text-slate-400 border-l border-white/20 pl-1.5">1:2,500</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* LEGEND                                                             */}
      {/* ================================================================== */}

      {!hideLegend && <MapLegend />}
    </div>
  );
}
