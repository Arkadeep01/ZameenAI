import React from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export interface PendingAcquisitionAction {
  title?: string;
  khasraNumber: string;
  projectTitle: string;
  actionUrl: string;
  buttonText?: string;
  deadline?: string;
}

interface MyAcquisitionPriorityAlertProps {
  pendingAction: PendingAcquisitionAction | null;
}

export const MyAcquisitionPriorityAlert: React.FC<MyAcquisitionPriorityAlertProps> = ({
  pendingAction,
}) => {
  if (pendingAction) {
    return (
      <aside
        aria-label="Pending Action Notice"
        className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <AlertCircle size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Action Required
                </span>
                {pendingAction.deadline && (
                  <span className="text-[11px] font-medium text-amber-800">
                    Deadline: {pendingAction.deadline}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {pendingAction.title || "Compensation verification is pending for:"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#062B52]">
                <span className="rounded bg-white/90 px-2 py-0.5 border border-amber-200">
                  {pendingAction.khasraNumber}
                </span>
                <span className="text-slate-400">•</span>
                <span>{pendingAction.projectTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center sm:self-center">
            <Link
              to={pendingAction.actionUrl}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#062B52] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#0C396E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <span>{pendingAction.buttonText || "Review Now"}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="No Pending Actions"
      className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-4 sm:p-4.5 shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
            You're All Caught Up
          </h3>
          <p className="text-xs text-emerald-800/90 mt-0.5">
            There are no pending actions for your acquisition cases. All filings and verifications are in order.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default MyAcquisitionPriorityAlert;
