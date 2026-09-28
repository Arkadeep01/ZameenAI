import React from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { AcquisitionCase } from "../../../services/acquisition";

interface MyAcquisitionRecentUpdatesProps {
  cases: AcquisitionCase[];
}

export interface AcquisitionUpdateItem {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  type: "status" | "doc" | "verification";
}

export const MyAcquisitionRecentUpdates: React.FC<
  MyAcquisitionRecentUpdatesProps
> = ({ cases }) => {
  // Dynamically extract recent updates from case stages
  const updates: AcquisitionUpdateItem[] = React.useMemo(() => {
    const list: AcquisitionUpdateItem[] = [];

    cases.forEach((c) => {
      // Find stages with dates
      (c.stages || []).forEach((stg) => {
        if (stg.date) {
          list.push({
            id: `${c.id}-${stg.id}`,
            date: stg.date,
            title: stg.title,
            subtitle: `${c.khasraNumber} • ${c.projectTitle}`,
            type: stg.status === "COMPLETED" ? "status" : "verification",
          });
        }
        // Also check stage documents
        (stg.documents || []).forEach((doc) => {
          list.push({
            id: `doc-${doc.id}`,
            date: doc.issuedDate,
            title: doc.title,
            subtitle: `${c.id} • ${doc.type}`,
            type: "doc",
          });
        });
      });
    });

    // Return the latest 4 items
    return list.slice(0, 4);
  }, [cases]);

  return (
    <section
      aria-label="Recent Acquisition Updates"
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#1261A8]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Recent Updates
          </h2>
        </div>
      </div>

      {updates.length === 0 ? (
        <p className="py-3 text-xs text-slate-500">
          No recent acquisition activity recorded.
        </p>
      ) : (
        <div className="space-y-3">
          {updates.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-100 text-[#1261A8] mt-0.5">
                {item.type === "doc" ? (
                  <FileText size={13} />
                ) : (
                  <CheckCircle2 size={13} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-500">
                  {item.date}
                </span>
                <p className="text-xs font-bold text-[#062B52] leading-snug line-clamp-1">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          to="/citizen/activity"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#062B52] shadow-xs transition-colors hover:bg-slate-50 hover:text-[#1261A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span>View All Activity</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
};

export default MyAcquisitionRecentUpdates;
