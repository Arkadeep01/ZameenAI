import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { X, Settings, User } from "lucide-react";
import { CitizenNavSection as CitizenNavSectionConfig } from "../../config/citizenNavigation";
import {
  citizenNavGroups,
  citizenUtilityNavItems,
  getActiveSectionForPath,
  isRouteActive,
} from "../../config/citizenNavigation";
import { useCitizenProfile } from "../../services/citizen";
import { citizenInfo } from "../../utils/gisMockData";
import zameenLogo from "../../../assets/logo.png";
import CitizenNavSection from "./CitizenNavSection";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Profile data for citizen identity badge (matches dashboard)
  const { data: profile } = useCitizenProfile();
  const citizenName = profile?.name || citizenInfo.name;
  const village = profile?.village || citizenInfo.village;

  const initials = useMemo(() => {
    return (
      citizenName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "RK"
    );
  }, [citizenName]);

  // Identify which parent category section contains the active route
  const activeSectionId = useMemo(
    () => getActiveSectionForPath(location.pathname),
    [location.pathname],
  );

  // Track explicit manual collapse by the user for parent sections
  const [collapsedByUser, setCollapsedByUser] = useState<
    Record<string, boolean>
  >({});

  // When active section changes, ensure it is expanded (reset any prior manual collapse)
  useEffect(() => {
    if (activeSectionId) {
      setCollapsedByUser((prev) => ({
        ...prev,
        [activeSectionId]: false,
      }));
    }
  }, [activeSectionId]);

  // Determine whether a section is expanded:
  // - If it contains the currently active route, it's expanded unless explicitly collapsed by the user
  // - Otherwise, keep collapsed for a compact, clean government-grade sidebar hierarchy
  const isSectionExpanded = (sectionId: string): boolean => {
    if (sectionId === activeSectionId) {
      return !collapsedByUser[sectionId];
    }
    return false;
  };

  // Handle parent category click:
  // 1. If currently expanded: toggle to collapsed without changing route
  // 2. If currently collapsed:
  //    - If current route is ALREADY inside this section: simply re-expand and keep current active child
  //    - If current route is NOT inside this section: expand AND navigate to first child by default
  const handleToggleSection = (section: CitizenNavSectionConfig) => {
    const isCurrentlyOpen = isSectionExpanded(section.id);

    if (isCurrentlyOpen) {
      // User clicked already-expanded parent: collapse it, preserve current route
      setCollapsedByUser((prev) => ({
        ...prev,
        [section.id]: true,
      }));
    } else {
      // Re-open section
      setCollapsedByUser((prev) => ({
        ...prev,
        [section.id]: false,
      }));

      // Check if current route is already a child of this section
      const hasActiveChild = (section.items || []).some(
        (item) => item.href && isRouteActive(item.href, location.pathname),
      );

      // If current route does not belong to this section, navigate to FIRST CHILD
      if (!hasActiveChild && section.items?.[0]?.href) {
        navigate({ to: section.items[0].href });
        if (isOpen) {
          onClose();
        }
      }
    }
  };

  // Close drawer on mobile navigation
  const handleNavigate = () => {
    onClose();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("citizenToken");
      sessionStorage.clear();
    } catch {
      // ignore storage access errors
    }
    navigate({ to: "/" });
  };

  return (
    <aside
      className={`fixed left-0 z-[1200] flex flex-col bg-[#062B52] text-white shadow-2xl lg:shadow-none transition-transform duration-200 ease-out select-none ${
        /* Desktop: fixed below 72px header, height calc(100vh - 72px), width 260px (target 250-270px) */
        "lg:top-[72px] lg:z-[1050] lg:h-[calc(100vh-72px)] lg:w-[260px] lg:translate-x-0 lg:border-r lg:border-white/10"
      } ${
        /* Mobile: slide-over drawer width 260px */
        "top-0 bottom-0 w-[260px] " +
        (isOpen ? "translate-x-0" : "-translate-x-full")
      }`}
      aria-label="Citizen Portal Navigation Sidebar"
    >
      {/* ================================================================== */}
      {/* MOBILE DRAWER HEADER (Visible only on mobile)                      */}
      {/* ================================================================== */}
      <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-white/10 px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <img
            src={zameenLogo}
            alt="ZameenAI Emblem"
            className="h-7 w-7 object-contain rounded"
          />
          <div className="leading-tight">
            <div className="flex items-baseline">
              <span className="text-base font-extrabold tracking-tight text-white">
                Zameen
              </span>
              <span className="text-base font-extrabold tracking-tight text-sky-400">
                AI
              </span>
            </div>
            <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-300">
              Citizen Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Close navigation sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* ================================================================== */}
      {/* MAIN NAVIGATION (Scrollable, takes available space)                */}
      {/* ================================================================== */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-3 select-none scrollbar-thin scrollbar-thumb-white/10">
        {citizenNavGroups.map((group, groupIdx) => (
          <div key={group.groupLabel} className="space-y-1.5">
            {group.sections.map((section) => {
              // Direct Top-Level Item (e.g. Dashboard)
              if (section.href && !section.items) {
                const isActive = isRouteActive(section.href, location.pathname);
                const Icon = section.icon;

                return (
                  <Link
                    key={section.id}
                    to={section.href}
                    onClick={handleNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex h-12 w-full items-center justify-between rounded-[10px] px-4 text-[16px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none ${
                      isActive
                        ? "bg-[#1261A8] text-white font-semibold shadow-sm"
                        : "text-[#DCE8F5] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-[#B8CBE0] group-hover:text-white"
                        }`}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                      </div>
                      <span className="truncate leading-tight">
                        {section.label}
                      </span>
                    </div>
                  </Link>
                );
              }

              // Collapsible Parent Section with Children
              return (
                <CitizenNavSection
                  key={section.id}
                  section={section}
                  isOpen={isSectionExpanded(section.id)}
                  onToggle={handleToggleSection}
                  currentPath={location.pathname}
                  onNavigate={handleNavigate}
                />
              );
            })}
          </div>
        ))}
      </nav>

      {/* ================================================================== */}
      {/* BOTTOM UTILITY SECTION (Profile, Settings, Logout)                */}
      {/* ================================================================== */}
      <div className="shrink-0 border-t border-white/10 px-3 py-3 space-y-1">
        {citizenUtilityNavItems.map((item) => {
          const isActive = item.href
            ? isRouteActive(item.href, location.pathname)
            : false;
          const Icon = item.icon;

          // Action items have no href (e.g. Logout); everything else is a route.
          if (!item.href) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else handleLogout();
                  if (isOpen) onClose();
                }}
                aria-current={isActive ? "page" : undefined}
                className={`group flex h-12 w-full items-center justify-between rounded-[10px] px-4 text-[16px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none ${
                  item.destructive
                    ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    : "text-[#DCE8F5] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                      item.destructive
                        ? "text-red-400 group-hover:text-red-300"
                        : isActive
                          ? "text-white"
                          : "text-[#B8CBE0] group-hover:text-white"
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive || item.destructive ? 2.2 : 1.8}
                    />
                  </div>
                  <span className="truncate leading-tight">{item.label}</span>
                </div>
              </button>
            );
          }

          // Regular navigation items (Profile, Settings)
          return (
            <Link
              key={item.id}
              to={item.href}
              onClick={handleNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`group flex h-12 w-full items-center justify-between rounded-[10px] px-4 text-[16px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none ${
                isActive
                  ? "bg-[#1261A8] text-white font-semibold shadow-sm"
                  : "text-[#DCE8F5] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-[#B8CBE0] group-hover:text-white"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                </div>
                <span className="truncate leading-tight">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
