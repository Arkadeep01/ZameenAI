import type { ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { PortalCard } from "../../components/portal/PortalLayout";
import { ALL_DISTRICTS, INDIA_STATES } from "../../utils/indiaGeo";
import { HEALTH_STATUSES, INFRA_TYPES, MINISTRIES, RFCTLARR_STAGES } from "../../utils/executiveRefs";
import type { Corridor } from "./executiveData";
import { useExecutive } from "./ExecutiveStore";

/**
 * Executive (MIS & DSS) portal — reusable presentational building blocks.
 *
 * Identical to the helpers of the original monolith so no analytics screen
 * changes visually after the route split.
 */

export function HealthPill({ s }: { s: string }) {
  const tone =
    s === "ON TRACK" || s === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : s === "AT RISK" ? "border-amber-200 bg-amber-50 text-amber-800"
    : s === "DELAYED" ? "border-red-200 bg-red-50 text-red-700"
    : "border-slate-700 bg-slate-800 text-slate-200";
  if (s === "BLOCKED")
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-800">■ BLOCKED</span>;
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-black ${tone}`}>● {s}</span>;
}

export function Bar({ pct, color = "bg-emerald-500" }: { pct: number; color?: string }) {
  return (
    <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </span>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-3 py-2.5 text-[11px] ${className}`}>{children}</td>;
}

export function TableShell({ children, minWidth = "min-w-[900px]" }: { children: ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto"><table className={`w-full ${minWidth} text-left`}>{children}</table></div>;
}

export function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={13} className="shrink-0 text-slate-400" />
    </label>
  );
}

export function SectionTag({ children }: { children: ReactNode }) {
  return <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-800">{children}</span>;
}

/** Corridor registry table (desktop + mobile cards) — was `corridorTable`. */
export function CorridorTable({ rows }: { rows: Corridor[] }) {
  return (
    <PortalCard className="!p-0">
      <div className="hidden lg:block">
        <TableShell minWidth="min-w-[1100px]">
          <thead>
            <tr>
              <Th>Project Code / Name</Th><Th>State / District</Th><Th>Type</Th><Th className="text-right">Health Index</Th>
              <Th>Status</Th><Th>Current Statutory Stage</Th><Th className="text-right">Land Acq. / Req.</Th>
              <Th className="text-right">Compensation Paid</Th><Th>Possession %</Th><Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code} className="hover:bg-amber-50/40">
                <Td><p className="max-w-[260px] font-bold text-slate-800">{c.name}</p><p className="font-mono text-[10px] text-slate-400">{c.code}</p></Td>
                <Td><p className="font-medium text-slate-700">{c.state}</p><p className="text-[10px] text-slate-400">{c.district}</p></Td>
                <Td className="max-w-[150px] text-slate-500">{c.type}</Td>
                <Td className={`text-right font-mono font-black ${c.health >= 85 ? "text-emerald-700" : c.health >= 60 ? "text-amber-700" : "text-red-600"}`}>{c.health}/100</Td>
                <Td><HealthPill s={c.status} /></Td>
                <Td className="max-w-[180px] text-slate-500">{c.stage}</Td>
                <Td className="whitespace-nowrap text-right font-mono"><b>{c.landA}</b> <span className="text-slate-400">/ {c.landR}</span></Td>
                <Td className="whitespace-nowrap text-right font-mono"><b className="text-emerald-700">{c.compP}</b> <span className="text-slate-400">/ {c.compA}</span></Td>
                <Td><p className="font-mono text-[11px] font-bold">{c.poss.toFixed(1)}%</p><Bar pct={c.poss} color={c.poss > 90 ? "bg-emerald-500" : c.poss > 60 ? "bg-amber-500" : "bg-red-500"} /></Td>
                <Td className="text-right"><button className="text-[11px] font-bold text-amber-700 hover:text-amber-900">Inspect →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
      <div className="space-y-3 p-4 lg:hidden">
        {rows.map((c) => (
          <div key={c.code} className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[13px] font-bold text-slate-800">{c.name}</p>
            <p className="font-mono text-[10px] text-slate-400">{c.code} · {c.state}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><HealthPill s={c.status} /><span className="font-mono text-[11px] font-bold">{c.health}/100</span></div>
            <p className="mt-1.5 font-mono text-[11px] text-slate-500">Land {c.landA}/{c.landR} · Paid {c.compP} · Poss {c.poss.toFixed(1)}%</p>
            <Bar pct={c.poss} />
          </div>
        ))}
      </div>
    </PortalCard>
  );
}

