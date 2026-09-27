import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Calendar, Building2, ChevronRight } from "lucide-react";

export interface CommunicationItem {
  id: string;
  badge: "NEW" | "ACTION REQUIRED" | "READ";
  title: string;
  authority: string;
  date: string;
  targetUrl: string;
}

const DEFAULT_COMMUNICATIONS: CommunicationItem[] = [
  {
    id: "comm-1",
    badge: "NEW",
    title: "Land Acquisition Notification (NH-31 Corridor)",
    authority: "District Administration, Varanasi",
    date: "18 Sep 2026",
    targetUrl: "/citizen/notices",
  },
  {
    id: "comm-2",
    badge: "ACTION REQUIRED",
    title: "Compensation Bank Verification Notice",
    authority: "District Land Acquisition Office (CALA)",
    date: "16 Sep 2026",
    targetUrl: "/citizen/compensation",
  },
  {
    id: "comm-3",
    badge: "READ",
    title: "Public Hearing & Objections Notice under Section 15",
    authority: "Competent Authority Land Acquisition",
    date: "10 Sep 2026",
    targetUrl: "/citizen/notices",
  },
];

interface ImportantCommunicationsProps {
  items?: CommunicationItem[];
  isLoading?: boolean;
}

export const ImportantCommunications: React.FC<ImportantCommunicationsProps> = ({
  items = DEFAULT_COMMUNICATIONS,
  isLoading,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <section className="h-full rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="space-y-3 pt-2">
          <div className="h-16 rounded-lg bg-slate-100" />
          <div className="h-16 rounded-lg bg-slate-100" />
          <div className="h-16 rounded-lg bg-slate-100" />
        </div>
      </section>
    );
  }

  const getBadgeStyle = (badge: CommunicationItem["badge"]) => {
    switch (badge) {
      case "NEW":
        return "bg-[#EAF3FC] text-[#1261A8] border-[#B8D7F9]";
      case "ACTION REQUIRED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "READ":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <section
      aria-labelledby="important-communications-heading"
      className="flex h-full flex-col justify-between rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-4">
          <div>
            <h2
              id="important-communications-heading"
              className="text-lg font-bold tracking-tight text-[#062B52]"
            >
              IMPORTANT COMMUNICATIONS
            </h2>
            <p className="mt-0.5 text-xs text-[#607089]">
              Official gazettes, notifications, and statutory orders
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {items.length} Notices
          </span>
        </div>

        {/* Clean Communications List */}
        <div className="mt-4 divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate({ to: item.targetUrl as any })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate({ to: item.targetUrl as any });
                }
              }}
              className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 py-3.5 transition hover:bg-[#F9FBFE] cursor-pointer rounded-lg px-2.5 -mx-2.5 focus-visible:outline-2 focus-visible:outline-[#1261A8]"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide border ${getBadgeStyle(
                      item.badge
                    )}`}
                  >
                    {item.badge}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Official Gazette / Order
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#062B52] group-hover:text-[#1261A8] transition truncate">
                  {item.title}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 text-xs text-[#607089]">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Building2 size={12} className="text-slate-400" aria-hidden="true" />
                    {item.authority}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Calendar size={12} className="text-slate-400" aria-hidden="true" />
                    {item.date}
                  </span>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center text-slate-400 group-hover:text-[#1261A8] transition">
                <ChevronRight size={18} aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-5 border-t border-[#D9E2EC] pt-4">
        <Link
          to="/citizen/notices"
          className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-4 py-2.5 text-sm font-semibold text-[#062B52] transition hover:bg-[#EAF3FC] hover:border-[#1261A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
        >
          <span>View All Notices</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default ImportantCommunications;
