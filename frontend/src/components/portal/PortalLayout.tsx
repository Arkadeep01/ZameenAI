import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  MapPin,
  Menu,
  X,
  ShieldCheck,
  Building2,
  RotateCcw,
  User,
} from "lucide-react";
import logo from "../../../assets/logo.png";

export interface PortalNavItem {
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: number | string;
  to?: string;
  onClick?: () => void;
}

export interface PortalNavGroup {
  title: string;
  items: PortalNavItem[];
}

export interface PortalUserMenuProps {
  /** e.g. "Chief General Manager (Land Acquisition & Technical)" */
  userDesignation?: string;
  /** e.g. "Authorized PIA Officer (Level 4)" */
  userLevelLabel?: string;
  /** e.g. "Northern Corridor Zone IV (Uttar Pradesh & Bihar)" */
  jurisdiction?: string;
  /** label for the org/profile row, defaults to "Organization & Profile" */
  orgProfileLabel?: string;
  /** show an extra "My Officer Profile" row that opens the officer dossier */
  showOfficerProfileRow?: boolean;
  officerProfileLabel?: string;
  onViewOfficerProfile?: () => void;
  onViewOrgProfile?: () => void;
  onResetDemo?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

interface PortalLayoutProps {
  portalBadge: string;
  portalSub?: string;
  userName: string;
  userInitials: string;
  userRole: string;
  activeContext?: string;
  sidebarGroups: PortalNavGroup[];
  children: ReactNode;
  topActions?: ReactNode;
  userMenu?: PortalUserMenuProps;
}

/**
 * Shared light-theme shell for every ZameenAI role portal.
 * Mirrors the Citizen dashboard look (Image 2 / Image 6):
 * white topbar + white sidebar + slate-50 canvas + white cards.
 */
export default function PortalLayout({
  portalBadge,
  portalSub,
  userName,
  userInitials,
  userRole,
  activeContext,
  sidebarGroups,
  children,
  topActions,
  userMenu,
}: PortalLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [userOpen]);

  const notifCount = userMenu?.notificationCount ?? 2;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800">
      {/* ================= TOP BAR ================= */}
      <header className="fixed left-0 right-0 top-0 z-[100] h-16 border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src={logo}
                alt="ZameenAI logo"
                className="h-9 w-9 rounded-lg object-contain ring-1 ring-slate-200"
              />
              <span className="leading-tight">
                <span className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-[#0B1F44]">
                    ZameenAI
                  </span>
                  <span className="hidden rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0B3B5F] sm:inline-block">
                    {portalBadge}
                  </span>
                </span>
                {portalSub && (
                  <span className="hidden text-[10px] font-medium text-slate-500 sm:block">
                    {portalSub}
                  </span>
                )}
              </span>
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {activeContext && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                <MapPin size={14} className="text-[#0B3B5F]" />
                <span className="text-slate-400">Active:</span>
                <span className="font-semibold text-slate-800">
                  {activeContext}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </span>
            )}
            {topActions}
            <Link
              to="/"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ← Public Portal
            </Link>
            <button
              type="button"
              onClick={() => userMenu?.onNotificationClick?.()}
              className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              {notifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notifCount}
                </span>
              )}
            </button>
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userOpen}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${
                  userOpen
                    ? "border-slate-300 bg-slate-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B2A5B] text-xs font-bold text-white">
                  {userInitials}
                </span>
                <span className="text-left leading-tight">
                  <span className="block max-w-[150px] truncate text-xs font-bold text-slate-800">
                    {userName}
                  </span>
                  <span className="block max-w-[150px] truncate text-[10px] text-slate-500">
                    {userRole}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${userOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                >
                  {/* officer identity */}
                  <div className="border-b border-slate-100 px-4 pb-3 pt-3.5">
                    <p className="text-sm font-bold leading-snug text-slate-900">
                      {userName}
                    </p>
                    {userMenu?.userDesignation && (
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">
                        {userMenu.userDesignation}
                      </p>
                    )}
                    {userMenu?.userLevelLabel && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                        <ShieldCheck size={13} />
                        {userMenu.userLevelLabel}
                      </p>
                    )}
                  </div>

                  {userMenu?.showOfficerProfileRow && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserOpen(false);
                        userMenu?.onViewOfficerProfile?.();
                      }}
                      className="flex w-full items-center gap-2.5 border-b border-slate-100 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <User size={15} className="text-slate-400" />
                      {userMenu.officerProfileLabel ?? "My Officer Profile"}
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserOpen(false);
                      userMenu?.onViewOrgProfile?.();
                    }}
                    className="flex w-full items-center gap-2.5 border-b border-slate-100 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Building2 size={15} className="text-slate-400" />
                    {userMenu?.orgProfileLabel ?? "Organization & Profile"}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserOpen(false);
                      userMenu?.onResetDemo?.();
                    }}
                    className="flex w-full items-center gap-2.5 border-b border-slate-100 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw size={15} className="text-slate-400" />
                    Reset Demo Data
                  </button>

                  {userMenu?.jurisdiction && (
                    <p className="bg-slate-50 px-4 py-2.5 text-[11px] leading-snug text-slate-500">
                      <span className="font-semibold text-slate-600">Jurisdiction:</span>{" "}
                      {userMenu.jurisdiction}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* mobile user chip */}
          <button
            type="button"
            onClick={() => {
              if (userMenu?.showOfficerProfileRow) userMenu?.onViewOfficerProfile?.();
              else userMenu?.onViewOrgProfile?.();
            }}
            aria-label="Open profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B2A5B] text-xs font-bold text-white md:hidden"
          >
            {userInitials}
          </button>
        </div>
      </header>

      <div className="flex pt-16">
        {/* ================= SIDEBAR ================= */}
        <aside
          className={`fixed bottom-0 left-0 top-16 z-[90] w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 transition-transform duration-200 lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                          item.active
                            ? "bg-[#0B2A5B] text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className={item.active ? "text-white" : "text-slate-500"}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              item.active
                                ? "bg-white/20 text-white"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          item.onClick?.();
                          setMobileOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
                          item.active
                            ? "bg-[#0B2A5B] text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className={item.active ? "text-white" : "text-slate-500"}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              item.active
                                ? "bg-white/20 text-white"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-xl border border-slate-200 bg-sky-50/60 p-3 text-[11px] leading-relaxed text-slate-600">
            <p className="font-bold text-[#0B3B5F]">DPDP Act 2023 Protected</p>
            <p className="mt-1">
              Tamper-evident audit log • NIC Cloud • DSC signed actions
            </p>
          </div>
        </aside>
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-[80] bg-black/30 lg:hidden"
          />
        )}

        {/* ================= CONTENT ================= */}
        <main className="min-w-0 flex-1 lg:pl-60">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- shared light-theme building blocks ---------- */

export function PortalCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

export function GreetingHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="inline-block rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#0B3B5F]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </section>
  );
}
