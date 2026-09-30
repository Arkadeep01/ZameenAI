import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";

import { PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { PERM_GROUPS, ROLES } from "../features/admin/adminData";
import { AccessBadge, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/permission-matrix")({
  component: AdminPermissionMatrix,
});

function AdminPermissionMatrix() {
  const { matrix, matrixDirty, matrixSaved, cycleAccess, commitMatrix, askConfirm, logAudit, showToast } = useAdmin();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">RBAC Permission Matrix</h1>
          <p className="mt-1 text-sm text-slate-500">
            Click any cell to cycle Allowed → Restricted → Denied. Changes stage in-memory until saved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {matrixDirty && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-800">
              <AlertTriangle size={13} /> Unsaved changes
            </span>
          )}
          {matrixSaved && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 size={13} /> Saved to ledger
            </span>
          )}
          <button
            onClick={() =>
              askConfirm({
                title: "Commit RBAC Matrix to Audit Ledger",
                message: "Persist all staged permission changes as the enforced platform policy?",
                impactWarning: "This rewrites authorization checks across all portals on next token refresh.",
                confirmButtonText: "Save Matrix",
                dangerLevel: "warning",
                requiresReason: true,
                onConfirm: (reason) => {
                  commitMatrix();
                  logAudit(
                    "PERMISSION_MATRIX_UPDATED",
                    "Role & Permissions",
                    "RBAC_CORE_MATRIX",
                    "CRITICAL",
                    reason || "Committed RBAC matrix updates",
                  );
                  showToast("Permission matrix saved to audit ledger.");
                },
              })
            }
            disabled={!matrixDirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
          >
            <Save size={14} /> Save Matrix
          </button>
        </div>
      </div>
      <PortalCard className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-slate-50">
                <Th className="min-w-[220px]">Permission</Th>
                {ROLES.map((r) => (
                  <th
                    key={r.id}
                    className="min-w-[110px] border-l border-slate-200 px-2 py-2 text-center font-mono text-[9px] font-black text-slate-600"
                  >
                    {r.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_GROUPS.map((g) => (
                <Fragment key={g.group}>
                  <tr>
                    <td
                      colSpan={ROLES.length + 1}
                      className="border-t border-slate-200 bg-slate-50/70 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"
                    >
                      {g.group}
                    </td>
                  </tr>
                  {g.perms.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-50/30">
                      <Td>
                        <p className="font-mono text-[11px] font-bold text-slate-800">
                          {p.code}{" "}
                          {p.operational && (
                            <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[8px] font-black text-amber-800">
                              OP
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">{p.name}</p>
                      </Td>
                      {ROLES.map((r) => (
                        <td key={r.id} className="border-l border-slate-100 px-2 py-2 text-center">
                          <AccessBadge level={matrix[r.id][p.id]} onClick={() => cycleAccess(r.id, p.id)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </PortalCard>
      <p className="mt-2 text-[11px] text-slate-500">
        Guardrail: SYSTEM_ADMIN + operational power → ALLOWED is rejected and logged. Matrix saves are CRITICAL audit events.
      </p>
    </>
  );
}

export default AdminPermissionMatrix;
