import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { INDIA_DISTRICTS, INDIA_STATES } from "../utils/indiaGeo";

export const Route = createFileRoute("/admin/states")({
  component: AdminStates,
});

function AdminStates() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <>
      <GreetingHeader
        eyebrow="Organization • All-India Directory"
        title={`States & UTs Catalog (${INDIA_STATES.length})`}
        subtitle="Every State and Union Territory addressable by the platform. Shared with the Executive DSS directory."
      />
      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search State / UT…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
      </PortalCard>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {INDIA_STATES.filter(
          (s) => !query.trim() || s.name.toLowerCase().includes(query.trim().toLowerCase()),
        ).map((s) => (
          <div
            key={s.code}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 font-mono text-[11px] font-black text-amber-400">
                {s.code}
              </span>
              <div>
                <p className="text-[13px] font-bold text-slate-800">{s.name}</p>
                <p className="text-[11px] text-slate-400">
                  {(INDIA_DISTRICTS[s.name] ?? []).length} districts · {s.type}
                </p>
              </div>
            </div>
            {/* Hand the selected state to the districts catalog via the URL, so the
                drill-down is deep-linkable and survives a reload. */}
            <button
              onClick={() => navigate({ to: "/admin/districts", search: { state: s.name } })}
              className="shrink-0 text-[11px] font-bold text-emerald-700"
            >
              Districts →
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default AdminStates;
