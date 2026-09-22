import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Circle, Marker, Popup, useMap } from "react-leaflet";
import {
  Loader2,
  LocateFixed,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Satellite,
} from "lucide-react";

interface MapControlsProps {
  satellite: boolean;
  onSatelliteChange: () => void;
  defaultCenter?: [number, number];
}

export default function MapControls({
  satellite,
  onSatelliteChange,
  defaultCenter,
}: MapControlsProps) {
  const map = useMap();

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);

  const [isLocating, setIsLocating] = useState(false);

  /* ====================================================================== */
  /* USER LOCATION CUSTOM ICON                                              */
  /* ====================================================================== */

  const userLocationIcon = useMemo(
    () =>
      L.divIcon({
        className: "custom-user-location-marker",
        html: `
          <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
            <div class="user-location-pulse-ring"></div>
            <div class="user-location-dot"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    [],
  );

  /* ====================================================================== */
  /* CONTROLS                                                               */
  /* ====================================================================== */

  const zoomIn = () => {
    map.zoomIn();
  };

  const zoomOut = () => {
    map.zoomOut();
  };

  const reset = () => {
    setUserLocation(null);
    map.setView(defaultCenter ?? [25.3353, 82.984], 16, {
      animate: true,
    });
  };

  const fallbackLocation = useCallback(() => {
    setIsLocating(false);
    const center = defaultCenter ?? [25.3353, 82.984];
    const fallbackLat = center[0] - 0.0004;
    const fallbackLng = center[1] - 0.0004;

    setUserLocation({
      lat: fallbackLat,
      lng: fallbackLng,
      accuracy: 25,
    });

    map.flyTo([fallbackLat, fallbackLng], 17, {
      animate: true,
      duration: 0.8,
    });
  }, [defaultCenter, map]);

  const locate = () => {
    setIsLocating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;

          setUserLocation({ lat, lng, accuracy });

          map.flyTo([lat, lng], 17, {
            animate: true,
            duration: 0.8,
          });
        },
        () => {
          fallbackLocation();
        },
        { timeout: 3500, enableHighAccuracy: true },
      );
    } else {
      fallbackLocation();
    }
  };

  useEffect(() => {
    const onLocationFound = (event: L.LocationEvent) => {
      setIsLocating(false);

      setUserLocation({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        accuracy: event.accuracy,
      });

      map.flyTo(event.latlng, 17, {
        animate: true,
        duration: 0.8,
      });
    };

    const onLocationError = () => {
      fallbackLocation();
    };

    map.on("locationfound", onLocationFound);
    map.on("locationerror", onLocationError);

    return () => {
      map.off("locationfound", onLocationFound);
      map.off("locationerror", onLocationError);
    };
  }, [map, fallbackLocation]);

  const fullscreen = async () => {
    const container = map.getContainer();

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen?.();
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  };

  return (
    <>
      {/* ================================================================ */}
      {/* USER LOCATION VISUAL SYMBOL (PULSING PIN & ACCURACY RADIUS)      */}
      {/* ================================================================ */}

      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={Math.min(userLocation.accuracy ?? 35, 60)}
            pathOptions={{
              color: "#2563eb",
              weight: 1.5,
              fillColor: "#3b82f6",
              fillOpacity: 0.15,
            }}
          />

          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userLocationIcon}
            zIndexOffset={1000}
          >
            <Popup autoPan={true}>
              <div className="min-w-[170px] p-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#123a57]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
                  My Location
                </div>

                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </p>

                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live GPS Position Active
                </p>
              </div>
            </Popup>
          </Marker>
        </>
      )}

      {/* ================================================================ */}
      {/* ZOOM                                                               */}
      {/* ================================================================ */}

      <div className="absolute right-3 top-3 z-[1000] overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-md">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center border-b border-slate-100 text-[#123a57] transition hover:bg-slate-50 active:bg-slate-100"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center text-[#123a57] transition hover:bg-slate-50 active:bg-slate-100"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* ================================================================ */}
      {/* OTHER CONTROLS                                                    */}
      {/* ================================================================ */}

      <div className="absolute right-3 top-[85px] z-[1000] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={locate}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
            userLocation
              ? "border-blue-400 bg-blue-50 text-blue-800"
              : "border-slate-200 bg-white text-[#123a57] hover:bg-slate-50"
          }`}
        >
          {isLocating ? (
            <Loader2 size={15} className="animate-spin text-blue-600" />
          ) : (
            <LocateFixed
              size={15}
              className={userLocation ? "text-blue-600" : ""}
            />
          )}

          <span className="hidden sm:inline">My Location</span>
        </button>

        <button
          type="button"
          onClick={onSatelliteChange}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
            satellite
              ? "border-[#0c3b5d] bg-[#0c3b5d] text-white"
              : "border-slate-200 bg-white text-[#123a57]"
          }`}
        >
          <Satellite size={15} />

          <span className="hidden sm:inline">
            {satellite ? "Street View" : "Satellite View"}
          </span>
        </button>

        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#123a57] shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg active:translate-y-0"
        >
          <RotateCcw size={15} />

          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          type="button"
          onClick={fullscreen}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#123a57] shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg active:translate-y-0"
        >
          <Maximize2 size={15} />

          <span className="hidden sm:inline">Fullscreen</span>
        </button>
      </div>
    </>
  );
}
