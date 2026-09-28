import React from "react";
import { X } from "lucide-react";
import type { CitizenNavSection } from "../../config/citizenNavigation";
import { isRouteActive } from "../../config/citizenNavigation";
import CitizenFlyoutItem from "./CitizenFlyoutItem";

interface CitizenFlyoutSectionProps {
  section: CitizenNavSection;
  currentPath: string;
  onNavigate: () => void;
  onClose: () => void;
}

export const CitizenFlyoutSection: React.FC<CitizenFlyoutSectionProps> = ({
  section,
  currentPath,
  onNavigate,
  onClose,
}) => {
  const SectionIcon = section.icon;

  return (
    <div className="flex h-full flex-col">
      {/* Flyout Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 px-4 bg-slate-50/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 border border-sky-200/70">
            <SectionIcon size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-bold uppercase tracking-wider text-[#06254A]">
              {section.label}
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Contextual Navigation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
          aria-label={`Close ${section.label} panel`}
        >
          <X size={15} />
        </button>
      </div>

      {/* Options List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.15)_transparent]">
        <ul className="space-y-1" role="menu">
          {(section.items || []).map((item) => (
            <li key={item.id} role="none">
              <CitizenFlyoutItem
                item={item}
                isActive={isRouteActive(item.href, currentPath)}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Flyout Footer hint */}
      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] text-slate-400">
        Press <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[9px] text-slate-500 shadow-2xs">Esc</kbd> or click outside to dismiss
      </div>
    </div>
  );
};

export default CitizenFlyoutSection;
