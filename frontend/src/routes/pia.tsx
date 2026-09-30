import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  ExternalLink,
  FileBarChart,
  FileText,
  Flag,
  FolderKanban,
  LayoutDashboard,
  Map,
  MapPin,
  Plus,
  User,
  Workflow,
} from "lucide-react";

import PortalLayout from "../components/portal/PortalLayout";
import { RequireRole } from "../auth/guards";
import { OFFICER } from "../features/pia/piaData";
import { PiaProvider, usePia } from "../features/pia/PiaStore";

export const Route = createFileRoute("/pia")({
  component: () => (
    <RequireRole roles={["pia", "system_admin"]}>
      <PiaProvider>
        <PiaShell />
      </PiaProvider>
    </RequireRole>
  ),
});

/**
 * Project Implementing Agency (PIA) portal shell.
 *
 * Responsibilities kept at the parent route level:
 *   - role guard (`pia` / `system_admin`, enforced by RequireRole, therefore
 *     inherited by every `pia.*` child route — deep links included)
 *   - the shared PortalLayout chrome (top bar, sidebar, content container)
 *   - the portal-wide "Authority Mode: PIA Requisition" footer note
 *   - the search / case-tab / notification-tab / wizard-step state that was
 *     previously shared across the 13 screens inside one component
 *
 * No page implementations live here; each screen is its own route file
 * (`pia.dashboard.tsx`, `pia.projects.tsx`, …) rendered through <Outlet />.
 */
function PiaShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { resetDemo } = usePia();

  const go = (to: string) => () => {
    navigate({ to });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebarGroups = [
    {
      title: "Requisition Workspace",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: pathname === "/pia/dashboard", to: "/pia/dashboard" },
        { label: "Projects", icon: <FolderKanban size={16} />, active: pathname === "/pia/projects", to: "/pia/projects" },
        { label: "Acquisition Cases", icon: <FileText size={16} />, badge: "2 action", active: pathname === "/pia/cases" || pathname === "/pia/proposal", to: "/pia/cases" },
        { label: "GIS Parcel Explorer", icon: <Map size={16} />, active: pathname === "/pia/gis", to: "/pia/gis" },
        { label: "Documents", icon: <FileText size={16} />, active: pathname === "/pia/documents", to: "/pia/documents" },
        { label: "Workflow Tracker", icon: <Workflow size={16} />, active: pathname === "/pia/workflow", to: "/pia/workflow" },
        { label: "Milestones", icon: <Flag size={16} />, active: pathname === "/pia/milestones", to: "/pia/milestones" },
        { label: "Notifications", icon: <Bell size={16} />, badge: 4, active: pathname === "/pia/notifications", to: "/pia/notifications" },
        { label: "Reports & Schedule", icon: <FileBarChart size={16} />, active: pathname === "/pia/reports", to: "/pia/reports" },
      ],
    },
    {
      title: "Institutional",
      items: [
        { label: "Officer Profile", icon: <User size={16} />, active: pathname === "/pia/officer", to: "/pia/officer" },
        { label: "PIA Profile & RBAC", icon: <Building2 size={16} />, active: pathname === "/pia/profile", to: "/pia/profile" },
        { label: "Help & Statutory SOP", icon: <BookOpen size={16} />, active: pathname === "/pia/help", to: "/pia/help" },
      ],
    },
  ];

  return (
    <PortalLayout
      portalBadge="PIA Portal"
      portalSub="Project Implementing Agency • NHIDCL Regional Office IV"
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={`PIA • ${OFFICER.badge}`}
      activeContext="Northern Corridor Zone IV (Uttar Pradesh & Bihar)"
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "PIA Organization & Profile",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile",
        onViewOfficerProfile: go("/pia/officer"),
        onViewOrgProfile: go("/pia/profile"),
        onResetDemo: () => {
          resetDemo();
          navigate({ to: "/pia/dashboard" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 4,
        onNotificationClick: go("/pia/notifications"),
      }}
      topActions={
        <button
          onClick={go("/pia/proposal")}
          className="hidden items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 lg:inline-flex"
        >
          <Plus size={14} /> New Acquisition Proposal
        </button>
      }
    >
      {/* The active page — one route file per screen */}
      <Outlet />

      {/* Footer authority note (portal-wide) */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-[#0B3B5F]">
          <MapPin size={13} className="text-emerald-600" /> Authority Mode: PIA Requisition
        </p>
        <p className="mt-1">
          Statutory proposals governed by RFCTLARR Act 2013 &amp; NH Act 1956. Authoritative
          approval vested in LAO &amp; CALA. PIA actions are draft-stage requisitions until gazette
          notification.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={go("/pia/workflow")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50">
            <Workflow size={12} /> Workflow Tracker
          </button>
          <button onClick={go("/pia/gis")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50">
            <Map size={12} /> GIS Explorer <ExternalLink size={11} />
          </button>
          <button onClick={go("/pia/proposal")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white">
            New Proposal <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}

export default PiaShell;
