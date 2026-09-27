import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BriefcaseBusiness,
  CircleHelp,
  ClipboardCheck,
  Cpu,
  FileCheck,
  FileScan,
  FileText,
  FolderOpen,
  HeartHandshake,
  IndianRupee,
  Landmark,
  LandPlot,
  LayoutDashboard,
  LogOut,
  Map,
  Megaphone,
  Search,
  Settings,
  User,
} from "lucide-react";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

export type CitizenRoutePath =
  | "/citizen/dashboard"
  | "/citizen/my-land"
  | "/citizen/my-land-map"
  | "/citizen/land-details"
  | "/citizen/find-land"
  | "/citizen/acquisition"
  | "/citizen/acquisition-status"
  | "/citizen/compensation"
  | "/citizen/rehabilitation"
  | "/citizen/digitalizations"
  | "/citizen/processing-status"
  | "/citizen/digitized-records"
  | "/citizen/documents"
  | "/citizen/my-documents"
  | "/citizen/notices"
  | "/citizen/activity"
  | "/citizen/support"
  | "/citizen/profile"
  | "/citizen/security"
  | "/citizen/preferences"
  | "/citizen/settings";

export interface CitizenNavItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
}

export interface CitizenNavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // for direct items like Dashboard, My Documents, Notices, Activity, Support
  items?: CitizenNavItem[];
}

export interface CitizenNavGroup {
  groupLabel: string;
  sections: CitizenNavSection[];
}

// Backward-compatible type aliases
export type CitizenSection = CitizenNavSection;
export type NavItemConfig = CitizenNavItem;
export type NavSectionConfig = CitizenNavSection;

/* ========================================================================== */
/* CITIZEN NAVIGATION CONFIGURATION                                           */
/* ========================================================================== */

export const citizenNavigation: CitizenNavSection[] = [
  // 1. DASHBOARD
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/citizen/dashboard",
  },

  // 2. MY LAND (Standalone top-level navigation item)
  {
    id: "my-land",
    label: "My Land",
    icon: LandPlot,
    href: "/citizen/my-land",
  },

  // 3. SEARCH / FIND LAND (Standalone top-level navigation item)
  {
    id: "search-land",
    label: "Search / Find Land",
    icon: Search,
    href: "/citizen/find-land",
  },

  // 4. LAND SERVICES
  {
    id: "land-services",
    label: "Land Services",
    icon: BriefcaseBusiness,
    items: [
      {
        id: "land-acquisition",
        label: "Land Acquisition",
        description: "Government notifications & projects",
        href: "/citizen/acquisition",
        icon: Landmark,
      },
      {
        id: "acquisition-status",
        label: "Acquisition Status",
        description: "Track land acquisition workflow stage",
        href: "/citizen/acquisition-status",
        icon: ClipboardCheck,
      },
      {
        id: "compensation",
        label: "Compensation",
        description: "View compensation awards & payments",
        href: "/citizen/compensation",
        icon: IndianRupee,
      },
      {
        id: "rehabilitation-rr",
        label: "Rehabilitation & R&R",
        description: "Resettlement benefits & assistance",
        href: "/citizen/rehabilitation",
        icon: HeartHandshake,
      },
    ],
  },

  // 4. DOCUMENT DIGITIZATION
  {
    id: "document-digitization",
    label: "Document Digitization",
    icon: FileScan,
    items: [
      {
        id: "digitize-doc",
        label: "Digitize Document",
        description: "AI-assisted land deed & RoR scanning",
        href: "/citizen/digitalizations",
        icon: FileScan,
      },
      {
        id: "processing-status",
        label: "Processing Status",
        description: "OCR & spatial extraction pipeline",
        href: "/citizen/processing-status",
        icon: Cpu,
      },
      {
        id: "digitized-records",
        label: "Digitized Records",
        description: "Archived & verified digital copies",
        href: "/citizen/digitized-records",
        icon: FileCheck,
      },
    ],
  },

  // 5. MY DOCUMENTS (Standalone - Coming Soon)
  {
    id: "my-documents",
    label: "My Documents",
    icon: FolderOpen,
    href: "/citizen/documents",
  },

  // 6. NOTICES (Standalone - Coming Soon)
  {
    id: "notices",
    label: "Notices",
    icon: Megaphone,
    href: "/citizen/notices",
  },

  // 7. ACTIVITY (Standalone - Coming Soon)
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
    href: "/citizen/activity",
  },

  // 8. SUPPORT
  {
    id: "support",
    label: "Support",
    icon: CircleHelp,
    href: "/citizen/support",
  },
];

export const citizenSections = citizenNavigation;
export const dashboardItem = citizenNavigation[0];

/* ========================================================================== */
/* BOTTOM UTILITY NAVIGATION (Profile, Settings, Logout)                      */
/* ========================================================================== */

export interface CitizenUtilityNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}

export const citizenUtilityNavItems: CitizenUtilityNavItem[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    href: "/citizen/profile",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/citizen/settings",
  },
  {
    id: "logout",
    label: "Logout",
    icon: LogOut,
    destructive: true,
    // onClick will be set by the Sidebar component
  },
];

