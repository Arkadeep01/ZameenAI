import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { PERM_GROUPS } from "../features/admin/adminData";

export const Route = createFileRoute("/admin/permissions")({
  component: AdminPermissions,
});

function AdminPermissions() {
  return (
    <>
      <GreetingHeader
        eyebrow="Access Control • Capability Registry"
        title="Permissions Registry"
        subtitle="Every grantable capability. Operational powers are sealed from governance roles."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PERM_GROUPS.map((g) => (
          <PortalCard key={g.group} className="!p-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">
              {g.group}{" "}
              <span className="ml-1 font-mono font-medium normal-case text-slate-400">({g.perms.length})</span>
            </h2>
            <div className="mt-2.5 space-y-1.5">
              {g.perms.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2"
                >
                  <span>
                    <span className="block font-mono text-[11px] font-bold text-slate-800">{p.code}</span>
                    <span className="block text-[11px] text-slate-500">{p.name}</span>
                  </span>
                  {p.operational ? (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                      OPERATIONAL
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-500">
                      GOVERNANCE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminPermissions;
