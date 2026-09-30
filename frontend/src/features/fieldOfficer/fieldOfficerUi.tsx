import { ChevronDown } from "lucide-react";

/**
 * Field Officer portal — reusable presentational building blocks.
 *
 * Kept identical to the original monolith so no field screen changes visually.
 */

export function PriPill({ p }: { p: string }) {
  const tone =
    p === "Urgent" ? "bg-red-100 text-red-800"
    : p === "High" ? "bg-amber-100 text-amber-800"
    : p === "Medium" ? "bg-slate-100 text-slate-600"
    : "bg-slate-100 text-slate-500";
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>{p}</span>;
}

export function StatusPill({ s }: { s: string }) {
  const tone =
    s === "In Progress" ? "bg-blue-50 text-blue-700"
    : s === "Assigned" ? "bg-slate-100 text-slate-600"
    : s === "Needs Clarification" ? "bg-red-50 text-red-700"
    : s === "Submitted" ? "bg-emerald-50 text-emerald-700"
    : s === "Completed" || s === "Verified" ? "bg-emerald-100 text-emerald-800"
    : s === "Under Review" ? "bg-blue-50 text-blue-700"
    : s === "Open" ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-600";
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}>{s}</span>;
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50/70 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}

export function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={16} className="shrink-0 text-slate-500" />
    </label>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-bold text-slate-700">{children}</p>;
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange?: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600"
    />
  );
}

export function RadioCard({ selected, onClick, title, desc }: { selected: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start justify-between gap-2 rounded-xl border p-3.5 text-left transition ${selected ? "border-emerald-800 bg-emerald-50/60 ring-1 ring-emerald-800" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <span>
        <span className="block text-xs font-bold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{desc}</span>
      </span>
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-emerald-800" : "border-slate-300"}`}>
        {selected && <span className="h-2 w-2 rounded-full bg-emerald-800" />}
      </span>
    </button>
  );
}
