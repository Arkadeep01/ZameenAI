import { CircleAlert } from "lucide-react";
import { ChevronDown } from "lucide-react";

/**
 * Desk Validator (LAO) portal — reusable presentational building blocks.
 *
 * Kept identical to the original monolith so no desk-scrutiny screen changes
 * visually after the route split.
 */

export function GovStrip() {
  return (
    <div className="mb-4 flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-semibold tracking-wide">
        <span className="text-amber-400">Government of West Bengal · Department of Land &amp; Land Reforms</span>
        <span className="mx-2 text-slate-500">|</span>
        <span className="font-normal text-slate-300">National Land Records Digitization &amp; Statutory Acquisition Portal</span>
      </p>
      <p className="flex items-center gap-3 text-[11px] font-semibold">
        <span className="text-slate-300">Reset Demo Fixtures</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> DSC Token: Active
        </span>
      </p>
    </div>
  );
}

export function StatutoryScopeFooter({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
      <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]"><CircleAlert size={13} className="text-amber-500" /> Statutory Authority Scope</p>
      <p className="mt-1">LAO Desk Validation approves digitized data extraction. Statutory awards under Sec 3G / Sec 20F require CALA / DM sign-off. Every action is DSC-signed, DPDP Act 2023 protected and written to the tamper-evident audit log.</p>
      {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const color = value < 75 ? "bg-red-500" : value < 90 ? "bg-amber-500" : "bg-emerald-600";
  const text = value < 75 ? "text-red-600" : value < 90 ? "text-amber-700" : "text-emerald-700";
  const label = value < 75 ? "(Low)" : value < 90 ? "(Moderate)" : "(High)";
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:w-16">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </span>
      <span className={`text-xs font-bold ${text}`}>{value}%</span>
      <span className="hidden text-[11px] text-slate-400 md:inline">{label}</span>
    </span>
  );
}

export function QueueStatusPill({ status }: { status: string }) {
  if (status === "Returned")
    return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Returned</span>;
  if (status === "In Review")
    return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />In Review</span>;
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Pending Validation</span>;
}

export function PriorityPill({ p }: { p: string }) {
  const tone = p === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" : p === "HIGH" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black tracking-wide ${tone}`}>{p}</span>;
}

export function TableShell({ children, minWidth = "min-w-[960px]" }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} text-left`}>{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}

export function FakeFilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      {label} <ChevronDown size={14} className="text-slate-400" />
    </label>
  );
}
