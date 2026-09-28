import React, { useMemo } from "react";
import { Landmark, Layers, AlertCircle, CheckCircle2 } from "lucide-react";
import SearchableCombobox, { type ComboboxOption } from "./SearchableCombobox";
import { useCitizenLand } from "../../services/citizen";
import { gisParcels } from "../../utils/gisMockData";
import type { Parcel } from "../../types/gis";

export interface LandParcelSelectorProps {
  label?: string;
  helperText?: string;
  selectedParcelId: string | null;
  onSelectParcel: (parcel: Parcel | null) => void;
  parcels?: Parcel[];
  placeholder?: string;
  className?: string;
  showSummary?: boolean;
}

/**
 * Shared Government-Grade Land Parcel Selector
 * Used across Citizen Portal (Acquisition Status, Compensation, etc.)
 */
export const LandParcelSelector: React.FC<LandParcelSelectorProps> = ({
  label = "Select Land Parcel",
  helperText = "Select a registered land parcel to view details.",
  selectedParcelId,
  onSelectParcel,
  parcels: customParcels,
  placeholder = "Select land parcel",
  className = "",
  showSummary = true,
}) => {
  // Fetch citizen parcels if not supplied via props
  const { data: landSummary, isLoading } = useCitizenLand();
  const availableParcels = customParcels || landSummary?.parcels || gisParcels;

  // Selected parcel lookup
  const selectedParcel = useMemo(() => {
    if (!selectedParcelId) return null;
    return (
      availableParcels.find(
        (p) =>
          p.id === selectedParcelId ||
          p.khasraNumber === selectedParcelId ||
          p.surveyNumber === selectedParcelId,
      ) || null
    );
  }, [availableParcels, selectedParcelId]);

  // Convert parcels to combobox options
  const options = useMemo<ComboboxOption[]>(() => {
    return availableParcels.map((parcel) => {
      const cleanKhasra = parcel.khasraNumber.replace(/^Khasra No\.\s*/i, "");
      const areaText = `${parcel.area} ${parcel.areaUnit || "Acre"}`;
      const statusNote =
        parcel.status === "acquisition" ? " · Under Acquisition" : "";
      
      const labelText = `Khasra ${cleanKhasra} · ${parcel.village} · ${areaText}${statusNote}`;

      return {
        value: parcel.id,
        label: labelText,
        code: cleanKhasra,
      };
    });
  }, [availableParcels]);

  const handleComboboxChange = (value: string) => {
    if (!value) {
      onSelectParcel(null);
      return;
    }
    const found = availableParcels.find((p) => p.id === value);
    onSelectParcel(found || null);
  };

  return (
    <div
      className={`rounded-xl border border-[#D9E2EC] bg-white p-4 sm:p-5 shadow-xs ${className}`}
      aria-label="Land Selection Card"
    >
      {/* Category Eyebrow & Status Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded text-[#1261A8]">
            <Layers size={15} aria-hidden="true" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            MY LAND / SELECT LAND
          </span>
        </div>

        {selectedParcel && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              selectedParcel.status === "acquisition"
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {selectedParcel.status === "acquisition" ? (
              <>
                <AlertCircle size={12} className="text-amber-600" />
                Under Acquisition
              </>
            ) : (
              <>
                <CheckCircle2 size={12} className="text-emerald-600" />
                Safe / Registered
              </>
            )}
          </span>
        )}
      </div>

      {/* Combobox with Helper Text */}
      <div className="w-full max-w-2xl min-w-0">
        <SearchableCombobox
          id="land-parcel-selector"
          label={label}
          value={selectedParcel?.id || ""}
          options={options}
          placeholder={placeholder}
          searchPlaceholder="Search by Khasra number, village, or area..."
          emptyMessage="No registered land parcels found"
          loading={isLoading}
          onChange={handleComboboxChange}
          onClear={() => onSelectParcel(null)}
        />

        <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">
          {helperText}
        </p>
      </div>

      {/* Selected Parcel Information Strip */}
      {selectedParcel && showSummary && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="font-semibold text-slate-500">Selected Land:</span>
          <span className="font-bold text-[#062B52]">
            Khasra {selectedParcel.khasraNumber.replace(/^Khasra No\.\s*/i, "")}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-700 font-medium">
            {selectedParcel.village}
            {selectedParcel.district ? `, ${selectedParcel.district}` : ""}
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-[#1261A8]">
            {selectedParcel.area} {selectedParcel.areaUnit || "Acre"}
          </span>
          {selectedParcel.khatauni && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-mono text-[11px]">
                Khata: {selectedParcel.khatauni}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LandParcelSelector;
