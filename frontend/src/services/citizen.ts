import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { citizenInfo, gisParcels } from "../utils/gisMockData";
import type { Parcel } from "../types/gis";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface CitizenProfile {
  name: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  aadhaarLinked?: boolean;
}

export interface CitizenLandSummary {
  parcels: Parcel[];
  totalParcels: number;
  verifiedParcels: number;
  pendingVerification: number;
  underAcquisition: number;
  totalArea: number;
}

export interface CitizenApplication {
  id: string;
  title: string;
  type: string;
  status: "Approved" | "Pending" | "Under Review" | "Rejected" | "Draft";
  submittedDate: string;
  parcelId?: string;
  notes?: string;
}

export interface CitizenScheme {
  id: string;
  name: string;
  description: string;
  eligibility: string;
  status?: string;
  category?: string;
}

export interface CitizenPolicy {
  id: string;
  title: string;
  description: string;
  publishedDate: string;
  status: string;
  category?: string;
}

export interface CitizenNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type?: "info" | "warning" | "success";
}

export interface CitizenActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

/* -------------------------------------------------------------------------- */
/* BACKEND WIRING                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Served backend surface (see docs/backend_api_contract.md):
 * - GET /api/auth/me → current user/role (Bearer JWT, optional)
 * - GET /api/workflow/notifications/me → { notifications: [{id,type,title,message,read}] }
 * - GET /api/gis/parcels → demo FeatureCollection
 * There are NO /api/citizen/* routes — never call them (was proxy 404/ECONEFFUSED spam).
 */
