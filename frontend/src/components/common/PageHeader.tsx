import React from "react";
import Breadcrumbs from "./Breadcrumbs";
import type { Crumb } from "./Breadcrumbs";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Full breadcrumb trail, portal root first (e.g. My Land → Land Details). */
  breadcrumbs?: Crumb[];
  /** Optional right-hand slot: actions, filters, status chips. */
  actions?: React.ReactNode;
  /** Rendered under the title, above the subtitle (e.g. an identity badge). */
  eyebrow?: React.ReactNode;
  className?: string;
}

/**
 * Canonical Citizen Portal page header: breadcrumb trail, page title,
 * subtitle and an optional action slot — all on one shared type scale.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  eyebrow,
  className = "",
}) => {
  return (
    <header
      className={`flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${className}`}
    >
      {/* ---- Title block ---- */}
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} className="mb-2" />
        )}

        {eyebrow}

        <h1 className="text-xl font-bold tracking-tight text-[#062B52] sm:text-2xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>

      {/* ---- Optional action slot ---- */}
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
