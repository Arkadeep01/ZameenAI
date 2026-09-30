import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Building,
  CheckCircle,
  Eye,
  KeyRound,
  RotateCcw,
  Search,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";

import { PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { ROLES, type AdminUser } from "../features/admin/adminData";
import { LabelSelect, TableShell, Td, Th, UserBadge } from "../features/admin/adminUi";
import { INDIA_STATES } from "../utils/indiaGeo";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

const USER_PS = 8;

function AdminUsers() {
  const navigate = useNavigate();
  const { users, departments, askConfirm, logAudit, showToast, setUserStatus } = useAdmin();

  const [query, setQuery] = useState("");
  const [fRole, setFRole] = useState("ALL");
  const [fDept, setFDept] = useState("ALL");
  const [fState, setFState] = useState("ALL");
  const [fStatus, setFStatus] = useState("ALL");
  const [userPage, setUserPage] = useState(0);
  const [inspecting, setInspecting] = useState<AdminUser | null>(null);

  const go = (to: string) => () => navigate({ to });

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const x = query.trim().toLowerCase();
        const okQ = !x || `${u.fullName} ${u.email} ${u.officialId} ${u.phone}`.toLowerCase().includes(x);
        return (
          okQ &&
          (fRole === "ALL" || u.role === fRole) &&
          (fDept === "ALL" || u.departmentId === fDept) &&
          (fState === "ALL" || u.state === fState) &&
          (fStatus === "ALL" || u.status === fStatus)
        );
      }),
    [users, query, fRole, fDept, fState, fStatus],
  );

  const userPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PS));
  const userRows = filteredUsers.slice(userPage * USER_PS, userPage * USER_PS + USER_PS);

  const resetFilters = () => {
    setQuery("");
    setFRole("ALL");
    setFDept("ALL");
    setFState("ALL");
    setFStatus("ALL");
    setUserPage(0);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">
            User Management Directory{" "}
            <span className="ml-1 rounded-md bg-slate-100 px-2 py-0.5 align-middle font-mono text-xs font-bold text-slate-600">
              {filteredUsers.length} Officials
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administer platform credentials, designated roles, state jurisdictions, and security states.
          </p>
        </div>
        <button
          onClick={go("/admin/users-new")}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          <UserPlus size={14} /> Add Official
        </button>
      </div>

      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setUserPage(0);
            }}
            placeholder="Search by name, email, official ID, phone…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <LabelSelect
            label="Role"
            value={fRole}
            onChange={(v) => {
              setFRole(v);
              setUserPage(0);
            }}
            options={[{ v: "ALL", l: "All Roles" }, ...ROLES.map((r) => ({ v: r.id, l: r.id }))]}
          />
          <LabelSelect
            label="Department"
            value={fDept}
            onChange={(v) => {
              setFDept(v);
              setUserPage(0);
            }}
            options={[{ v: "ALL", l: "All Departments" }, ...departments.map((d) => ({ v: d.id, l: d.name }))]}
          />
          <LabelSelect
            label="State"
            value={fState}
            onChange={(v) => {
              setFState(v);
              setUserPage(0);
            }}
            options={[
              { v: "ALL", l: "All States" },
              { v: "Central", l: "Central / Statewide" },
              ...INDIA_STATES.map((s) => ({ v: s.name, l: s.name })),
            ]}
          />
          <LabelSelect
            label="Status"
            value={fStatus}
            onChange={(v) => {
              setFStatus(v);
              setUserPage(0);
            }}
            options={["ALL", "ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "INACTIVE"].map((s) => ({
              v: s,
              l: s === "ALL" ? "All Statuses" : s,
            }))}
          />
        </div>
        {(query || fRole !== "ALL" || fDept !== "ALL" || fState !== "ALL" || fStatus !== "ALL") && (
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span>
              Filtered results: {filteredUsers.length} of {users.length} users
            </span>
            <button onClick={resetFilters} className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <RotateCcw size={12} /> Reset all filters
            </button>
          </div>
        )}
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <div className="hidden lg:block">
          <TableShell minWidth="min-w-[1000px]">
            <thead>
              <tr>
                <Th>Official / Name</Th>
                <Th>Role</Th>
                <Th>Department</Th>
                <Th>Jurisdiction</Th>
                <Th>Status</Th>
                <Th>Last Login (UTC)</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((u) => (
                <tr key={u.id} className="hover:bg-emerald-50/40">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <span className="block font-bold text-slate-800">{u.fullName}</span>
                        <span className="block font-mono text-[10px] text-slate-400">{u.email}</span>
                        <span className="block font-mono text-[10px] text-emerald-700">{u.officialId}</span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                      {u.role}
                    </span>
                  </Td>
                  <Td>
                    <p className="max-w-[190px] truncate font-medium text-slate-700">{u.departmentName}</p>
                    <p className="font-mono text-[10px] text-slate-400">{u.phone}</p>
                  </Td>
                  <Td>
                    <p className="text-slate-600">{u.state}</p>
                    <p className="text-[11px] text-slate-400">{u.district}</p>
                  </Td>
                  <Td>
                    <UserBadge status={u.status} />
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-[11px] text-slate-500">{u.lastLogin}</Td>
                  <Td>
                    <span className="flex justify-end gap-1">
                      <button
                        onClick={() => setInspecting(u)}
                        title="View profile"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() =>
                          askConfirm({
                            title: "Issue Mandatory Credential & MFA Reset",
                            message: `Dispatch secure credential reset challenge to ${u.email}?`,
                            impactWarning: "All active sessions across devices will be invalidated immediately.",
                            confirmButtonText: "Dispatch Reset",
                            dangerLevel: "warning",
                            requiresReason: true,
                            onConfirm: (reason) => {
                              logAudit("USER_CREDENTIAL_CHALLENGE_ISSUED", "User Management", u.id, "HIGH", reason || `MFA reset for ${u.fullName}`);
                              showToast(`Credential reset dispatched to ${u.email}`);
                            },
                          })
                        }
                        title="Reset MFA & credentials"
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                      >
                        <KeyRound size={15} />
                      </button>
                      {u.status === "ACTIVE" ? (
                        <button
                          onClick={() =>
                            askConfirm({
                              title: "Suspend Official Account Access",
                              message: `Suspend access for ${u.fullName} (${u.officialId})?`,
                              impactWarning:
                                "The official will be immediately locked out of all operational portals, APIs, and mobile kits.",
                              confirmButtonText: "Confirm Suspension",
                              dangerLevel: "danger",
                              requiresReason: true,
                              onConfirm: (reason) => {
                                setUserStatus(u.id, "SUSPENDED", "Suspended");
                                logAudit("USER_SUSPENDED", "User Management", u.id, "HIGH", reason || `Suspended ${u.fullName}`);
                                showToast(`${u.fullName} suspended.`);
                              },
                            })
                          }
                          title="Suspend account"
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <XCircle size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            askConfirm({
                              title: "Reinstate User Account Access",
                              message: `Reinstate active platform privileges for ${u.fullName}?`,
                              impactWarning:
                                "User will regain access according to their configured RBAC role permissions.",
                              confirmButtonText: "Activate Account",
                              dangerLevel: "warning",
                              requiresReason: true,
                              onConfirm: (reason) => {
                                setUserStatus(u.id, "ACTIVE", "Reinstated");
                                logAudit("USER_ACTIVATED", "User Management", u.id, "HIGH", reason || `Reinstated ${u.fullName}`);
                                showToast(`${u.fullName} reinstated.`);
                              },
                            })
                          }
                          title="Reinstate account"
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {userRows.map((u) => (
            <div key={u.id} className="rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{u.fullName}</p>
                <UserBadge status={u.status} />
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                {u.officialId} · {u.role}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {u.departmentName} · {u.state} / {u.district}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => setInspecting(u)} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600">
                  Inspect
                </button>
                {u.status === "ACTIVE" ? (
                  <button
                    onClick={() => {
                      setUserStatus(u.id, "SUSPENDED", "Suspended");
                      logAudit("USER_SUSPENDED", "User Management", u.id, "HIGH", `Suspended ${u.fullName}`);
                    }}
                    className="flex-1 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-700"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setUserStatus(u.id, "ACTIVE", "Reinstated");
                      logAudit("USER_ACTIVATED", "User Management", u.id, "HIGH", `Reinstated ${u.fullName}`);
                    }}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            Page <b className="text-slate-800">{userPage + 1}</b> of <b className="text-slate-800">{userPages}</b>
          </span>
          <span className="flex gap-1.5">
            <button
              disabled={userPage === 0}
              onClick={() => setUserPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={userPage + 1 >= userPages}
              onClick={() => setUserPage((p) => Math.min(userPages - 1, p + 1))}
              className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </span>
        </div>
      </PortalCard>

      {inspecting && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4" onClick={() => setInspecting(null)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-base font-black text-white">
                  {inspecting.fullName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">{inspecting.fullName}</h3>
                  <p className="font-mono text-xs text-emerald-700">{inspecting.officialId}</p>
                </div>
              </div>
              <button onClick={() => setInspecting(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Designated Role</p>
                <p className="mt-0.5 font-mono font-bold text-slate-800">{inspecting.role}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Account Status</p>
                <span className="mt-0.5 inline-block">
                  <UserBadge status={inspecting.status} />
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Two-Factor MFA</p>
                <p className="mt-0.5 font-semibold text-emerald-700">
                  {inspecting.twoFactorEnabled ? "Hardware / OTP Enforced" : "Disabled"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Email</p>
                <p className="mt-0.5 break-all font-mono text-[11px] text-slate-700">{inspecting.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Phone</p>
                <p className="mt-0.5 font-mono text-slate-700">{inspecting.phone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Department ID</p>
                <p className="mt-0.5 font-mono text-slate-700">{inspecting.departmentId}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 p-3.5 text-xs">
              <p className="flex items-center gap-1.5 font-bold text-slate-800">
                <Building size={13} className="text-slate-400" /> Department &amp; Jurisdiction Boundary
              </p>
              <p className="mt-1 font-semibold text-slate-700">{inspecting.departmentName}</p>
              <p className="font-mono text-[11px] text-slate-500">
                State: {inspecting.state} | District: {inspecting.district}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Access Start</p>
                <p className="font-mono font-semibold">{inspecting.accessStartDate}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Access Expiry</p>
                <p className="font-mono font-semibold text-amber-700">{inspecting.accessExpiryDate}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <b className="text-slate-700">Role Boundary Confirmation:</b> This user operates within the scoped
              capabilities of <b>{inspecting.role}</b>. System Administrator oversees account lifecycle, but cannot
              perform operational approvals on their behalf.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setInspecting(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminUsers;