/**
 * Portal-wide "Global MIS Filters" strip (state / district / type / ministry /
 * stage / health) — rendered once by the parent shell above every screen.
 */
export function GlobalMisFilters() {
  const {
    globalState, setGlobalState,
    globalDistrict, setGlobalDistrict,
    globalType, setGlobalType,
    globalMinistry, setGlobalMinistry,
    globalStage, setGlobalStage,
    globalHealth, setGlobalHealth,
    hasActiveFilters, clearGlobalFilters, districtsOfGlobalState,
  } = useExecutive();

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        ▽ Global MIS Filters
        <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 font-mono normal-case tracking-normal text-emerald-700">Read-only decision maker</span>
        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono normal-case tracking-normal text-slate-500">{INDIA_STATES.length} States/UTs · {ALL_DISTRICTS.length} Districts</span>
        {hasActiveFilters && (
          <button onClick={clearGlobalFilters} className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono normal-case tracking-normal text-amber-800 hover:bg-amber-200">
            Clear ✕
          </button>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="truncate">State: {globalState === "All States" ? "All States" : globalState}</span>
          <select
            value={globalState}
            onChange={(e) => setGlobalState(e.target.value)}
            className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
            aria-label="Filter by State"
          >
            <option value="All States">All States ({INDIA_STATES.length})</option>
            {INDIA_STATES.map((s) => (
              <option key={s.code} value={s.name}>{s.name} ({s.type})</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="truncate">District: {globalDistrict}</span>
          <select
            value={globalDistrict}
            onChange={(e) => setGlobalDistrict(e.target.value)}
            className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
            aria-label="Filter by District"
          >
            <option value="All Districts">
              {globalState === "All States" ? `All Districts (${ALL_DISTRICTS.length})` : `All of ${globalState} (${districtsOfGlobalState.length})`}
            </option>
            {(globalState === "All States" ? ALL_DISTRICTS.map((d) => d.district) : districtsOfGlobalState).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="truncate">Type: {globalType === "All Infrastructure Types" ? "All Types" : globalType}</span>
          <select value={globalType} onChange={(e) => setGlobalType(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Infrastructure Type">
            <option value="All Infrastructure Types">All Infrastructure Types ({INFRA_TYPES.length})</option>
            {INFRA_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="truncate">Ministry: {globalMinistry === "All Ministries & Agencies" ? "All Agencies" : globalMinistry.replace(/ \(.*/, "")}</span>
          <select value={globalMinistry} onChange={(e) => setGlobalMinistry(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Ministry or Agency">
            <option value="All Ministries & Agencies">All Ministries & Agencies ({MINISTRIES.length})</option>
            {MINISTRIES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="truncate">Stage: {globalStage === "All RFCTLARR Stages" ? "All Stages" : globalStage.split("–")[0].trim()}</span>
          <select value={globalStage} onChange={(e) => setGlobalStage(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Statutory Stage">
            <option value="All RFCTLARR Stages">All RFCTLARR Stages ({RFCTLARR_STAGES.length})</option>
            {RFCTLARR_STAGES.map((s) => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
          <span className="truncate">Health: {globalHealth === "All Statuses" ? "All Statuses" : globalHealth}</span>
          <select value={globalHealth} onChange={(e) => setGlobalHealth(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Health Status">
            <option value="All Statuses">All Statuses ({HEALTH_STATUSES.length})</option>
            {HEALTH_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** Portal-wide read-only role boundary note (rendered by the parent shell). */
export function RoleBoundaryFooter({ actions }: { actions?: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
      <p className="flex items-center gap-1.5 font-bold text-amber-700"><Lock size={13} /> Strict Role Boundary</p>
      <p className="mt-1">Monitoring &amp; Decision Support window. Operational proposal creation, OCR editing, and field approvals are restricted to field portals. This window is read-only — no transactional controls.</p>
      {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
