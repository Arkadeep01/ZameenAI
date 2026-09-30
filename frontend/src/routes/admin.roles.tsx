import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { ALL_PERM_IDS, ROLES, defaultMatrix } from "../features/admin/adminData";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRoles,
});

function AdminRoles() {
  return (
    <>
      <GreetingHeader
        eyebrow="Access Control • 7 System Roles"
        title="Configured Roles Catalog"
        subtitle="Statutory role boundaries. SYSTEM_ADMIN is locked out of operational powers by design."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((r) => (
          <PortalCard key={r.id} className={r.locked ? "!border-emerald-300" : ""}>
            <div className="flex items-start justify-between gap-2">
              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{r.id}</span>
              {r.locked ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Lock size={11} /> SYSTEM_LOCKED
                </span>
              ) : (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    r.operational ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.operational ? "OPERATIONAL" : "GOVERNANCE"}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-black text-slate-900">{r.name}</p>
            <p className="mt-1 min-h-[36px] text-[11px] leading-relaxed text-slate-500">{r.desc}</p>
            <p className="mt-2 border-t border-slate-100 pt-2 font-mono text-[11px] text-slate-500">
              {r.users} officials · {ALL_PERM_IDS.filter((p) => defaultMatrix()[r.id][p] === "ALLOWED").length} allowed powers
            </p>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminRoles;