/* ========================================================================== */
/* SECTION GROUPS WITH SUBTLE HEADERS                                         */
/* ========================================================================== */

export const citizenNavGroups: CitizenNavGroup[] = [
  {
    groupLabel: "CITIZEN SERVICES",
    sections: citizenNavigation.slice(0, 7), // Dashboard, My Land, Search / Find Land, Land Services, Document Digitization, My Documents, Notices
  },
  {
    groupLabel: "ACTIVITY & SUPPORT",
    sections: citizenNavigation.slice(7), // Activity, Support, and any future trailing top-level sections
  },
];

/* ========================================================================== */
/* HELPER: MATCH ACTIVE ROUTE                                                 */
/* ========================================================================== */

export function isRouteActive(
  href?: string,
  currentPath: string = "",
): boolean {
  if (!href) return false;

  const cleanCurrent = currentPath.split("?")[0].replace(/\/+$/, "") || "/";
  const cleanHref = href.split("?")[0].replace(/\/+$/, "") || "/";

  if (cleanHref === "/citizen/dashboard") {
    return (
      cleanCurrent === "/citizen/dashboard" ||
      cleanCurrent === "/citizen" ||
      cleanCurrent === ""
    );
  }

  if (cleanHref === "/citizen/find-land") {
    return (
      cleanCurrent === "/citizen/find-land" ||
      cleanCurrent === "/citizen/find-my-land" ||
      cleanCurrent === "/find-my-land" ||
      cleanCurrent.startsWith("/citizen/search-land")
    );
  }

  if (cleanHref === "/citizen/my-land") {
    return (
      cleanCurrent === "/citizen/my-land" ||
      cleanCurrent === "/citizen/my-land-map" ||
      cleanCurrent === "/citizen/land-details"
    );
  }

  if (cleanHref === "/citizen/my-land-map") {
    return cleanCurrent.startsWith("/citizen/my-land-map");
  }

  if (cleanHref === "/citizen/land-details") {
    return cleanCurrent.startsWith("/citizen/land-details");
  }

  if (cleanHref === "/citizen/my-land-acquisition") {
    return cleanCurrent === "/citizen/my-land-acquisition";
  }

  if (cleanHref === "/citizen/digitalizations") {
    return cleanCurrent === "/citizen/digitalizations";
  }

  if (cleanHref === "/citizen/acquisition") {
    return (
      cleanCurrent === "/citizen/acquisition" ||
      cleanCurrent === "/citizen/land-acquisition"
    );
  }

  if (cleanHref === "/citizen/documents") {
    return (
      cleanCurrent === "/citizen/documents" ||
      cleanCurrent === "/citizen/my-documents"
    );
  }

  if (cleanHref === "/citizen/notices") {
    return cleanCurrent === "/citizen/notices";
  }

  if (cleanHref === "/citizen/activity") {
    return cleanCurrent === "/citizen/activity";
  }

  if (cleanHref === "/citizen/support") {
    return cleanCurrent === "/citizen/support";
  }

  return cleanCurrent === cleanHref || cleanCurrent.startsWith(`${cleanHref}/`);
}

/* ========================================================================== */
/* HELPER: GET CATEGORY SECTION ID FOR CURRENT PATH                          */
/* ========================================================================== */

export function getActiveSectionForPath(pathname: string): string | null {
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  // Dashboard, My Land, Search / Find Land, My Documents, Notices, Activity, Support, Profile, and Settings are standalone top-level or bottom utility items
  if (
    clean === "/citizen/dashboard" ||
    clean === "/citizen" ||
    clean === "" ||
    clean === "/citizen/my-land" ||
    clean === "/citizen/my-land-map" ||
    clean === "/citizen/land-details" ||
    clean === "/citizen/find-land" ||
    clean === "/citizen/find-my-land" ||
    clean === "/find-my-land" ||
    clean.startsWith("/citizen/search-land") ||
    clean === "/citizen/documents" ||
    clean === "/citizen/my-documents" ||
    clean === "/citizen/notices" ||
    clean === "/citizen/activity" ||
    clean === "/citizen/support" ||
    clean.startsWith("/citizen/profile") ||
    clean.startsWith("/citizen/settings")
  ) {
    return null;
  }

  if (
    clean === "/citizen/acquisition" ||
    clean.startsWith("/citizen/acquisition") ||
    clean.startsWith("/citizen/land-acquisition") ||
    clean.startsWith("/citizen/compensation") ||
    clean.startsWith("/citizen/rehabilitation")
  ) {
    return "land-services";
  }

  if (
    clean.startsWith("/citizen/digitalizations") ||
    clean.startsWith("/citizen/processing-status") ||
    clean.startsWith("/citizen/digitized-records")
  ) {
    return "document-digitization";
  }

  if (
    clean.startsWith("/citizen/profile") ||
    clean.startsWith("/citizen/security") ||
    clean.startsWith("/citizen/preferences") ||
    clean.startsWith("/citizen/settings")
  ) {
    return null; // Bottom utility items don't expand any section
  }

  return null;
}
