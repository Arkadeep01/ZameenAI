import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CircleCheck,
  ClipboardList,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  RefreshCw,
  TriangleAlert,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";

import PortalLayout from "../components/portal/PortalLayout";
import { RequireRole } from "../auth/guards";
import { OFFICER } from "../features/fieldOfficer/fieldOfficerData";
import { FieldOfficerProvider, useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";

export const Route = createFileRoute("/field-officer")({
  component: () => (
    <RequireRole roles={["field_officer", "system_admin"]}>
      <FieldOfficerProvider>
        <FieldOfficerShell />
      </FieldOfficerProvider>
    </RequireRole>
  ),
});

/**
 * Field Officer (Patwari) portal shell.
 *
 * Responsibilities kept at the parent route level:
 *   - role guard (`field_officer` / `system_admin`, inherited by every child)
 *   - the shared PortalLayout chrome and online/offline top-bar switch
 *   - the jurisdiction footer note
 *   - the field-verification workflow state (assignments, wizard answers,
 *     offline buffer) previously held inside one component
 *
 * Screens live in `field-officer.*.tsx` and render through <Outlet />.
 */
function FieldOfficerShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { online, setOnline, resetDemo } = useFieldOfficer();

  const go = (to: string) => () => {
    navigate({ to });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebarGroups = [
    {
      title: "Field Officer Mode",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: pathname === "/field-officer/dashboard", to: "/field-officer/dashboard" },
        { label: "My Assignments", icon: <ClipboardList size={16} />, active: pathname === "/field-officer/assignments" || pathname === "/field-officer/verify", to: "/field-officer/assignments" },
        { label: "Map", icon: <MapIcon size={16} />, active: pathname === "/field-officer/map", to: "/field-officer/map" },
        { label: "Completed", icon: <CircleCheck size={16} />, active: pathname === "/field-officer/completed", to: "/field-officer/completed" },
        { label: "Mismatches", icon: <TriangleAlert size={16} />, badge: 2, active: pathname === "/field-officer/mismatches", to: "/field-officer/mismatches" },
        { label: "Sync Center", icon: <RefreshCw size={16} />, active: pathname === "/field-officer/sync", to: "/field-officer/sync" },
        { label: "Notifications", icon: <Bell size={16} />, badge: 2, active: pathname === "/field-officer/notifications", to: "/field-officer/notifications" },
        { label: "Profile", icon: <User size={16} />, active: pathname === "/field-officer/profile", to: "/field-officer/profile" },
      ],
    },
  ];

  return (
    <PortalLayout
      portalBadge="Field Verification"
      portalSub="Field Officer Mode · Authorized Ground Verification Only"
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={OFFICER.role}
      activeContext="Varanasi · Pindra"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "Field Jurisdiction & Profile",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile",
        onViewOfficerProfile: go("/field-officer/profile"),
        onViewOrgProfile: go("/field-officer/profile"),
        onResetDemo: () => {
          resetDemo();
          navigate({ to: "/field-officer/dashboard" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 2,
        onNotificationClick: go("/field-officer/notifications"),
      }}
      topActions={
        <button
          onClick={() => setOnline((v) => !v)}
          className={`hidden items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold lg:inline-flex ${online ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-600" : "bg-amber-600"}`} />
          {online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {online ? "ONLINE" : "OFFLINE"}
          <span className="font-medium opacity-70">| {online ? "Field Mode" : "Simulated"}</span>
        </button>
      }
    >
      {/* The active page — one route file per screen */}
      <Outlet />

      {/* Footer jurisdiction note (portal-wide) */}
      <div className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-relaxed text-slate-500 sm:max-w-none">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><MapPin size={12} /> Jurisdiction</p>
        <p className="mt-0.5 font-bold text-slate-700">Varanasi · Pindra</p>
        <p>Mauza Ramnagar &amp; Kashi Ring Road Sector 4 · Read-only cadastral view · Discrepancies are adjudicated by the LAO.</p>
      </div>
    </PortalLayout>
  );
}

export default FieldOfficerShell;
