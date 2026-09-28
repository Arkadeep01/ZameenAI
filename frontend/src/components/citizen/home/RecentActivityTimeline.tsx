import React from "react";
import { Link } from "@tanstack/react-router";
import { History, Clock, ArrowRight, Inbox } from "lucide-react";
import { useCitizenActivity } from "../../../services/citizen";

interface RecentActivityTimelineProps {
  isLoading?: boolean;
  limit?: number;
}

export const RecentActivityTimeline: React.FC<
  RecentActivityTimelineProps
> = ({ isLoading, limit = 6 }) => {
  const { data: activity } = useCitizenActivity();
  const items = (activity ?? []).slice(0, limit);

  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="w-full rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-3 border-b border-[#D9E2EC] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EAF3FC] text-[#1261A8]">
              <History size={16} aria-hidden="true" />
            </div>
            <h2
              id="recent-activity-heading"
              className="text-lg font-bold tracking-tight text-[#062B52]"
            >
              RECENT ACTIVITY
            </h2>
          </div>
          <p className="mt-1.5 text-xs text-[#607089]">
            An official log of your portal actions and revenue department updates
          </p>
        </div>

        <Link
          to="/citizen/activity"
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#D9E2EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#1261A8] shadow-xs transition-colors hover:border-[#1261A8]/40 hover:bg-[#EAF3FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8] sm:self-auto"
        >
          <span>View Full History</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* ================= LOADING ================= */}
      {isLoading && (
        <ul className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-[#EAF3FC] bg-[#F6F8FB] p-3 animate-pulse"
            >
              <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 rounded bg-slate-200" />
                <div className="h-2.5 w-72 max-w-full rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ================= EMPTY STATE ================= */}
      {!isLoading && items.length === 0 && (
        <div className="mt-4 flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#D9E2EC] bg-[#F6F8FB] p-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 border border-[#D9E2EC]">
            <Inbox size={20} aria-hidden="true" />
          </div>
          <p className="mt-2.5 text-sm font-semibold text-[#062B52]">
            No recent activity logged
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-[#607089]">
            Actions such as downloading a Record of Rights, viewing cadastral maps, or
            filing an objection will appear here as soon as they are recorded.
          </p>
        </div>
      )}

      {/* ================= ACTIVITY TIMELINE ================= */}
      {!isLoading && items.length > 0 && (
        <ol className="mt-4 space-y-0">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={item.id} className="flex gap-3.5">
                {/* Rail: dot + connector line */}
                <div className="flex flex-col items-center pt-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1261A8] ring-4 ring-[#EAF3FC]"
                    aria-hidden="true"
                  />
                  {!isLast && (
                    <span
                      className="mt-1 w-px flex-1 bg-[#D9E2EC]"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Entry */}
                <div
                  className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-5"}`}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="text-sm font-semibold text-[#062B52]">
                      {item.action}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Clock size={11} aria-hidden="true" />
                      {item.timestamp}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="mt-0.5 text-xs leading-relaxed text-[#607089]">
                      {item.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default RecentActivityTimeline;
