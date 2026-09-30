import type { ReactNode } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import type { Docket } from "./approverData";

/**
 * Approver (CALA / DM-DC) portal — reusable presentational building blocks.
 *
 * Byte-for-byte equivalent of the helpers declared in the original
 * `approver.tsx` monolith so the quasi-judicial screens are visually
 * unchanged after the route split.
 */

export function StatusPill({ s }: { s: string }) {
  const t = s.toLowerCase();
  const tone =
    t.includes("approv") && !t.includes("await") ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : t.includes("stay") ? "border-red-200 bg-red-50 text-red-700"
    : t.includes("contest") ? "border-amber-200 bg-amber-50 text-amber-800"
    : t.includes("possession") ? "border-blue-200 bg-blue-50 text-blue-700"
    : t.includes("closed") ? "border-slate-300 bg-slate-100 text-slate-600"
    : t.includes("deliver") ? "border-teal-200 bg-teal-50 text-teal-700"
    : t.includes("pending") || t.includes("await") ? "border-amber-200 bg-amber-50 text-amber-800"
    : t.includes("hearing") || t.includes("dispos") ? "border-indigo-200 bg-indigo-50 text-indigo-700"
    : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}>{s}</span>;
}

export function PriPill({ p }: { p: string }) {
  const tone = p === "Critical" ? "border-red-200 bg-red-50 text-red-700" : p === "High" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-black ${tone}`}>{p}</span>;
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-4 py-3 text-xs ${className}`}>{children}</td>;
}

export function TableShell({ children, minWidth = "min-w-[960px]" }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} text-left`}>{children}</table>
    </div>
  );
}

export function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={14} className="shrink-0 text-slate-400" />
    </label>
  );
}

export function CountBadge({ n }: { n: number }) {
  return <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-xs font-black text-amber-800">{n} Dockets</span>;
}

/** Mobile fallback card list used by the shared docket directory table. */
export function DocketCards({ rows, onOpen }: { rows: Docket[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-3 lg:hidden">
      {rows.map((d) => (
        <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[11px] font-bold text-amber-700">{d.id}</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{d.project}</p>
          <p className="text-[11px] text-slate-500">{d.parcels} parcels · {d.area} · {d.compensation}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusPill s={d.status} /> <PriPill p={d.priority} />
          </div>
          <button onClick={() => onOpen(d.id)} className="mt-3 w-full rounded-lg bg-[#0B2A5B] py-2 text-xs font-bold text-white">Open Docket →</button>
        </div>
      ))}
    </div>
  );
}

/**
 * Desktop table + mobile cards shared by the All / Contested / Stayed /
 * Approved directory screens (was the `docketTable` helper in the monolith).
 */
export function DocketTable({ rows, onOpen }: { rows: Docket[]; onOpen: (id: string) => void }) {
  return (
    <>
      <div className="hidden lg:block">
        <TableShell minWidth="min-w-[1000px]">
          <thead>
            <tr>
              <Th>Case ID</Th><Th>Project &amp; Implementing Agency</Th><Th className="text-center">Parcels</Th>
              <Th className="text-right">Total Area</Th><Th>Status</Th><Th className="text-right">Compensation Assessed</Th>
              <Th>Current Stage</Th><Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-sky-50/40">
                <Td>
                  <p className="font-mono font-bold text-amber-700">{d.id}</p>
                  {d.status === "Contested" && <p className="mt-0.5 text-[10px] font-semibold text-slate-400">● Contested Title</p>}
                  {d.status === "Stayed" && <p className="mt-0.5 text-[10px] font-semibold text-red-500">▲ Court Stay Active</p>}
                </Td>
                <Td><p className="max-w-[260px] font-semibold text-slate-800">{d.project}</p><p className="max-w-[260px] truncate text-[11px] text-slate-400">{d.agency}</p></Td>
                <Td className="text-center font-mono">{d.parcels}</Td>
                <Td className="text-right font-mono">{d.area}</Td>
                <Td><StatusPill s={d.status} /></Td>
                <Td className="text-right font-mono font-semibold">{d.compensation}</Td>
                <Td className="text-slate-600">{d.stage}</Td>
                <Td className="text-right"><button onClick={() => onOpen(d.id)} className="whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100">Open Docket →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
      <div className="p-4 lg:hidden">
        <DocketCards rows={rows} onOpen={onOpen} />
      </div>
    </>
  );
}

/** Portal-wide statutory authority scope note (rendered by the parent shell). */
export function StatutoryScopeFooter({ actions }: { actions?: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
      <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]"><ShieldCheck size={13} className="text-amber-500" /> Statutory Authority Scope</p>
      <p className="mt-1">CALA approvals constitute binding acquisition awards under Sec 3G / Sec 23. Possession handover requires DM/DC sign-off. Every action is DSC-signed and written to the tamper-evident quasi-judicial audit log.</p>
      {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
