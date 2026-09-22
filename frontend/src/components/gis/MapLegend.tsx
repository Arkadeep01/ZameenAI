import { useState } from "react";
import { ChevronDown, ChevronUp, CircleHelp, LockKeyhole } from "lucide-react";

export default function MapLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-[calc(100%-24px)] max-w-[380px] overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-xl backdrop-blur-md transition-all duration-200">
      {/* HEADER */}

      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex cursor-pointer items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-2.5 transition-colors hover:bg-slate-50/80 select-none"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#173b55]">
          <CircleHelp size={16} className="shrink-0 text-[#174b69]" />
          What do the parcel colours mean?
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-bold text-emerald-700 sm:block">
            {" "}
            Live Legend
          </span>
          <button
            type="button"
            aria-label={collapsed ? "Expand legend" : "Collapse legend"}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:text-slate-800"
          >
            {collapsed ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}{" "}
          </button>
        </div>
      </div>

      {/* BODY */}

      {!collapsed && (
        <>
          {/* LEGEND ITEMS */}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3.5 py-3">
            <LegendItem
              color="bg-emerald-600"
              title="Normal / Safe"
              subtitle="Land is clear"
            />

            <LegendItem
              color="bg-yellow-500"
              title="Under Review"
              subtitle="Routine check"
            />

            <LegendItem
              color="bg-orange-500"
              title="Under Acquisition"
              subtitle="Govt. project"
            />

            <LegendItem
              color="bg-red-600"
              title="Disputed"
              subtitle="Legal claim"
            />
          </div>

          {/* INFORMATION */}

          <div className="flex items-start gap-2 border-t border-slate-200 bg-[#edf7fc] px-3.5 py-2.5 text-xs leading-5 text-slate-600">
            <LockKeyhole size={14} className="mt-0.5 shrink-0 text-[#174b69]" />

            <span>
              Zero technical GIS layers needed. Click any coloured box to
              inspect your land.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function LegendItem({
  color,
  title,
  subtitle,
}: {
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${color}`} />

      <div>
        <div className="text-xs font-bold text-slate-700">{title}</div>

        <div className="text-[11px] text-slate-500">({subtitle})</div>
      </div>
    </div>
  );
}
