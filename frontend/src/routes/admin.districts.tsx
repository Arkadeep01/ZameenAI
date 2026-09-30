import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { ALL_DISTRICTS, INDIA_STATES } from "../utils/indiaGeo";
import { TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/districts")({
  // The active state filter lives in the URL so the States → Districts drill-down
  // (and any shared/bookmarked link) resolves the same catalog.
  validateSearch: (s: Record<string, unknown>): { state: string } => ({
    state: typeof s.state === "string" ? s.state : "All States",
  }),
  component: AdminDistricts,
});

const D_PS = 25;

function AdminDistricts() {
  const navigate = useNavigate();
  const { state: dState } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [dPage, setDPage] = useState(0);

  const districtDir = useMemo(() => {
    const x = query.trim().toLowerCase();
    return ALL_DISTRICTS.filter(
      ({ district, state }) =>
        (dState === "All States" || state === dState) &&
        (!x || `${district} ${state}`.toLowerCase().includes(x)),
    );
  }, [dState, query]);

  const dPages = Math.max(1, Math.ceil(districtDir.length / D_PS));
  const dRows = districtDir.slice(dPage * D_PS, dPage * D_PS + D_PS);

  const setState = (v: string) => {
    setDPage(0);
    navigate({ to: "/admin/districts", search: { state: v }, replace: true });
  };

  return (
    <>
      <GreetingHeader
        eyebrow="Organization • District Revenue Units"
        title={`Districts Catalog (${ALL_DISTRICTS.length})`}
        subtitle="Complete all-India district directory with state filter, search and pagination."
      />
      <PortalCard className="!p-0">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 sm:w-64">
            <span className="truncate">{dState}</span>
            <select
              value={dState}
              onChange={(e) => setState(e.target.value)}
              className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
              aria-label="Filter districts by State"
            >
              <option value="All States">All States</option>
              {INDIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
            <Search size={14} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDPage(0);
              }}
              placeholder="Search District…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
        <p className="border-b border-slate-100 px-4 py-2 font-mono text-[11px] text-slate-500">
          Showing {dRows.length} of {districtDir.length} districts · Page {dPage + 1} of {dPages}
        </p>
        <TableShell minWidth="min-w-[640px]">
          <thead>
            <tr>
              <Th>District</Th>
              <Th>State / UT</Th>
              <Th className="text-right">Jurisdiction Status</Th>
            </tr>
          </thead>
          <tbody>
            {dRows.map(({ district, state }) => (
              <tr key={`${state}|${district}`} className="hover:bg-emerald-50/40">
                <Td className="font-bold text-slate-800">{district}</Td>
                <Td className="text-slate-500">{state}</Td>
                <Td className="text-right">
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    ACTIVE
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            Page <b className="text-slate-800">{dPage + 1}</b> of <b className="text-slate-800">{dPages}</b>
          </span>
          <span className="flex gap-1.5">
            <button
              disabled={dPage === 0}
              onClick={() => setDPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={dPage + 1 >= dPages}
              onClick={() => setDPage((p) => Math.min(dPages - 1, p + 1))}
              className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </span>
        </div>
      </PortalCard>
    </>
  );
}

export default AdminDistricts;
