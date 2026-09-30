import type { ReactNode } from "react";
import { AccessLevel, type UserStatus } from "./adminData";

/**
 * Admin portal — shared presentational building blocks.
 *
 * These were private functions inside the old monolithic `routes/admin.tsx`.
 * They are table cells, badges and inputs, i.e. reusable widgets (NOT pages),
 * so they live in a component module and stay out of the route layer.
 */

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`bg-slate-50 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}

export function TableShell({
  children,
  minWidth = "min-w-[900px]",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} text-left`}>{children}</table>
    </div>
  );
}

export function LabelSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-emerald-600"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function UserBadge({ status }: { status: UserStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "SUSPENDED"
        ? "bg-red-50 text-red-700 border-red-200"
        : status === "PENDING_VERIFICATION"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-slate-100 text-slate-500 border-slate-200";
  const label =
    status === "PENDING_VERIFICATION" ? "Pending" : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function HealthBadge({ status }: { status: string }) {
  const tone =
    status === "HEALTHY"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "DEGRADED"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : status === "DISABLED"
          ? "bg-slate-100 text-slate-500 border-slate-200"
          : "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "HEALTHY" ? "animate-pulse" : ""}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function SevBadge({ sev }: { sev: string }) {
  const tone =
    sev === "CRITICAL"
      ? "bg-red-100 text-red-800"
      : sev === "ERROR" || sev === "HIGH"
        ? "bg-orange-100 text-orange-800"
        : sev === "WARNING" || sev === "MEDIUM"
          ? "bg-amber-100 text-amber-800"
          : sev === "LOW"
            ? "bg-blue-100 text-blue-800"
            : "bg-slate-100 text-slate-600";
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}>
      {sev}
    </span>
  );
}

export function AccessBadge({ level, onClick }: { level: AccessLevel; onClick?: () => void }) {
  const tone =
    level === "ALLOWED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : level === "RESTRICTED"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-400 border-slate-200";
  const label =
    level === "NOT_ALLOWED" ? "Denied" : level.charAt(0) + level.slice(1).toLowerCase();
  return (
    <button
      onClick={onClick}
      title={onClick ? "Click to cycle access level" : undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${tone} ${onClick ? "hover:ring-1 hover:ring-slate-300" : "cursor-default"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </button>
  );
}
