/**
 * Field Officer (Patwari / Ground Verification) portal — domain types,
 * fixtures and constants.
 *
 * Extracted verbatim from the former `routes/field-officer.tsx` monolith so the
 * nine field screens can become real routes without changing their data
 * contract.
 */

export type ViewKey =
  | "dashboard"
  | "assignments"
  | "map"
  | "completed"
  | "mismatches"
  | "sync"
  | "notifications"
  | "profile"
  | "verify";

export const FO_PATHS: Record<ViewKey, string> = {
  dashboard: "/field-officer/dashboard",
  assignments: "/field-officer/assignments",
  map: "/field-officer/map",
  completed: "/field-officer/completed",
  mismatches: "/field-officer/mismatches",
  sync: "/field-officer/sync",
  notifications: "/field-officer/notifications",
  profile: "/field-officer/profile",
  verify: "/field-officer/verify",
};

export const OFFICER = {
  name: "Rajesh Kumar Verma",
  initials: "RK",
  role: "Patwari",
  designation: "Patwari / Ground Verification Officer",
  badge: "FO-UP-2024-089",
  dept: "Department of Revenue & Land Records, Govt. of UP",
  phone: "+91 98765 43210",
  email: "r.verma.rev@up.gov.in",
  jurisdiction: "Varanasi · Pindra — Mauza Ramnagar & Kashi Ring Road Sector 4",
  level: "Authorized Field Officer (Ground Verification Only)",
};

export interface Assignment {
  id: string;
  khasra: string;
  village: string;
  district: string;
  areaHa: string;
  areaBigha: string;
  owner: string;
  khata: string;
  project: string;
  due: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
  status: "Assigned" | "In Progress" | "Needs Clarification" | "Submitted" | "Completed";
  distance: string;
  note: string;
}

export const initialAssignments: Assignment[] = [
  { id: "ASN-2026-0491", khasra: "142/1", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.450 Hectare", areaBigha: "1.78 Bigha", owner: "Shri Mahendra Pratap Singh", khata: "87", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-28", priority: "Urgent", status: "In Progress", distance: "~0.8 km away", note: "Verify road frontage encroachment claim on eastern boundary adjacent to existing PWD road." },
  { id: "ASN-2026-0492", khasra: "143", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.620 Hectare", areaBigha: "2.45 Bigha", owner: "Ram Lakhan Yadav & Ram Sunder Yadav", khata: "104", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-29", priority: "High", status: "Assigned", distance: "~1.2 km away", note: "Check presence of unrecorded tubewell and brick godown on southern corner." },
  { id: "ASN-2026-0479", khasra: "109/B", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.840 Hectare", areaBigha: "3.32 Bigha", owner: "Surendra Kumar Tripathi", khata: "63", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-25", priority: "High", status: "Needs Clarification", distance: "~2.1 km away", note: "LAO office flagged: Please re-verify northern boundary monument stone as per village sajra map." },
  { id: "ASN-2026-0487", khasra: "118/2", village: "Mauza Mirzapur Khurd", district: "Varanasi", areaHa: "0.310 Hectare", areaBigha: "1.22 Bigha", owner: "Smt. Malti Devi", khata: "41", project: "Dedicated Freight Corridor (DFCCIL)", due: "2026-09-27", priority: "Medium", status: "Submitted", distance: "~3.4 km away", note: "Completed offline during yesterday field trip. Awaiting sync from local tablet storage." },
  { id: "ASN-2026-0460", khasra: "98", village: "Mauza Ramnagar", district: "Varanasi", areaHa: "0.510 Hectare", areaBigha: "2.01 Bigha", owner: "Dhananjay Singh", khata: "22", project: "Varanasi Ring Road Phase-2 Extension (NHAI)", due: "2026-09-21", priority: "Low", status: "Completed", distance: "~1.6 km away", note: "Verified and transmitted to revenue database on 21/09/2026." },
];

