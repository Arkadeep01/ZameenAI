import { ChevronDown } from "lucide-react";

/**
 * PIA portal — reusable presentational building blocks.
 *
 * Same markup/tone rules as the original monolith so no screen changes visually.
 */

export function StagePill({ stage }: { stage: string }) {
  const s = stage.toLowerCase();
  const tone =
    s.includes("return") ? "border-red-200 bg-red-50 text-red-700"
    : s.includes("desk") ? "border-amber-200 bg-amber-50 text-amber-800"
    : s.includes("field") ? "border-teal-200 bg-teal-50 text-teal-800"
    : s.includes("cala") || s.includes("dm") ? "border-violet-200 bg-violet-50 text-violet-800"
    : s.includes("freeze") || s.includes("acquir") ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{stage}</span>;
}

export function PriPill({ p }: { p: string }) {
  const tone = p === "CRITICAL" ? "border-red-200 bg-red-50 text-red-700" : p === "HIGH" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black tracking-wide ${tone}`}>{p}</span>;
}

export function DocState({ s }: { s: string }) {
  const tone = s === "VALIDATED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : s === "REJECTED" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}

export function MStatus({ s }: { s: string }) {
  const tone = s === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : s === "DELAYED" ? "border-amber-200 bg-amber-50 text-amber-800" : s === "IN PROGRESS" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-500";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}

export function TableShell({ children, minWidth = "min-w-[960px]" }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto"><table className={`w-full ${minWidth} text-left`}>{children}</table></div>;
}

export function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={14} className="shrink-0 text-slate-400" />
    </label>
  );
}