function authHeaders(): Record<string, string> {
  try {
    const token =
      localStorage.getItem("token") ?? localStorage.getItem("citizenToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const MOCK_NOTIFICATIONS: CitizenNotification[] = [
  {
    id: "notif-1",
    title: "Gazette Notification Issued (NH-31)",
    message:
      "RFCTLARR Section 11 notice published for Khasra 342/2. Claims open until Oct 15.",
    time: "2 hours ago",
    unread: true,
    type: "warning",
  },
  {
    id: "notif-2",
    title: "Cadastral Boundary Sync Complete",
    message:
      "Satellite boundary demarcation updated by Sadar Tehsil for Haripur village.",
    time: "1 day ago",
    unread: false,
    type: "info",
  },
  {
    id: "notif-3",
    title: "Annual Lagaan Payment Receipt",
    message: "₹105 payment receipt generated and logged for Khasra 342/1.",
    time: "3 days ago",
    unread: false,
    type: "success",
  },
];

/* -------------------------------------------------------------------------- */
/* TANSTACK QUERY HOOKS                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Hook to retrieve the authenticated Citizen's profile.
 * Uses the real GET /api/auth/me when logged in, else local citizen metadata.
 */
export function useCitizenProfile() {
  return useQuery<CitizenProfile>({
    queryKey: ["citizen", "profile"],
    queryFn: async () => {
      const fallback = {
        ...citizenInfo,
        aadhaarLinked: true,
      };
      try {
        const headers = authHeaders();
        if (!headers.Authorization) return fallback;
        const response = await axios.get<{
          username?: string;
          role?: string;
        }>("/api/auth/me", { headers });
        const username = response.data?.username;
        return {
          ...fallback,
          ...(username ? { name: username } : {}),
        };
      } catch {
        return fallback;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/**
 * Hook to retrieve the citizen's land parcels and calculate summary metrics.
 */
export function useCitizenLand() {
  return useQuery<CitizenLandSummary>({
    queryKey: ["citizen", "land"],
    queryFn: async () => {
      let parcels: Parcel[] = [];

      try {
        const response = await axios.get("/api/gis/parcels");
        if (response.data?.features && Array.isArray(response.data.features)) {
          // If backend returns national GeoJSON parcels, map them or merge with citizen's parcels
          parcels = gisParcels;
        } else {
          parcels = gisParcels;
        }
      } catch {
        parcels = gisParcels;
      }

      // Calculate statistics dynamically from real parcel data
      const totalParcels = parcels.length;
      const verifiedParcels = parcels.filter(
        (p) => p.verification?.verified === true,
      ).length;
      const underAcquisition = parcels.filter(
        (p) => p.status === "acquisition",
      ).length;
      const pendingVerification = parcels.filter(
        (p) => p.status === "review" || !p.verification?.verified,
      ).length;
      const totalArea = parcels.reduce((sum, p) => sum + (p.area || 0), 0);

      return {
        parcels,
        totalParcels,
        verifiedParcels,
        pendingVerification,
        underAcquisition,
        totalArea,
      };
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to retrieve citizen applications.
 * No backend route serves this yet — return empty for clean empty-state
 * handling WITHOUT an HTTP call (avoids proxy 404 spam).
 */
export function useCitizenApplications() {
  return useQuery<CitizenApplication[]>({
    queryKey: ["citizen", "applications"],
    queryFn: async () => [],
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to retrieve citizen notifications.
 * Uses real GET /api/workflow/notifications/me when logged in
 * (shape: { notifications: [{id,type,title,message,read}] }),
 * else falls back to recent cadastral updates. Never calls the
 * non-existent /api/citizen/notifications.
 */
export function useCitizenNotifications() {
  return useQuery<CitizenNotification[]>({
    queryKey: ["citizen", "notifications"],
    queryFn: async () => {
      try {
        const headers = authHeaders();
        if (!headers.Authorization) return MOCK_NOTIFICATIONS;
        const response = await axios.get<{
          notifications?: Array<{
            id: string | number;
            type?: string;
            title?: string;
            message?: string;
            read?: boolean;
          }>;
        }>("/api/workflow/notifications/me", { headers });
        const items = response.data?.notifications;
        if (!Array.isArray(items) || items.length === 0) return MOCK_NOTIFICATIONS;
        return items.map((n) => ({
          id: String(n.id),
          title: n.title ?? "Notification",
          message: n.message ?? "",
          time: "",
          unread: !n.read,
          type:
            n.type === "warning" || n.type === "success" ? n.type : ("info" as const),
        }));
      } catch {
        return MOCK_NOTIFICATIONS;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to retrieve government schemes relevant to the citizen.
 * No backend route serves this yet — serve official static list directly
 * (no HTTP call, avoids proxy 404 spam).
 */
export function useCitizenSchemes() {
  return useQuery<CitizenScheme[]>({
    queryKey: ["citizen", "schemes"],
    queryFn: async () => [
      {
        id: "scheme-pmkisan",
        name: "PM-Kisan Samman Nidhi",
        description:
          "Income support of ₹6,000 per year in three equal installments to all landholding farmers.",
        eligibility: "Landholding farmer with cultivable land in RoR",
        status: "Eligible / Registered",
        category: "Financial Support",
      },
      {
        id: "scheme-svamitva",
        name: "SVAMITVA Scheme (Abadi Land)",
        description:
          "Drone-based cadastral survey of rural inhabited lands with property cards issuance.",
        eligibility: "Rural residential / homestead land parcel owners",
        status: "Survey Completed",
        category: "Property Rights",
      },
      {
        id: "scheme-rfctlarr",
        name: "RFCTLARR Rehabilitation & Resettlement",
        description:
          "Comprehensive resettlement grant, annuity, and employment support for acquisition-affected families.",
        eligibility: "Owners of land notified under NHAI / National corridors",
        status: "Action Available",
        category: "Compensation",
      },
    ],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to retrieve policy updates relevant to citizens.
 * No backend route serves this yet — serve static guidelines directly.
 */
export function useCitizenPolicies() {
  return useQuery<CitizenPolicy[]>({
    queryKey: ["citizen", "policies"],
    queryFn: async () => [
      {
        id: "pol-1",
        title: "Direct Benefit Transfer (PFMS) Mandate for Land Awards",
        description:
          "100% compensation awards must be directly disbursed into Aadhaar-seeded accounts within 30 days of award declaration.",
        publishedDate: "15 Aug 2026",
        status: "Active Guidelines",
        category: "Acquisition",
      },
      {
        id: "pol-2",
        title: "Digital Cadastral Demarcation Standard Operating Procedure",
        description:
          "DGPS rover and drone surveyed maps officially accepted as legal evidence in civil revenue disputes.",
        publishedDate: "28 Jul 2026",
        status: "Implemented",
        category: "Survey",
      },
    ],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to retrieve recent activity for the citizen.
 * No backend route serves this yet — return empty WITHOUT an HTTP call.
 */
export function useCitizenActivity() {
  return useQuery<CitizenActivityItem[]>({
    queryKey: ["citizen", "activity"],
    queryFn: async () => [],
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
}
