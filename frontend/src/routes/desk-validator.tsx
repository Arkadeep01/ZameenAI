import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  Bell,
  ClipboardCheck,
  FolderOpen,
  History,
  LayoutDashboard,
  MapPin,
  RotateCcw,
  Search,
  User,
} from "lucide-react";

import PortalLayout from "../components/portal/PortalLayout";
import { RequireRole } from "../auth/guards";
import { LAO } from "../features/deskValidator/deskValidatorData";
import { DeskValidatorProvider, useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { StatutoryScopeFooter } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator")({
  component: () => (
    <RequireRole roles={["desk_validator", "system_admin"]}>
      <DeskValidatorProvider>
        <DeskValidatorShell />
      </DeskValidatorProvider>
    </RequireRole>
  ),
});

/**
 * Desk Validator (LAO) portal shell.
 *
 * Responsibilities kept at the parent route level:
 *   - role guard (`desk_validator` / `system_admin`, inherited by every child)
 *   - the shared PortalLayout chrome, four-group sidebar and global search box
 *   - the cross-page desk-scrutiny state (query, confidence filter, selected
 *     case, dossier tab, validator corrections)
 *   - the statutory-authority footer scope note
 *
 * Screens live in `desk-validator.*.tsx` and render through <Outlet />.
 */
function DeskValidatorShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { query, setQuery } = useDeskValidator();

  const go = (to: string) => () => {
    navigate({ to });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebarGroups = [
    {
      title: "Active Workspace",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: pathname === "/desk-validator/dashboard", to: "/desk-validator/dashboard" },
        { label: "Validation Queue", icon: <ClipboardCheck size={16} />, badge: 6, active: pathname === "/desk-validator/queue" || pathname === "/desk-validator/workspace", to: "/desk-validator/queue" },
        { label: "Assigned Cases", icon: <FolderOpen size={16} />, badge: 10, active: pathname === "/desk-validator/assigned" || pathname === "/desk-validator/dossier", to: "/desk-validator/assigned" },
      ],
    },
    {
      title: "Survey & Revisions",
      items: [
        { label: "Field Verification", icon: <MapPin size={16} />, badge: 4, active: pathname === "/desk-validator/field", to: "/desk-validator/field" },
        { label: "Returned Cases", icon: <RotateCcw size={16} />, badge: 1, active: pathname === "/desk-validator/returned", to: "/desk-validator/returned" },
      ],
    },
    {
      title: "Archives & Compliance",
      items: [
        { label: "Validated Records", icon: <Archive size={16} />, active: pathname === "/desk-validator/validated", to: "/desk-validator/validated" },
        { label: "Audit Trail", icon: <History size={16} />, active: pathname === "/desk-validator/audit", to: "/desk-validator/audit" },
      ],
    },
    {
      title: "System & Help",
      items: [
        { label: "Notifications", icon: <Bell size={16} />, badge: 2, active: pathname === "/desk-validator/notifications", to: "/desk-validator/notifications" },
        { label: "Officer Profile & SOP", icon: <User size={16} />, active: pathname === "/desk-validator/profile", to: "/desk-validator/profile" },
      ],
    },
  ];

  return (
    <PortalLayout
      portalBadge="Desk Validator"
      portalSub={LAO.portalSub}
      userName={LAO.name}
      userInitials={LAO.initials}
      userRole={LAO.role}
      activeContext={LAO.activeContext}
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: LAO.designation,
        jurisdiction: LAO.tehsils,
        orgProfileLabel: "Officer Profile, Authority & SOP",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile & SOP",
        onViewOfficerProfile: go("/desk-validator/profile"),
        onViewOrgProfile: go("/desk-validator/profile"),
        onResetDemo: () => {
          setQuery("");
          navigate({ to: "/desk-validator/dashboard" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 2,
        onNotificationClick: go("/desk-validator/notifications"),
      }}
      topActions={
        <span className="hidden w-72 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 xl:flex">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Khasra, Case ID (e.g. LA-2026-00128)…"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </span>
      }
    >
      {/* The active page — one route file per screen */}
      <Outlet />

      {/* Statutory authority scope (portal-wide) */}
      <StatutoryScopeFooter
        actions={
          <>
            <button onClick={go("/desk-validator/audit")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><History size={12} /> Audit Trail</button>
            <button onClick={go("/desk-validator/profile")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><MapPin size={12} /> Officer Profile &amp; SOP</button>
            <button onClick={go("/desk-validator/queue")} className="inline-flex items-center gap-1 rounded-lg bg-[#0B2A5B] px-2.5 py-1.5 font-bold text-white">Continue Scrutiny <ArrowRight size={12} /></button>
          </>
        }
      />
    </PortalLayout>
  );
}

export default DeskValidatorShell;
