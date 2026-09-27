import React from "react";
import { Link } from "@tanstack/react-router";
import { CircleHelp, MessageSquareWarning, PhoneCall } from "lucide-react";

export const CitizenHelpSupport: React.FC = () => {
  return (
    <section
      aria-labelledby="citizen-help-heading"
      className="w-full rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        {/* Left: Understated official explanation */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#1261A8]">
            <CircleHelp size={20} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2
              id="citizen-help-heading"
              className="text-base sm:text-lg font-bold text-[#062B52]"
            >
              NEED HELP?
            </h2>
            <p className="text-sm leading-relaxed text-[#607089] max-w-2xl">
              We're here to help you understand your land records, acquisition status, and government notices.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
              <PhoneCall size={12} className="text-slate-400" aria-hidden="true" />
              <span>Toll-Free Revenue Support: 1800-180-1551 (Mon–Sat 9:30 AM to 6:00 PM)</span>
            </div>
          </div>
        </div>

        {/* Right: Two official action buttons (min 44px touch height) */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/citizen/support"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#062B52] shadow-xs transition hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-[#1261A8]"
          >
            <CircleHelp size={16} className="mr-1.5 text-[#1261A8]" aria-hidden="true" />
            <span>Help Center</span>
          </Link>

          <Link
            to="/citizen/support"
            search={{ tab: "grievance" }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#062B52] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1261A8] focus-visible:outline-2 focus-visible:outline-[#062B52]"
          >
            <MessageSquareWarning size={16} className="mr-1.5" aria-hidden="true" />
            <span>Raise a Grievance</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CitizenHelpSupport;
