import React from "react";
import { Landmark, Layers, CheckCircle2, AlertTriangle } from "lucide-react";

interface MyAcquisitionOverviewProps {
  totalParcels: number;
  underAcquisition: number;
  completed: number;
  actionRequired: number;
  hasCases: boolean;
}

export const MyAcquisitionOverview: React.FC<MyAcquisitionOverviewProps> = ({
  totalParcels,
  underAcquisition,
  completed,
  actionRequired,
  hasCases,
}) => {
  return (
    <section
      aria-label="Acquisition Overview Summary"
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            My Acquisition Overview
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Summary of land holdings under government acquisition procedures
          </p>
        </div>
      </div>

      {!hasCases ? (
        <div className="py-2 text-xs font-medium text-slate-600">
          No acquisition cases currently linked to your land.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total Land Parcels */}
          <div className="rounded-lg bg-slate-50/80 border border-slate-200/70 p-3.5 transition-colors">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Landmark size={15} className="text-slate-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Land Parcels
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-[#062B52]">
                {totalParcels}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Registered
              </span>
            </div>
          </div>

          {/* Under Acquisition */}
          <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3.5 transition-colors">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Layers size={15} className="text-[#1261A8]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                Under Acquisition
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-[#062B52]">
                {underAcquisition}
              </span>
              <span className="text-xs font-medium text-blue-700">
                {underAcquisition === 1 ? "Active Parcel" : "Active Parcels"}
              </span>
            </div>
          </div>

          {/* Completed */}
          <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3.5 transition-colors">
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Completed
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-[#062B52]">
                {completed}
              </span>
              <span className="text-xs font-medium text-emerald-700">
                {completed === 1 ? "Settled Case" : "Settled Cases"}
              </span>
            </div>
          </div>

          {/* Action Required */}
          <div
            className={`rounded-lg p-3.5 border transition-colors ${
              actionRequired > 0
                ? "bg-amber-50/70 border-amber-200"
                : "bg-slate-50/80 border-slate-200/70"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle
                size={15}
                className={actionRequired > 0 ? "text-amber-700" : "text-slate-400"}
              />
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  actionRequired > 0 ? "text-amber-900" : "text-slate-500"
                }`}
              >
                Action Required
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  actionRequired > 0 ? "text-amber-900" : "text-[#062B52]"
                }`}
              >
                {actionRequired}
              </span>
              <span
                className={`text-xs font-medium ${
                  actionRequired > 0 ? "text-amber-800" : "text-slate-500"
                }`}
              >
                {actionRequired === 1 ? "Pending Action" : "Pending Actions"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MyAcquisitionOverview;
