import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderGit2,
  GitFork,
  KeyRound,
  MapPin,
  Server,
  ShieldCheck,
  Sliders,
  TableProperties,
  UserCircle,
  UserPlus,
  Users,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  X,
  Plus,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

import PortalLayout from "../components/portal/PortalLayout";
import { RequireRole } from "../auth/guards";
import { ADMIN, ADMIN_CRUMBS } from "../features/admin/adminData";
import { AdminProvider, useAdmin } from "../features/admin/AdminStore";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireRole roles={["system_admin"]}>
      <AdminProvider>
        <AdminShell />
      </AdminProvider>
    </RequireRole>
  ),
});

/**
 * System Administrator portal shell.
 *
 * Responsibilities kept at the parent route level:
 *   - role guard (`system_admin`, enforced above by RequireRole, therefore
 *     inherited by every `admin.*` child route — deep links included)
 *   - the shared PortalLayout chrome (top bar, sidebar, content container)
 *   - breadcrumb rendering, driven purely off the matched pathname
 *   - the shared confirm-dialog and toast channels
 *   - the portal-wide governance footer note
 *
 * No page implementations live here; each screen is its own route file
 * (`admin.dashboard.tsx`, `admin.users.tsx`, …) rendered through <Outlet />.
 */
function AdminShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    unread,
    confirm,
    confirmReason,
    confirmError,
    setConfirmReason,
    setConfirmError,
    closeConfirm,
    doConfirm,
    toast,
    resetDemo,
  } = useAdmin();

  const go = (to: string) => () => navigate({ to });

  const sidebarGroups = [
    {
      title: "Platform Console",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: pathname === "/admin/dashboard", to: "/admin/dashboard" },
      ],
    },
    {
      title: "User Management",
      items: [
        { label: "All Users", icon: <Users size={16} />, active: pathname === "/admin/users", to: "/admin/users" },
        { label: "Add User", icon: <UserPlus size={16} />, active: pathname === "/admin/users-new", to: "/admin/users-new" },
        { label: "User Activity", icon: <Activity size={16} />, active: pathname === "/admin/user-activity", to: "/admin/user-activity" },
      ],
    },
    {
      title: "Access Control",
      items: [
        { label: "Roles", icon: <KeyRound size={16} />, active: pathname === "/admin/roles", to: "/admin/roles" },
        { label: "Permissions", icon: <FileCheck2 size={16} />, active: pathname === "/admin/permissions", to: "/admin/permissions" },
        { label: "Permission Matrix", icon: <TableProperties size={16} />, active: pathname === "/admin/permission-matrix", to: "/admin/permission-matrix" },
      ],
    },
    {
      title: "Organization",
      items: [
        { label: "Departments", icon: <Building2 size={16} />, active: pathname === "/admin/departments", to: "/admin/departments" },
        { label: "States", icon: <MapPin size={16} />, active: pathname === "/admin/states", to: "/admin/states" },
        { label: "Districts", icon: <MapPin size={16} />, active: pathname === "/admin/districts", to: "/admin/districts" },
        { label: "Jurisdictions", icon: <MapPin size={16} />, active: pathname === "/admin/jurisdictions", to: "/admin/jurisdictions" },
      ],
    },
    {
      title: "Platform Config",
      items: [
        { label: "Projects", icon: <FolderGit2 size={16} />, active: pathname === "/admin/projects", to: "/admin/projects" },
        { label: "Workflows", icon: <GitFork size={16} />, active: pathname === "/admin/workflows", to: "/admin/workflows" },
        { label: "Documents", icon: <FileText size={16} />, active: pathname === "/admin/documents", to: "/admin/documents" },
        { label: "Integrations", icon: <Boxes size={16} />, active: pathname === "/admin/integrations", to: "/admin/integrations" },
      ],
    },
    {
      title: "Governance & Health",
      items: [
        { label: "Audit Logs", icon: <ClipboardList size={16} />, active: pathname === "/admin/audit-logs", to: "/admin/audit-logs" },
        { label: "System Monitor", icon: <Server size={16} />, active: pathname === "/admin/system-monitor", to: "/admin/system-monitor" },
        { label: "Notifications", icon: <Bell size={16} />, badge: unread, active: pathname === "/admin/notifications", to: "/admin/notifications" },
        { label: "Settings", icon: <Sliders size={16} />, active: pathname === "/admin/settings", to: "/admin/settings" },
        { label: "Admin Profile", icon: <UserCircle size={16} />, active: pathname === "/admin/profile", to: "/admin/profile" },
      ],
    },
  ];

  const crumbs = ADMIN_CRUMBS[pathname] ?? ["Platform Console"];

  return (
    <PortalLayout
      portalBadge="System Admin"
      portalSub="National Land Governance Platform · NIC / MeitY Nodal"
      userName={ADMIN.name}
      userInitials={ADMIN.initials}
      userRole="SYSTEM_ADMIN · Platform Control"
      activeContext="Production · NIC Cloud (ap-south-1)"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: ADMIN.designation,
        userLevelLabel: "ROLE: SYSTEM_ADMIN · Zero-Trust Isolation Active",
        jurisdiction: ADMIN.jurisdiction,
        orgProfileLabel: "Platform Settings",
        showOfficerProfileRow: true,
        officerProfileLabel: "Admin Profile & Credentials",
        onViewOfficerProfile: go("/admin/profile"),
        onViewOrgProfile: go("/admin/settings"),
        onResetDemo: () => {
          resetDemo();
          navigate({ to: "/admin/dashboard" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: unread,
        onNotificationClick: go("/admin/notifications"),
      }}
      topActions={
        <>
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-500 xl:inline-flex">
            <ShieldCheck size={13} className="text-emerald-600" /> SECURE_GOVCLOUD_NODE_01 [PROD]
          </span>
          <button
            onClick={go("/admin/users-new")}
            className="hidden items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 lg:inline-flex"
          >
            <Plus size={14} /> Provision Official
          </button>
        </>
      }
    >
      {/* Breadcrumbs — derived from the matched route */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {crumbs.map((b, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={i === arr.length - 1 ? "font-semibold text-slate-800" : ""}>{b}</span>
          </span>
        ))}
        <span className="ml-auto hidden font-mono text-[11px] text-slate-400 sm:block">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />ZameenAI Core: v4.2.0-rc2
        </span>
      </nav>

      {/* The active page — one route file per screen */}
      <Outlet />

      {/* Footer governance note (portal-wide) */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]">
          <ShieldCheck size={13} className="text-emerald-600" /> Separation of Duties Enforced
        </p>
        <p className="mt-1">
          System Administrator governs accounts, policy and infrastructure — operational approvals
          (awards, validations, field records) remain exclusively with statutory roles. Every
          privileged action above is written to the tamper-evident audit ledger.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            onClick={go("/admin/audit-logs")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"
          >
            <ClipboardList size={12} /> Audit Trail
          </button>
          <button
            onClick={go("/admin/permission-matrix")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"
          >
            <TableProperties size={12} /> RBAC Matrix
          </button>
          <button
            onClick={go("/admin/system-monitor")}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white"
          >
            Live Telemetry <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Confirmation modal — shared by every admin page */}
      {confirm && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4"
          onClick={closeConfirm}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-xl border p-2 ${
                    confirm.dangerLevel === "danger"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : confirm.dangerLevel === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : "border-blue-200 bg-blue-50 text-blue-600"
                  }`}
                >
                  {confirm.dangerLevel === "danger" ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">{confirm.title}</h3>
                  <p className="text-[11px] text-slate-400">Security &amp; Audit Compliance Verification</p>
                </div>
              </div>
              <button onClick={closeConfirm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={15} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{confirm.message}</p>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <span className="mb-0.5 block font-bold">Administrative Impact Notice:</span>
              {confirm.impactWarning}
            </div>
            {confirm.requiresReason && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Reason for Change <span className="text-red-500">*</span>{" "}
                  <span className="font-medium text-slate-400">(Recorded in immutable audit log)</span>
                </label>
                <textarea
                  value={confirmReason}
                  onChange={(e) => {
                    setConfirmReason(e.target.value);
                    setConfirmError("");
                  }}
                  rows={2}
                  placeholder="Enter justification conforming to department delegation of powers…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
                />
                {confirmError && <p className="mt-1 text-[11px] text-red-600">{confirmError}</p>}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button onClick={closeConfirm} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={doConfirm}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm ${
                  confirm.dangerLevel === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirm.dangerLevel === "warning"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirm.confirmButtonText || "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[150] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
          {toast}
        </div>
      )}
    </PortalLayout>
  );
}

export default AdminShell;
