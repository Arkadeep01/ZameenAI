import { AlertTriangle, CheckCircle2, Grid2X2, LandPlot } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  suffix: string;
  description: string;
  type?: "normal" | "warning" | "danger";
}

export default function StatCard({
  label,
  value,
  suffix,
  description,
  type = "normal",
}: StatCardProps) {
  const isWarning = type === "warning";
  const isDanger = type === "danger";

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 sm:p-6",
        "min-h-[135px] flex flex-col justify-between",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md",
        "active:translate-y-0",

        !isWarning &&
          !isDanger &&
          "border-slate-200/90 bg-white hover:border-sky-200",

        isWarning && "border-amber-200 bg-[#fffaf2] hover:border-amber-300",

        isDanger && "border-red-200 bg-[#fff7f5] hover:border-red-300",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-3">
          {/* LABEL */}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>

          {/* ICON */}
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              "transition-transform duration-200",
              "group-hover:scale-105",

              !isWarning && !isDanger && "bg-[#edf7fc] text-[#286582]",

              isWarning && "bg-amber-100 text-amber-700",

              isDanger && "bg-red-100 text-red-700",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isDanger ? (
              <AlertTriangle size={18} />
            ) : isWarning ? (
              <LandPlot size={18} />
            ) : (
              <Grid2X2 size={18} />
            )}
          </div>
        </div>

        {/* VALUE */}
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={[
              "text-3xl sm:text-4xl font-extrabold leading-none tracking-tight",

              !isWarning && !isDanger && "text-[#173b55]",

              isWarning && "text-amber-700",

              isDanger && "text-red-700",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {value}
          </span>

          <span className="text-xs sm:text-sm font-bold text-slate-500">
            {suffix}
          </span>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="mt-3.5">
        <div className="flex items-start gap-2">
          <CheckCircle2
            size={14}
            className={[
              "mt-0.5 shrink-0",

              isDanger
                ? "text-red-500"
                : isWarning
                  ? "text-amber-600"
                  : "text-emerald-600",
            ].join(" ")}
          />

          <p className="m-0 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>

        {/* URGENT ACTION */}
        {isDanger && (
          <button
            type="button"
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#14384f] px-3.5 py-1.5 text-xs font-bold text-white transition-all duration-200 hover:bg-[#0b2b3e] hover:shadow-sm active:scale-[0.98]"
          >
            Resolve Action →
          </button>
        )}
      </div>
    </article>
  );
}
