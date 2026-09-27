import type { Crumb } from "../components/common/Breadcrumbs";

/* ========================================================================== */
/* CITIZEN PORTAL BREADCRUMB HIERARCHY                                         */
/*                                                                             */
/* Single source of truth for the breadcrumb language across the Citizen       */
/* Portal: Home > Section > Current Page.                                       */
/*                                                                             */
/* The "Home" crumb is injected automatically by <Breadcrumbs /> so that no    */
/* page can omit it or regress to the old "Citizen Portal" label. Pages only   */
/* supply the section trail, built from the constants below.                    */
/*                                                                             */
/* Section parents mirror the sidebar hierarchy in citizenNavigation.ts.       */
/* Each points at a real, existing route (that section's landing page) — no    */
/* route is invented here.                                                      */
/* ========================================================================== */

/** Existing Citizen dashboard route — the target of the "Home" crumb. */
export const CITIZEN_HOME_ROUTE = "/citizen/dashboard";

/** Label used for the first crumb on every Citizen Portal page. */
export const CITIZEN_HOME_LABEL = "Home";

/* -------------------------------------------------------------------------- */
/* SECTION PARENTS                                                            */
/* -------------------------------------------------------------------------- */

export const MY_LAND_SECTION: Crumb = {
  label: "My Land",
  href: "/citizen/my-land",
};

export const LAND_SERVICES_SECTION: Crumb = {
  label: "Land Services",
  href: "/citizen/acquisition",
};

export const DOCUMENT_DIGITIZATION_SECTION: Crumb = {
  label: "Document Digitization",
  href: "/citizen/digitalizations",
};

export const ACTIVITY_SECTION: Crumb = {
  label: "Activity",
  href: "/citizen/activity",
};

/* -------------------------------------------------------------------------- */
/| ROUTE -> SECTION TRAIL REFERENCE                                          */
/* -------------------------------------------------------------------------- */

/**
 * Section trail for every routed Citizen Portal page, in sidebar order.
 * The trailing entry is the current page and is rendered non-interactive.
 *
 * This map is intentionally exhaustive: it is the audit surface for the whole
 * portal, so a newly added Citizen route is obvious when it is missing here.
 */
export const CITIZEN_BREADCRUMB_TRAILS: Record<string, Crumb[]> = {
  /* ---- 1. Dashboard ---- */
  "/citizen/dashboard": [{ label: "Dashboard" }],

  /* ---- 2. My Land ---- */
  "/citizen/my-land": [MY_LAND_SECTION, { label: "My Land Overview" }],
  "/citizen/my-land-map": [MY_LAND_SECTION, { label: "My Land Map" }],
  "/citizen/land-details": [MY_LAND_SECTION, { label: "Land Details" }],
  "/citizen/find-land": [MY_LAND_SECTION, { label: "Search / Find Land" }],
  "/citizen/my-land-acquisition": [
    MY_LAND_SECTION,
    { label: "My Land Acquisition" },
  ],

  /* ---- 3. Land Services ---- */
  "/citizen/acquisition": [LAND_SERVICES_SECTION, { label: "Land Acquisition" }],
  "/citizen/acquisition-status": [
    LAND_SERVICES_SECTION,
    { label: "Acquisition Status" },
  ],
  "/citizen/compensation": [LAND_SERVICES_SECTION, { label: "Compensation" }],
  "/citizen/rehabilitation": [
    LAND_SERVICES_SECTION,
    { label: "Rehabilitation & R&R" },
  ],

  /* ---- 4. Document Digitization ---- */
  "/citizen/digitalizations": [
    DOCUMENT_DIGITIZATION_SECTION,
    { label: "Digitize Document" },
  ],
  "/citizen/processing-status": [
    DOCUMENT_DIGITIZATION_SECTION,
    { label: "Processing Status" },
  ],
  "/citizen/digitized-records": [
    DOCUMENT_DIGITIZATION_SECTION,
    { label: "Digitized Records" },
  ],

  /* ---- 5. Standalone sections ---- */
  "/citizen/documents": [{ label: "My Documents" }],
  "/citizen/notices": [{ label: "Notices" }],
  "/citizen/activity": [ACTIVITY_SECTION, { label: "Recent Activity" }],
  "/citizen/support": [{ label: "Support" }],

  /* ---- 6. Bottom utility navigation ---- */
  "/citizen/profile": [{ label: "Profile" }],
  "/citizen/security": [{ label: "Security" }],
  "/citizen/preferences": [{ label: "Preferences" }],
  "/citizen/settings": [{ label: "Settings" }],
};

/**
 * Returns the section trail for a route, falling back to the route's own last
 * path segment so an unmapped page still renders a valid single-crumb trail
 * instead of an empty breadcrumb.
 */
export function citizenCrumbs(route: string): Crumb[] {
  const trail = CITIZEN_BREADCRUMB_TRAILS[route];

  if (trail) return trail;

  const leaf = route.split("/").filter(Boolean).pop() ?? "Page";

  return [{ label: humanize(leaf) }];
}

function humanize(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
