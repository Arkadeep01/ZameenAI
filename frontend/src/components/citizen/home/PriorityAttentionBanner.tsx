import React from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, ArrowRight, Calendar, FileText } from "lucide-react";

interface PriorityAttentionBannerProps {
  hasPendingAction?: boolean;
  actionTitle?: string;
  actionDescription?: string;
  caseId?: string;
  dueDate?: string;
  actionUrl?: string;
}

export const PriorityAttentionBanner: React.FC<PriorityAttentionBannerProps> = ({
  hasPendingAction = true,
  actionTitle = "Compensation bank verification",
  actionDescription = "Your bank details for Khasra 184/2 need verification before compensation can be processed.",
  caseId = "ACQ-2026-00182",
  dueDate = "28 Sep 2026",
  actionUrl = "/citizen/compensation",
}) => {
  if (hasPendingAction) {
    return (
      <section
        aria-labelledby="priority-attention-heading"
        className="w-full rounded-xl border border-amber-200 bg-[#FFFDF8] p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Content side */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertCircle size={20} aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  id="priority-attention-heading"
                  className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-900"
                >
                  NEEDS YOUR ATTENTION
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Direct Benefit Transfer Requirement
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[#062B52]">
                {actionTitle}
              </h3>

              <p className="text-sm leading-relaxed text-[#062B52] max-w-3xl">
                {actionDescription}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-[#607089]">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText size={13} className="text-slate-400" aria-hidden="true" />
                  Case: <strong className="text-[#062B52]">{caseId}</strong>
                </span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
                  <Calendar size={13} className="text-amber-700" aria-hidden="true" />
                  Due: <strong>{dueDate}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action button: 44px min height for touch target */}
          <div className="shrink-0 self-start lg:self-center pl-14 lg:pl-0">
            <Link
              to={actionUrl}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#1261A8] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#062B52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
            >
              <span>Review Now</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Caught up / subtle success state
  return (
    <section
      aria-labelledby="caught-up-heading"
      className="w-full rounded-xl border border-emerald-200 bg-[#F8FCFA] p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#16855B]">
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>
          <div>
            <span
              id="caught-up-heading"
              className="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-emerald-900"
            >
              YOU'RE ALL CAUGHT UP
            </span>
            <p className="mt-1 text-sm font-medium text-[#062B52]">
              There are no pending actions for your land records.
            </p>
            <p className="text-xs text-[#607089]">
              All cadastral documentation and verification records are current.
            </p>
          </div>
        </div>

        <div className="shrink-0 pl-14 sm:pl-0">
          <Link
            to="/citizen/my-land"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-semibold text-[#062B52] shadow-xs transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
          >
            <span>View My Land</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PriorityAttentionBanner;
