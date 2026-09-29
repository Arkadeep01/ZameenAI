import React, { forwardRef } from "react";
import type { CitizenNavSection } from "../../config/citizenNavigation";
import CitizenFlyoutSection from "./CitizenFlyoutSection";

interface CitizenFlyoutProps {
  activeSection: CitizenNavSection | null;
  currentPath: string;
  onNavigate: () => void;
  onClose: () => void;
}

export const CitizenFlyout = forwardRef<HTMLDivElement, CitizenFlyoutProps>(
  ({ activeSection, currentPath, onNavigate, onClose }, ref) => {
    const isOpen = Boolean(activeSection);

    return (
      <aside
        ref={ref}
        id={activeSection ? `flyout-${activeSection.id}` : undefined}
        aria-label={activeSection ? `${activeSection.label} Navigation` : "Contextual Navigation"}
        aria-hidden={!isOpen}
        className={`hidden lg:flex fixed left-[250px] top-0 z-[1250] h-screen w-[275px] flex-col border-r border-slate-200/90 bg-white shadow-2xl shadow-slate-950/10 transition-all duration-200 ease-out ${
          isOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-2 opacity-0 pointer-events-none"
        }`}
      >
        {activeSection && (
          <CitizenFlyoutSection
            section={activeSection}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onClose={onClose}
          />
        )}
      </aside>
    );
  },
);

CitizenFlyout.displayName = "CitizenFlyout";

export default CitizenFlyout;
