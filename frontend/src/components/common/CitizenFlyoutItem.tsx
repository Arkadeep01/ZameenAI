import React from "react";
import { Link } from "@tanstack/react-router";
import type { CitizenNavItem } from "../../config/citizenNavigation";

export interface CitizenFlyoutItemProps {
  item: CitizenNavItem;
  isActive: boolean;
  onNavigate?: () => void;
}

export const CitizenFlyoutItem: React.FC<CitizenFlyoutItemProps> = ({
  item,
  isActive,
  onNavigate,
}) => {
  const Icon = item.icon;

  if (!item.href) {
    return (
      <div
        role="menuitem"
        aria-disabled="true"
        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 cursor-not-allowed select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
            <Icon size={16} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{item.label}</p>
            {item.description && (
              <p className="truncate text-[10px] text-slate-400">
                {item.description}
              </p>
            )}
          </div>
        </div>
        {item.badge && (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-slate-100 text-slate-500">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      role="menuitem"
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 ${
        isActive
          ? "bg-[#EAF3FC] text-[#1261A8] font-semibold"
          : "text-slate-700 hover:bg-slate-50 hover:text-[#062B52] font-medium"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
            isActive
              ? "text-[#1261A8]"
              : "text-slate-500 group-hover:text-[#1261A8]"
          }`}
        >
          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
        </div>
        <div className="min-w-0">
          <p className="truncate leading-tight">{item.label}</p>
          {item.description && (
            <p className="truncate text-[10.5px] text-slate-500 font-normal mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {item.badge && (
        <span
          className={`ml-1.5 shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${
            isActive
              ? "bg-[#1261A8] text-white"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export default CitizenFlyoutItem;
