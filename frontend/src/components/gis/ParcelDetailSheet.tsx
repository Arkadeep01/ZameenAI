import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeIndianRupee,
  CircleAlert,
  Download,
  FileText,
  Info,
  MapPinned,
  ShieldCheck,
} from "lucide-react";

import type { Parcel } from "../../types/gis";

interface ParcelDetailSheetProps {
  parcel: Parcel;
}

export default function ParcelDetailSheet({ parcel }: ParcelDetailSheetProps) {
  const navigate = useNavigate();
  const isAcquisition = parcel.status === "acquisition";

  return (
    <aside className="flex h-fit flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4f8] text-[#174b69]">
            <FileText size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#173c56]">
                Selected Land Parcel
              </h2>

              <span className="rounded-full bg-[#edf7fa] px-2.5 py-0.5 text-xs font-semibold text-[#174b69]">
                Parcel #{parcel.id}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-slate-400">
              CADASTRAL DETAIL SHEET
              {parcel.khatauni ? ` • Khatauni: ${parcel.khatauni}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* DETAILS GRID                                                       */}
      {/* ================================================================== */}

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <DetailBox label="Village / Mauza" value={parcel.village} />

        <DetailBox
          label="Tehsil / District"
          value={`${parcel.tehsil}, ${parcel.district}`}
        />

        <DetailBox label="Khasra Number" value={parcel.khasraNumber} large />

        <DetailBox
          label="Total Area"
          value={`${parcel.area.toFixed(2)} Acres`}
          secondary={`(${(parcel.area * 4046.8564224).toLocaleString("en-IN", {
            maximumFractionDigits: 1,
          })} sq.m)`}
        />

        <DetailBox label="Land Type" value={parcel.landType} />

        <DetailBox
          label="Lagaan (Annual Tax)"
          value={parcel.lagaan ?? "Not Available"}
        />
      </div>

      {/* ================================================================== */}
      {/* ACQUISITION                                                        */}
      {/* ================================================================== */}

      {isAcquisition && (
        <div className="mt-4 rounded-xl border border-orange-100 bg-[#fff6e8] p-4">
          {/* TITLE */}

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0 text-orange-600"
              />

              <div>
                <h3 className="text-sm font-bold text-[#8a5100]">
                  Under Acquisition
                </h3>

                <p className="mt-0.5 text-xs text-orange-700">
                  Government project notice
                </p>
              </div>
            </div>

            <span className="rounded-md bg-orange-200 px-2 py-1 text-xs font-bold text-orange-800">
              ACTIVE NOTICE
            </span>
          </div>

          {/* REASON */}

          <p className="mt-3 text-xs leading-relaxed text-[#704200]">
            <strong>Reason:</strong> {parcel.acquisition?.reason}
          </p>

          {/* STATUS TABLE */}

          <div className="mt-2.5 rounded-lg bg-white/80 p-3">
            <InfoRow
              label="Gazette Notification:"
              value={`${parcel.acquisition?.gazetteDate} ${parcel.acquisition?.notificationYear}`}
            />

            <InfoRow
              label="Next Step:"
              value={parcel.acquisition?.nextStep ?? "Processing"}
              highlighted
            />
          </div>

          {/* LAW */}

          <div className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-orange-800">
            <Info size={14} className="mt-0.5 shrink-0" />

            {parcel.acquisition?.law}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DESCRIPTION                                                        */}
      {/* ================================================================== */}

      {!isAcquisition && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <h3 className="text-xs font-bold text-emerald-800">
                Land Status
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                {parcel.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ACTIONS                                                            */}
      {/* ================================================================== */}

      <div className="mt-4 space-y-2.5">
        {/* FULL DETAILS */}

        <ActionButton
          icon={<FileText size={16} />}
          label="View Land Details"
          dark
          onClick={() =>
            navigate({
              to: "/citizen/land-details",
              search: {
                parcel: String(parcel.id).replace(/^["']|["']$/g, ""),
              },
            })
          }
        />

        {/* COMPENSATION */}

        {isAcquisition && (
          <ActionButton
            icon={<BadgeIndianRupee size={16} />}
            label="Check Compensation & Valuation"
            green
            onClick={() =>
              navigate({
                to: "/citizen/land-details",
                search: {
                  parcel: String(parcel.id),
                },
              })
            }
          />
        )}

        {/* DIRECTIONS */}

        <ActionButton
          icon={<MapPinned size={16} />}
          label="Get Driving Directions to Land"
        />

        {/* DOWNLOAD */}

        <ActionButton
          icon={<Download size={16} />}
          label="Download Cadastral Map Slip (Naksha)"
          blue
        />
      </div>

      {/* ================================================================== */}
      {/* HELP                                                               */}
      {/* ================================================================== */}

      <div className="mt-4 rounded-xl border border-sky-100 bg-[#e5f3fb] p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />

          <div>
            <div className="text-xs text-slate-500">
              Need Land Registry Help?
            </div>

            <div className="mt-1 text-xs sm:text-sm font-bold leading-tight text-[#174b69]">
              Tehsildar Camp Office:
              <br />
              +91 542 222-108
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ========================================================================== */
/* DETAIL BOX                                                                 */
/* ========================================================================== */

function DetailBox({
  label,
  value,
  secondary,
  large = false,
}: {
  label: string;
  value: string;
  secondary?: string;
  large?: boolean;
}) {
  return (
    <div className="min-h-[66px] rounded-xl bg-[#f8fafc] border border-slate-100 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>

      <div
        className={`mt-0.5 font-bold leading-tight text-[#173b55] ${
          large ? "text-base sm:text-lg" : "text-sm"
        }`}
      >
        {value}
      </div>

      {secondary && (
        <div className="mt-0.5 text-xs text-slate-400">{secondary}</div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* INFO ROW                                                                   */
/* ========================================================================== */

function InfoRow({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>

      <span
        className={`text-right text-xs font-bold ${
          highlighted ? "text-emerald-700" : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ========================================================================== */
/* ACTION BUTTON                                                              */
/* ========================================================================== */

function ActionButton({
  icon,
  label,
  dark,
  green,
  blue,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  dark?: boolean;
  green?: boolean;
  blue?: boolean;
  onClick?: () => void;
}) {
  let classes = "border-slate-200 bg-white text-[#173b55]";

  if (dark) {
    classes = "border-[#0c3b5d] bg-[#0c3b5d] text-white";
  }

  if (green) {
    classes = "border-emerald-700 bg-[#287447] text-white";
  }

  if (blue) {
    classes = "border-sky-100 bg-[#e5f3fb] text-[#174b69]";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 ${classes}`}
    >
      {icon}

      <span>{label}</span>

      {!dark && !green && (
        <ArrowRight size={14} className="ml-auto opacity-50" />
      )}
    </button>
  );
}
