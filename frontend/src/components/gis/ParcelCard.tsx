import { Calculator, CheckCircle2, FileText, Info, Map } from "lucide-react";

import type { Parcel } from "../../types/gis";

interface ParcelCardProps {
  parcel: Parcel;
  selected: boolean;
  onSelect: () => void;
  onViewMap: () => void;
  onViewDetails: () => void;
}

export default function ParcelCard({
  parcel,
  selected,
  onSelect,
  onViewMap,
  onViewDetails,
}: ParcelCardProps) {
  const statusClasses: Record<Parcel["status"], string> = {
    safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
    review: "bg-yellow-50 text-yellow-700 border-yellow-200",
    acquisition: "bg-amber-50 text-amber-700 border-amber-200",
    disputed: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <article
      onClick={onSelect}
      className={[
        "cursor-pointer rounded-2xl border bg-white p-5 sm:p-6",
        "transition-all duration-200",
        "hover:-translate-y-0.5",
        "hover:border-sky-300",
        "hover:shadow-md",
        selected
          ? "border-sky-500 shadow-[0_0_0_2px_rgba(14,116,144,0.12)]"
          : "border-slate-200/90 shadow-xs",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT */}

        <div className="flex flex-wrap items-center gap-2.5">
          <h4 className="text-base sm:text-lg font-bold text-[#173c56]">
            Parcel {parcel.id}
          </h4>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              statusClasses[parcel.status]
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {parcel.statusLabel}
          </span>
        </div>

        {/* RIGHT */}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-slate-500">
            ID: {parcel.cadastralId}
          </span>

          {/* ============================================================ */}
          {/* VIEW LAND DETAILS                                            */}
          {/* ============================================================ */}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onViewDetails();
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0c3048] hover:shadow-sm"
          >
            <FileText size={14} />
            View Land Details
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LAND DETAILS                                                     */}
      {/* ================================================================ */}

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-[#f8fafc] p-3.5 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
        <Detail
          label="Survey / Khasra No."
          value={`Khasra No. ${parcel.khasraNumber}`}
        />

        <Detail
          label="Registered Area"
          value={`${Number(parcel.area).toFixed(2)} ${parcel.areaUnit}`}
        />

        <Detail label="Land Category" value={parcel.landType} />

        <Detail
          label="Village & Tehsil"
          value={`${parcel.village}, ${parcel.tehsil}`}
        />
      </div>

      {/* ================================================================ */}
      {/* DESCRIPTION                                                      */}
      {/* ================================================================ */}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-slate-500">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <span>
            {parcel.description ??
              "Cadastral record available and synchronized with the revenue registry."}
          </span>
        </p>

        {/* ============================================================ */}
        {/* VIEW ON MAP                                                   */}
        {/* ============================================================ */}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onViewMap();
          }}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 text-xs font-semibold text-[#174b69] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-xs sm:w-auto"
        >
          <Map size={14} />
          View on Map
        </button>
      </div>

      {/* ================================================================ */}
      {/* ACQUISITION NOTICE                                               */}
      {/* ================================================================ */}

      {parcel.status === "acquisition" && parcel.acquisition?.active && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-xs">
                <Info size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-amber-900">
                  Notice Issued on{" "}
                  {parcel.acquisition.gazetteDate ?? "10 September"}{" "}
                  {parcel.acquisition.notificationYear ?? "2026"}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                  {parcel.acquisition.reason ??
                    parcel.description ??
                    "Government acquisition notice has been issued for this parcel."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
              }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#153a52] px-3.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#0b2b3d] hover:shadow-xs"
            >
              <FileText size={13} />
              Submit Bank Details
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ACQUISITION ACTION                                               */}
      {/* ================================================================ */}

      {parcel.status === "acquisition" && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
          }}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#543509] px-4 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:bg-[#3d2605] hover:shadow-sm"
        >
          <Calculator size={15} />
          Check Acquisition Status
        </button>
      )}
    </article>
  );
}

/* ========================================================================== */
/* DETAIL                                                                     */
/* ========================================================================== */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs font-medium text-slate-500">{label}</span>

      <strong className="mt-0.5 block text-sm font-bold leading-normal text-[#173c56]">
        {value}
      </strong>
    </div>
  );
}
