import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import { Polygon, Popup, Tooltip } from "react-leaflet";

import type { Parcel } from "../../types/gis";

interface ParcelPolygonProps {
  parcel: Parcel;
  selected: boolean;
  onClick: (parcel: Parcel) => void;
}

export default function ParcelPolygon({
  parcel,
  selected,
  onClick,
}: ParcelPolygonProps) {
  const navigate = useNavigate();

  const positions = parcel.geometry.coordinates[0].map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );

  const getColor = () => {
    switch (parcel.status) {
      case "acquisition":
        return "#f97316";

      case "review":
        return "#eab308";

      case "disputed":
        return "#dc2626";

      default:
        return "#15803d";
    }
  };

  const color = getColor();

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: selected ? 0.48 : 0.25,
        weight: selected ? 4 : 2,
        opacity: 1,
        dashArray: parcel.status === "acquisition" ? "6 4" : undefined,
      }}
      eventHandlers={{
        click: () => onClick(parcel),
      }}
    >
      <Tooltip direction="center" permanent className="parcel-label">
        <div className="text-center">
          <div className="font-bold">Parcel {parcel.id}</div>

          <div>{parcel.area.toFixed(2)} Acres</div>
        </div>
      </Tooltip>

      <Popup>
        <div className="min-w-[190px] p-1 text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span className="font-bold text-[#173c56]">
              Parcel #{parcel.id}
            </span>

            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {parcel.khasraNumber}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-slate-600">
            <p>
              <span className="text-slate-400">Village:</span>{" "}
              <strong>{parcel.village}</strong>
            </p>

            <p>
              <span className="text-slate-400">Area:</span>{" "}
              <strong>{parcel.area.toFixed(2)} Acres</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate({
                to: "/citizen/land-details",
                search: {
                  parcel: String(parcel.id).replace(/^["']|["']$/g, ""),
                },
              });
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#123f5c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0c3048]"
          >
            <FileText size={13} />
            <span>View Land Details</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </Popup>
    </Polygon>
  );
}
