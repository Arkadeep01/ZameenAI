import { CheckCircle2, Circle, Layers3 } from "lucide-react";

import type { Parcel } from "../../types/gis";

interface ParcelSelectorProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelect: (parcel: Parcel) => void;
}

export default function ParcelSelector({
  parcels,
  selectedParcel,
  onSelect,
}: ParcelSelectorProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EAF3FC] text-[#062B52]">
            <Layers3 size={13} />
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-[#062B52]">
            Your Land Parcels:
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {parcels.length} registered
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {parcels.map((parcel) => {
          const selected = selectedParcel?.id === parcel.id;

          const acquisition = parcel.status === "acquisition";

          return (
            <button
              key={parcel.id}
              type="button"
              onClick={() => onSelect(parcel)}
              className={`flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 ${
                selected
                  ? "border-[#062B52] bg-[#062B52] text-white shadow-xs"
                  : "border-slate-200 bg-[#EAF3FC] text-[#062B52] hover:border-sky-300"
              }`}
            >
              {selected ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <Circle
                  size={15}
                  className={
                    acquisition
                      ? "shrink-0 text-amber-500"
                      : "shrink-0 text-emerald-600"
                  }
                />
              )}

              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight">
                  Parcel {parcel.id}
                </div>

                <div
                  className={`text-xs mt-0.5 ${
                    selected ? "text-white/80" : "text-slate-600"
                  }`}
                >
                  {parcel.area.toFixed(2)} Ac
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* VERIFICATION */}

      <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle2 size={14} className="text-emerald-600" />
        Digitally Verified by Varanasi District Revenue Office
      </div>
    </div>
  );
}
