import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  FileBarChart,
  Flag,
  FolderKanban,
  Gavel,
  Globe,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  User,
  Users,
  Download,
} from "lucide-react";

import PortalLayout from "../components/portal/PortalLayout";
import { RequireRole } from "../auth/guards";
import { OFFICER, PORTAL, SCOPE_OPTIONS } from "../features/executive/executiveData";
import { ExecutiveProvider, useExecutive } from "../features/executive/ExecutiveStore";
import { GlobalMisFilters, RoleBoundaryFooter } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive")({
  component: () => (
    <RequireRole roles={["executive", "system_admin"]}>
      <ExecutiveProvider>
        <ExecutiveShell />
      </ExecutiveProvider>
    </RequireRole>
  ),
});

/**
 * Executive (MIS & DSS) portal shell.
 *
 * Responsibilities kept at the parent route level:
 *   - role guard (`executive` / `system_admin`, inherited by every child)
 *   - the shared PortalLayout chrome, three-group sidebar, jurisdictional
 *     scope switch, dossier download action and the global MIS filter strip
 *   - the cross-page analytics state (global filters, search, state/district
 *     directory scope, comparison basket, report tab, demo reset)
 *   - the read-only role boundary footer
 *
 * Screens live in `executive.*.tsx` and render through <Outlet />.
 */
function ExecutiveShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { scope, setScope, resetDemo } = useExecutive();

  const go = (to: string) => () => {
    navigate({ to });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebarGroups = [
    {
      title: "Executive Monitoring",
      items: [
        { label: "Executive Dashboard", icon: <LayoutDashboard size={16} />, active: pathname === "/executive/dashboard", to: "/executive/dashboard" },
        { label: "National Overview", icon: <Globe size={16} />, active: pathname === "/executive/national", to: "/executive/national" },
        { label: "States Performance", icon: <Flag size={16} />, active: pathname === "/executive/states", to: "/executive/states" },
        { label: "Districts MIS", icon: <MapPin size={16} />, active: pathname === "/executive/districts", to: "/executive/districts" },
        { label: "Corridor Projects", icon: <FolderKanban size={16} />, active: pathname === "/executive/corridors", to: "/executive/corridors" },
        { label: "Executive GIS Map", icon: <MapIcon size={16} />, active: pathname === "/executive/gis", to: "/executive/gis" },
      ],
    },
    {
      title: "Analytics",
      items: [
        { label: "Program Analytics", icon: <TrendingUp size={16} />, active: pathname === "/executive/program", to: "/executive/program" },
        { label: "Compensation Analytics", icon: <IndianRupee size={16} />, active: pathname === "/executive/compensation", to: "/executive/compensation" },
        { label: "R&R Progress", icon: <Users size={16} />, active: pathname === "/executive/rr", to: "/executive/rr" },
        { label: "Possession Monitoring", icon: <KeyRound size={16} />, active: pathname === "/executive/possession", to: "/executive/possession" },
        { label: "Timeline Adherence", icon: <CalendarClock size={16} />, active: pathname === "/executive/timeline", to: "/executive/timeline" },
        { label: "Bottlenecks & Backlog", icon: <TriangleAlert size={16} />, badge: "CRITICAL", active: pathname === "/executive/bottlenecks", to: "/executive/bottlenecks" },
        { label: "Project Comparison", icon: <Gavel size={16} />, active: pathname === "/executive/comparison", to: "/executive/comparison" },
        { label: "Predictive Indicators", icon: <Sparkles size={16} />, badge: "AI/ML", active: pathname === "/executive/predictive", to: "/executive/predictive" },
      ],
    },
    {
      title: "Executive Office",
      items: [
        { label: "MIS Reports & Briefs", icon: <FileBarChart size={16} />, active: pathname === "/executive/reports", to: "/executive/reports" },
        { label: "Executive Alerts", icon: <Bell size={16} />, badge: 5, active: pathname === "/executive/alerts", to: "/executive/alerts" },
        { label: "Executive Profile", icon: <User size={16} />, active: pathname === "/executive/profile", to: "/executive/profile" },
      ],
    },
  ];

  return (
    <PortalLayout
      portalBadge={PORTAL.badge}
      portalSub={PORTAL.sub}
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={OFFICER.role}
      activeContext={`${scope} Scope • FY 2026–27`}
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "Executive Authorization Profile",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Executive Profile",
        onViewOfficerProfile: go("/executive/profile"),
        onViewOrgProfile: go("/executive/profile"),
        onResetDemo: () => {
          resetDemo();
          navigate({ to: "/executive/dashboard" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 5,
        onNotificationClick: go("/executive/alerts"),
      }}
      topActions={
        <>
          <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold xl:inline-flex">
            {SCOPE_OPTIONS.map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`rounded-md px-2.5 py-1 ${scope === s ? "bg-amber-500 text-white" : "text-slate-500 hover:text-slate-800"}`}>{s}</button>
            ))}
          </span>
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-500 xl:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Updated: 26 Sep 2026, 11:34 AM
          </span>
          <button onClick={() => window.print()} className="hidden items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#123a75] lg:inline-flex">
            <Download size={14} /> Download Dossier
          </button>
        </>
      }
    >
      {/* Global MIS filter strip (portal-wide, applied to every analytics screen) */}
      <GlobalMisFilters />

      {/* The active page — one route file per screen */}
      <Outlet />

      {/* Read-only role boundary (portal-wide) */}
      <RoleBoundaryFooter
        actions={
          <>
            <button onClick={go("/executive/reports")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><FileBarChart size={12} /> MIS Reports &amp; Briefs</button>
            <button onClick={go("/executive/alerts")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><Bell size={12} /> Executive Alerts</button>
            <button onClick={go("/executive/dashboard")} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 font-bold text-white">National Dossier <ArrowRight size={12} /></button>
          </>
        }
      />
    </PortalLayout>
  );
}

export default ExecutiveShell;