export const mismatches = [
  { id: "MIS-2026-0881", parcel: "Khasra 142/1", asn: "ASN-2026-0491", cls: "Boundary", sev: "High", date: "25/09/2026", status: "Under Review" },
  { id: "MIS-2026-0842", parcel: "Khasra 109/B", asn: "ASN-2026-0479", cls: "Unrecorded Structure", sev: "Medium", date: "24/09/2026", status: "Open" },
];

export const notifications = [
  { unread: true, icon: "assign", time: "13:45", title: "New Priority Assignment", desc: "Khasra 143 (Ramnagar, 0.620 Ha) assigned for ground verification under NHAI Ring Road package." },
  { unread: true, icon: "clarify", time: "22:10", title: "Clarification Requested by Circle Office", desc: "LAO flagged northern boundary monument marker for Khasra 109/B. Please review request." },
  { unread: false, icon: "sync", time: "23:30", title: "Offline Record Awaiting Sync", desc: "Field report for Khasra 118/2 saved locally. Please sync when mobile network is restored." },
  { unread: false, icon: "deadline", time: "11:30", title: "Upcoming Verification Deadline", desc: "Assignment ASN-2026-0491 (Khasra 142/1) due in 2 days on 28-Sep-2026." },
];

export const wizardSteps = [
  "Parcel Identity", "Ownership Verification", "Land Details", "Boundary Verification",
  "GPS Verification", "Photo Evidence", "Asset Verification", "Witness Statements", "Review & Submit",
];

export const assetOptions = [
  "Borewell / Submersible / Irrigation Well", "Pucca Concrete Structure / Building",
  "Kaccha Hut / Shed / Cattle Barn", "Erected Boundary Wall or Wire Fencing",
  "Fruit Trees / Commercial Timber Plantation", "Pond / Low-lying Waterlogged Depression",
  "Overhead High-Tension (HT) Transmission Line",
];

export const PHOTO_SLOTS = [
  "North boundary pillar", "South boundary / occupant", "Standing crop / land use", "Structure / asset close-up",
];

export const BOUNDARY_SIDES: [string, string][] = [
  ["North Boundary", "Mahendra Pratap Singh"],
  ["South Boundary", "Hari Shankar Mishra"],
  ["East Boundary", "Existing 2-Lane Highway"],
  ["West Boundary", "Kewat Community Path"],
];

export const BOUNDARY_OPTIONS = ["Matches record", "Does not match", "Partially matches", "Unable to verify"];

export const AREA_VERDICT_OPTIONS = ["Matches Record", "Appears Significantly Larger", "Appears Significantly Smaller", "Indeterminate"];

export const DEFAULT_BOUNDARIES: Record<string, string> = {
  North: "Matches record",
  South: "Matches record",
  East: "Matches record",
  West: "Matches record",
};

export const COMPLETED_VERIFICATIONS = [
  { ver: "VER-2026-UP-8820", khasra: "Khasra 98", village: "Mauza Ramnagar, Varanasi", owner: "Dhananjay Singh", date: "21/09/2026", photos: "0 Photo(s) · GPS Locked" },
  { ver: "VER-2026-UP-8841", khasra: "Khasra 118/2", village: "Mauza Mirzapur Khurd, Varanasi", owner: "Smt. Malti Devi", date: "25/09/2026", photos: "4 Photo(s) · GPS Locked" },
];

export const SYNC_QUEUE: [string, string, string, string, string][] = [
  ["Khasra 118/2", "ASN-2026-0487", "4 photos attached", "Payload: 1420 KB", "25/09/2026, 23:15:00"],
  ["Khasra 98", "ASN-2026-0460", "3 photos attached", "Payload: 980 KB", "21/09/2026, 17:00:00"],
];

export const DEVICE_DIAGNOSTICS: [string, string][] = [
  ["Device Model", "Rugged Tab FO-80 (Andr…)"],
  ["Cached Parcels", "16 Parcels"],
  ["Local Storage Used", "14.8 MB"],
  ["Pending Sync Queue", "0 Items"],
];
