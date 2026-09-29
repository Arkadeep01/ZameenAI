import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import {
  CITIZEN_HOME_LABEL,
  CITIZEN_HOME_ROUTE,
} from "../../config/citizenBreadcrumbs";

export interface Crumb {
  label: string;
  /** When omitted the crumb renders as a non-interactive hierarchy label. */
  href?: string;
}

interface BreadcrumbsProps {
  /**
   * Section trail, ordered from the owning section to the current page.
   * The final entry is the current page and is never clickable.
   *
   * The leading "Home" crumb is injected automatically — callers should not
   * supply it, and a caller-supplied "Home" is de-duplicated.
   */
  items: Crumb[];
  className?: string;
}

/**
 * Single shared breadcrumb renderer for the Citizen Portal so every page uses
 * the same size, colour, separator, spacing and active-page treatment.
 *
 * Canonical form: Home > Section > Current Page
 *  - "Home" always links to the existing Citizen dashboard route.
 *  - Parent crumbs are muted and clickable when a real route exists.
 *  - The current page is navy, semibold, and not a link.
 *  - A parent pointing at the current route degrades to a plain label so a
 *    page never links to itself.
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className = "",
}) => {
  const pathname = useLocation({ select: (location) => location.pathname });

  const supplied = (items ?? []).filter(Boolean);

  /* Home is owned by this component so no page can omit or rename it. */
  const trail: Crumb[] = [
    { label: CITIZEN_HOME_LABEL, href: CITIZEN_HOME_ROUTE },
    ...supplied.filter(
      (crumb) =>
        !(
          crumb.label.trim().toLowerCase() === CITIZEN_HOME_LABEL.toLowerCase()
        ),
    ),
  ];

  if (trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs leading-5 sm:text-[13px]">
        {trail.map((crumb, index) => {
          const isCurrent = index === trail.length - 1;
          const selfLink = !isCurrent && crumb.href === pathname;

          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex min-w-0 max-w-full items-center gap-1"
            >
              {index > 0 && (
                <ChevronRight
                  size={12}
                  aria-hidden="true"
                  className="shrink-0 text-slate-300"
                />
              )}

              {isCurrent ? (
                <span
                  aria-current="page"
                  className="truncate font-semibold text-[#062B52]"
                >
                  {crumb.label}
                </span>
              ) : selfLink || !crumb.href ? (
                /* Non-clickable hierarchy label: no route, or it is this page. */
                <span className="truncate font-medium text-slate-500">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.href}
                  className="truncate rounded font-medium text-slate-500 transition-colors hover:text-[#1261A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
