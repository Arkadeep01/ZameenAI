import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Calendar,
} from "lucide-react";
import { AcquisitionCase } from "../../../services/acquisition";

interface MyAcquisitionCaseCardProps {
  caseItem: AcquisitionCase;
}

export const MyAcquisitionCaseCard: React.FC<MyAcquisitionCaseCardProps> = ({
  caseItem,
}) => {
  // Compute stage statistics
  const stages = caseItem.stages || [];
  const totalStages = stages.length || 9;
  const completedStages = stages.filter((s) => s.status === "COMPLETED").length;
  const currentStage =
    stages.find((s) => s.status === "CURRENT") ||
    stages.find((s) => s.status === "ACTION_REQUIRED") ||
    stages[completedStages] ||
    stages[0];

  // Determine next step from data
  const nextStage = stages.find((s) => s.status === "UPCOMING");
  const nextStepText =
    currentStage?.whatHappensNext ||
    nextStage?.title ||
    (completedStages === totalStages ? "All acquisition stages concluded" : null);

  // Status mapping
  const normalizedStatus = (caseItem.statusLabel || "In Progress").toUpperCase();
  const hasActionRequired =
    normalizedStatus === "ACTION REQUIRED" ||
    stages.some((s) => s.status === "ACTION_REQUIRED" || s.citizenAction);

  const getStatusBadge = () => {
    if (hasActionRequired) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          <AlertCircle size={13} className="text-amber-700" />
          ACTION REQUIRED
        </span>
      );
    }
    if (normalizedStatus.includes("COMPLETED")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          <CheckCircle2 size={13} className="text-emerald-600" />
          COMPLETED
        </span>
      );
    }
    if (normalizedStatus.includes("HOLD")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-900">
          <Hourglass size={13} className="text-orange-600" />
          ON HOLD
        </span>
      );
    }
    if (normalizedStatus.includes("CLOSED")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          CLOSED
        </span>
      );
    }
    // Default: IN PROGRESS (blue)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-[#1261A8]">
        <span className="h-2 w-2 rounded-full bg-[#1261A8]" />
        IN PROGRESS
      </span>
    );
  };

  const progressPercent = Math.min(
    100,
    Math.round((completedStages / (totalStages || 1)) * 100),
  );

  return (
    <article
      aria-label={`Acquisition case ${caseItem.id} for ${caseItem.khasraNumber}`}
      className="group relative rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs transition-all duration-150 hover:border-[#1261A8]/40 hover:shadow-md"
    >
      {/* Top Header: Project Name & Status Badge */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Project
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-semibold text-slate-600">
              Case ID: {caseItem.id}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#062B52]">
            {caseItem.projectTitle}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1">
            {caseItem.acquiringAuthority}
          </p>
        </div>

        <div className="self-start sm:self-auto shrink-0">
          {getStatusBadge()}
        </div>
      </div>

      {/* Middle Information Row: Land Parcel, Area, Location */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 rounded-lg bg-slate-50/70 border border-slate-200/70 p-3.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Land Parcel
          </span>
          <p className="mt-0.5 text-sm font-bold text-[#062B52]">
            {caseItem.khasraNumber}
          </p>
          {caseItem.khataNumber && (
            <p className="text-[11px] text-slate-500">
              Khata: {caseItem.khataNumber}
            </p>
          )}
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Affected Area
          </span>
          <p className="mt-0.5 text-sm font-bold text-[#062B52]">
            {caseItem.area}
          </p>
          <p className="text-[11px] text-slate-500">Statutory Survey Demarcated</p>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Location
          </span>
          <p className="mt-0.5 text-sm font-bold text-[#062B52] flex items-center gap-1">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span>
              {caseItem.village}, {caseItem.tehsil}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">
            {caseItem.district}, {caseItem.state}
          </p>
        </div>
      </div>

      {/* Current Stage & Progress Bar */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Current Stage
            </span>
            <p className="text-sm font-bold text-[#062B52]">
              {caseItem.currentStageName || currentStage?.title || "Under Review"}
            </p>
          </div>
          <div className="text-xs font-medium text-slate-600">
            <span className="font-bold text-[#1261A8]">{completedStages}</span> of{" "}
            <span className="font-bold text-slate-800">{totalStages}</span> stages completed
          </div>
        </div>

        {/* Process Progress Bar */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/80"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Stage progress: ${completedStages} of ${totalStages} completed`}
        >
          <div
            className="h-full rounded-full bg-[#1261A8] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Next Step (Only shown if determined from actual case data) */}
      {nextStepText && (
        <div className="mt-3.5 rounded-lg bg-sky-50/50 border border-sky-100/80 p-3 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1261A8]">
            Next Step
          </span>
          <p className="mt-0.5 text-slate-700 font-medium line-clamp-2">
            {nextStepText}
          </p>
        </div>
      )}

      {/* Footer: Last updated & Primary Action */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={13} className="text-slate-400" />
          <span>Last updated:</span>
          <span className="font-semibold text-slate-700">
            {caseItem.lastUpdated || "Recently"}
          </span>
        </div>

        <Link
          to="/citizen/acquisition-status"
          search={{ case: caseItem.id }}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#062B52] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#0C396E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span>View Acquisition Status</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
};

export default MyAcquisitionCaseCard;
