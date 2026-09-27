import React from "react";
import { Link } from "@tanstack/react-router";
import type { CitizenNavItem as CitizenNavItemConfig } from "../../config/citizenNavigation";

interface CitizenNavItemProps {
  item: CitizenNavItemConfig;
  isActive: boolean;
  isChild?: boolean;
  onNavigate?: () => void;
}

export const CitizenNavItem: React.FC<CitizenNavItemProps> = ({
  item,
  isActive,
  onNavigate,
}) => {
  const Icon = item.icon;

  if (!item.href) {
    return (
      <div
        role="button"
        aria-disabled="true"
        tabIndex={-1}
        className="group flex h-10 w-full items-center justify-between rounded-[8px] px-3 text-[14.5px] font-medium text-slate-400/60 select-none cursor-not-allowed transition-colors"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500/60">
            <Icon size={17} strokeWidth={1.8} />
          </div>
          <span className="truncate leading-tight text-slate-400/70">
            {item.label}
          </span>
        </div>

        {item.badge && (
          <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider bg-white/[0.06] text-slate-300 border border-white/10">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`group flex h-10 w-full items-center justify-between rounded-[8px] px-3 text-[14.5px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none ${
        isActive
          ? "bg-[#1261A8] text-white font-semibold shadow-sm"
          : "text-[#DCE8F5] hover:bg-white/[0.08] hover:text-white font-medium"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
            isActive ? "text-white" : "text-[#B8CBE0] group-hover:text-white"
          }`}
        >
          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
        </div>
        <span
          className={`truncate leading-tight ${
            isActive ? "font-semibold text-white" : "text-[#DCE8F5] group-hover:text-white"
          }`}
        >
          {item.label}
        </span>
      </div>

      {item.badge && (
        <span
          className={`ml-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${
            isActive
              ? "bg-white/20 text-white font-bold"
              : "bg-white/[0.06] text-slate-300 border border-white/10"
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export default CitizenNavItem;
