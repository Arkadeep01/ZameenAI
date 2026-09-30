import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Gavel,
  History,
  KeyRound,
  LayoutDashboard,
  OctagonPause,
  IndianRupee,
  Users,
} from "lucide-react";

import PortalLayout from "../components/portal/PortalLayout";
import { RequireRole } from "../auth/guards";
import { OFFICER, PORTAL } from "../features/approver/approverData";
import { ApproverProvider, useApprover } from "../features/approver/ApproverStore";
import { StatutoryScopeFooter } from "../features/approver/approverUi";

export const Route = createFileRoute("/approver")({
  component: () => (
    <RequireRole roles={["approver", "system_admin"]}>
      <ApproverProvider>
        <ApproverShell />
      </ApproverProvider>
    </RequireRole>
  ),
});

/**
 * Approver (CALA / DM-DC) portal shell.
 *
 * Responsibilities kept at the parent route level:
 *   - role guard (`approver` / `system_admin`, inherited by every child)
 *   - the shared PortalLayout chrome, statutory sidebar and authority toggle
 *   - the cross-page quasi-judicial state (docket search, docket register,
 *     inspected case, acting authority, demo reset)
 *   - the statutory-authority footer scope note
 *
 * Screens live in `approver.*.tsx` and render through <Outlet />.
 */
function ApproverShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { dockets, pending, contestedList, stayedList, approvedList, authority, setAuthority, resetDemo } = useApprover();

  const go = (to: string) => () => {
    navigate({ to });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sidebarGroups = [
    {
      title: "Statutory Navigation",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={16} />, active: pathname === "/approver/dashboard", to: "/approver/dashboard" },
        { label: "Pending Reviews", icon: <Clock3 size={16} />, badge: pending.length, active: pathname === "/approver/pending", to: "/approver/pending" },
        { label: "All Cases", icon: <FolderOpen size={16} />, badge: dockets.length, active: pathname === "/approver/all", to: "/approver/all" },
        { label: "Contested Cases", icon: <Gavel size={16} />, badge: contestedList.length, active: pathname === "/approver/contested", to: "/approver/contested" },
        { label: "Stayed Cases", icon: <OctagonPause size={16} />, badge: stayedList.length, active: pathname === "/approver/stayed", to: "/approver/stayed" },
        { label: "Compensation", icon: <IndianRupee size={16} />, active: pathname === "/approver/compensation", to: "/approver/compensation" },
        { label: "Notices", icon: <FileText size={16} />, active: pathname === "/approver/notices", to: "/approver/notices" },
        { label: "Objections & Hearings", icon: <Users size={16} />, badge: 2, active: pathname === "/approver/objections", to: "/approver/objections" },
        { label: "Possession", icon: <KeyRound size={16} />, badge: 1, active: pathname === "/approver/possession", to: "/approver/possession" },
        { label: "Approved Cases", icon: <CheckCircle2 size={16} />, badge: approvedList.length, active: pathname === "/approver/approved", to: "/approver/approved" },
        { label: "Audit Trail", icon: <History size={16} />, active: pathname === "/approver/audit", to: "/approver/audit" },
      ],
    },
    {
      title: "Authority",
      items: [{ label: "CALA Powers & SOP", icon: <Gavel size={16} />, active: pathname === "/approver/powers", to: "/approver/powers" }],
    },
  ];

  return (
    <PortalLayout
      portalBadge={PORTAL.badge}
      portalSub={PORTAL.sub}
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={`CALA • ${OFFICER.badge}`}
      activeContext={PORTAL.activeContext}
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "CALA Authority & Powers",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Officer Profile",
        onViewOfficerProfile: go("/approver/powers"),
        onViewOrgProfile: go("/approver/powers"),
        onResetDemo: () => {
          resetDemo();
          navigate({ to: "/approver/dashboard" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 5,
        onNotificationClick: go("/approver/dashboard"),
      }}
      topActions={
        <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold xl:inline-flex">
          <span className="text-slate-400">Authority:</span>
          {(["CALA", "DM"] as const).map((a) => (
            <button key={a} onClick={() => setAuthority(a)} className={`rounded-md px-2.5 py-1 ${authority === a ? "bg-[#0B2A5B] text-white" : "text-slate-500 hover:text-slate-800"}`}>
              {a === "CALA" ? "CALA (Competent Authority)" : "DM / DC"}
            </button>
          ))}
        </span>
      }
    >
      {/* The active page — one route file per screen */}
      <Outlet />

      {/* Statutory authority scope (portal-wide) */}
      <StatutoryScopeFooter
        actions={
          <>
            <button onClick={go("/approver/audit")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><History size={12} /> Audit Trail</button>
            <button onClick={go("/approver/powers")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><BookOpen size={12} /> CALA Powers &amp; SOP</button>
            <button onClick={go("/approver/pending")} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 font-bold text-white">Continue Reviews <ArrowRight size={12} /></button>
          </>
        }
      />
    </PortalLayout>
  );
}

export default ApproverShell;
