/**
 * Executive DSS reference lists for Global MIS filters.
 * Infrastructure types, Ministries/Agencies, statutory stages and health statuses.
 */

/** All infrastructure types tracked on the national corridor registry. */
export const INFRA_TYPES: string[] = [
  "Expressway & Highway",
  "Dedicated Freight Corridor",
  "Railway Corridor",
  "Metro & Urban Transit",
  "Airport & Port Connectivity",
  "Industrial Corridor & Smart City",
  "Renewable Energy Park",
  "Economic Corridor",
  "Irrigation & River-Link Canal",
  "Inland Waterways",
  "Power Transmission",
  "Urban Development / Housing",
];

/** All Ministries / Departments / Implementing Agencies on the registry. */
export const MINISTRIES: string[] = [
  "Ministry of Road Transport and Highways (MoRTH)",
  "Ministry of Railways",
  "Ministry of Housing and Urban Affairs (MoHUA)",
  "Ministry of Civil Aviation (MoCA)",
  "Ministry of Power",
  "Ministry of New and Renewable Energy (MNRE)",
  "Dept. for Promotion of Industry and Internal Trade (DPIIT)",
  "Department of Land Resources (DoLR)",
  "National Highways Authority of India (NHAI)",
  "National High Speed Rail Corporation (NHSRCL)",
  "Dedicated Freight Corridor Corporation (DFCCIL)",
  "Yamuna Expressway Industrial Development Authority (YEIDA)",
  "UP Expressways Industrial Development Authority (UPEIDA)",
  "Bangalore Metro Rail Corporation (BMRCL)",
  "National Capital Region Transport Corporation (NCRTC)",
  "National Industrial Corridor Development Corporation (NICDC)",
  "Govt. of Uttar Pradesh",
  "Govt. of Gujarat",
];

export interface StatutoryStage {
  label: string;
  /** substring matched against the corridor's current statutory stage */
  match: string;
}

/** All RFCTLARR / NH Act / Railways Act statutory stages. */
export const RFCTLARR_STAGES: StatutoryStage[] = [
  { label: "Sec 11 – Preliminary Notification (RFCTLARR)", match: "Sec 11" },
  { label: "Sec 12 – JMS Survey & SIA (RFCTLARR)", match: "Sec 12" },
  { label: "Sec 15 – Objection Hearing & Disposal (RFCTLARR)", match: "Sec 15" },
  { label: "Sec 19 – Declaration of Acquisition (RFCTLARR)", match: "Sec 19" },
  { label: "Sec 21 – Notice to Interested Persons (RFCTLARR)", match: "Sec 21" },
  { label: "Sec 22/23 – Enquiry & Award (RFCTLARR)", match: "Sec 23" },
  { label: "Sec 31 – R&R Award (RFCTLARR)", match: "Sec 31" },
  { label: "Sec 38 – Possession Handover (RFCTLARR)", match: "Sec 38" },
  { label: "Sec 3A – Intention (NH Act 1956)", match: "3A" },
  { label: "Sec 3C – Objection Hearing (NH Act 1956)", match: "3C" },
  { label: "Sec 3D – Vesting Declaration (NH Act 1956)", match: "3D" },
  { label: "Sec 3G – Compensation Award (NH Act 1956)", match: "3G" },
  { label: "Sec 20A/20E – Notification & Declaration (Railways Act)", match: "20E" },
];

/** All corridor health / timeline statuses. */
export const HEALTH_STATUSES: string[] = ["ON TRACK", "AT RISK", "DELAYED", "BLOCKED"];

/** All case-level workflow statuses used across dockets. */
export const CASE_STATUSES: string[] = [
  "Awaiting Approval",
  "Under Review",
  "Possession Pending",
  "Contested",
  "Stayed",
  "Approved",
  "No Active Corridor",
];
