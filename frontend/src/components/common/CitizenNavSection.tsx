import React from "react";
import { ChevronRight } from "lucide-react";
import type { CitizenNavSection as CitizenNavSectionConfig } from "../../config/citizenNavigation";
import { isRouteActive } from "../../config/citizenNavigation";
import CitizenNavItem from "./CitizenNavItem";

interface CitizenNavSectionProps {
  section: CitizenNavSectionConfig;
  isOpen: boolean;
  onToggle: (section: CitizenNavSectionConfig) => void;
  currentPath: string;
  onNavigate?: () => void;
}

export const CitizenNavSection: React.FC<CitizenNavSectionProps> = ({
  section,
  isOpen,
  onToggle,
  currentPath,
  onNavigate,
}) => {
  const SectionIcon = section.icon;

  // Check if any child item is currently active for this parent section
  const hasActiveChild = (section.items || []).some(
    (item) => item.href && isRouteActive(item.href, currentPath),
  );

  return (
    <div className="space-y-1">
      {/* Parent Category Header Button (48px height, 16px horizontal padding, 20px icon, 16px text) */}
      <button
        type="button"
        onClick={() => onToggle(section)}
        aria-expanded={isOpen}
        aria-controls={`section-${section.id}`}
        id={`section-header-${section.id}`}
        className={`group flex h-12 w-full items-center justify-between rounded-[10px] px-4 text-[16px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none ${
          isOpen
            ? "bg-white/[0.06] text-white font-semibold"
            : "text-[#DCE8F5] hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
              hasActiveChild
                ? "text-sky-300"
                : isOpen
                  ? "text-white"
                  : "text-[#B8CBE0] group-hover:text-white"
            }`}
          >
            <SectionIcon
              size={20}
              strokeWidth={hasActiveChild || isOpen ? 2.1 : 1.8}
            />
          </div>
          <span className="truncate leading-tight">{section.label}</span>
        </div>

        <ChevronRight
          size={18}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 ease-out ${
            isOpen
              ? "rotate-90 text-sky-400"
              : "text-[#B8CBE0] group-hover:text-white rotate-0"
          }`}
        />
      </button>

      {/* Expandable Submenu Area with Grid Row Animation */}
      <div
        id={`section-${section.id}`}
        role="region"
        aria-labelledby={`section-header-${section.id}`}
        className={`grid transition-all duration-200 ease-out ${
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-5 pl-2.5 border-l border-white/10 space-y-1 pt-1 pb-1">
            <ul className="space-y-1">
              {(section.items || []).map((item) => (
                <li key={item.id || item.label}>
                  <CitizenNavItem
                    item={item}
                    isActive={isRouteActive(item.href, currentPath)}
                    isChild={true}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenNavSection;
