/**
 * Executive (MIS & DSS / PM GatiShakti) portal — fixtures, types and static
 * configuration extracted verbatim from the original `executive.tsx` monolith.
 */

export const OFFICER = {
  name: "Shri Vinod K. Saxena",
  initials: "VS",
  title: "Shri Vinod K. Saxena, IAS",
  designation: "Special Secretary (Land Governance & PM GatiShakti)",
  role: "National Executive",
  level: "Executive / Decision Maker (Read-Only)",
  jurisdiction: "National (All States & Union Territories)",
};

export const PORTAL = {
  badge: "Executive MIS & DSS",
  sub: "PM GatiShakti & Land Acquisition Decision Support System",
};

/** Canonical route path for each simulated view of the original monolith. */
export const EXECUTIVE_PATHS = {
  dashboard: "/executive/dashboard",
  national: "/executive/national",
  states: "/executive/states",
  districts: "/executive/districts",
  corridors: "/executive/corridors",
  gis: "/executive/gis",
  program: "/executive/program",
  compensation: "/executive/compensation",
  rr: "/executive/rr",
  possession: "/executive/possession",
  timeline: "/executive/timeline",
  bottlenecks: "/executive/bottlenecks",
  comparison: "/executive/comparison",
  predictive: "/executive/predictive",
  reports: "/executive/reports",
  alerts: "/executive/alerts",
  profile: "/executive/profile",
} as const;

export type ExecutiveViewKey = keyof typeof EXECUTIVE_PATHS;

export type Scope = "National" | "State" | "District";

export const SCOPE_OPTIONS: Scope[] = ["National", "State", "District"];

export const DEFAULT_COMPARE = [
  "Delhi-Mumbai Expressway (Vadodara–Kim Section)",
  "Western Dedicated Freight Corridor (Rewari–Palanpur Track)",
  "Varanasi-Kolkata Economic Corridor (Package 6–9)",
];

export const MAX_COMPARE = 4;

export const DISTRICT_PAGE_SIZE = 25;

export const dashKpis = [
  { label: "Total Projects", value: "10", sub: "0% vs 10 prev" },
  { label: "Total Land Required", value: "15,939.7 Ha", sub: "+3.1% vs 15,460 Ha prev" },
  { label: "Area Notified (Sec 11)", value: "15,699.7 Ha", sub: "+3.9% vs 15,100 Ha prev" },
  { label: "Area Acquired (Sec 19)", value: "12,823.2 Ha", sub: "+4.2% vs 12,310 Ha prev" },
  { label: "Compensation Assessed", value: "₹22,130 Cr", sub: "+5.4% vs ₹20,450 Cr prev" },
  { label: "Compensation Paid", value: "₹17,260.5 Cr", sub: "+12.6% vs ₹15,320 Cr prev" },
  { label: "Affected Families", value: "31,020", sub: "+2.9% vs 30,100 prev" },
  { label: "Displaced Families", value: "5,810", sub: "0% vs 4,970 prev" },
  { label: "R&R Progress", value: "63.5%", sub: "+5.1% vs 72.0% prev" },
  { label: "Possession Progress", value: "80.4%", sub: "+3.8% vs 76.6% prev" },
  { label: "Delayed Projects", value: "3", sub: "-25% vs 5 prev" },
];

export const programStages = [
  { code: "S1", label: "Land Requisition", value: "15,939.7 Ha", pct: 100 },
  { code: "S2", label: "Sec 11 Notification", value: "15,699.7 Ha", pct: 98 },
  { code: "S3", label: "Sec 19 Acquisition", value: "12,823.2 Ha", pct: 80 },
  { code: "S4", label: "Sec 23/30 Compensation", value: "17,260.5 Cr", pct: 78 },
  { code: "S5", label: "Sec 38 Possession", value: "80.4%", pct: 80 },
  { code: "S6", label: "Sec 31 R&R Packages", value: "63.5%", pct: 63 },
];

export interface Corridor {
  name: string;
  code: string;
  state: string;
  district: string;
  type: string;
  ministry: string;
  health: number;
  status: "ON TRACK" | "AT RISK" | "DELAYED" | "BLOCKED";
  stage: string;
  landA: string;
  landR: string;
  compP: string;
  compA: string;
  poss: number;
}

export const corridors: Corridor[] = [
  { name: "Mumbai-Ahmedabad High Speed Rail (Surat–Navsari Stretch)", code: "NHSRCL-MAHSR-P404", state: "Gujarat", district: "Surat", type: "Railway Corridor", ministry: "Ministry of Railways", health: 96, status: "ON TRACK", stage: "Possession Handover (Sec 38)", landA: "855", landR: "868.1 Ha", compP: "₹3380", compA: "₹3410 Cr", poss: 99.4 },
  { name: "Noida International Airport (Jewar Connectivity Expressway)", code: "YEIDA-JNAR-ZNK", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", type: "Airport & Port Connectivity", ministry: "Govt. of Uttar Pradesh", health: 94, status: "ON TRACK", stage: "Possession Handover (Sec 38)", landA: "1318", landR: "1334 Ha", compP: "₹3080", compA: "₹3120 Cr", poss: 98.2 },
  { name: "Delhi-Mumbai Expressway (Vadodara–Kim Section)", code: "NHAI-DME-PKG42", state: "Gujarat", district: "Surat", type: "Expressway & Highway", ministry: "Ministry of Road Transport and Highways (MoRTH)", health: 92, status: "ON TRACK", stage: "Possession Handover (Sec 38)", landA: "1385", landR: "1420.5 Ha", compP: "₹7215.5", compA: "₹7340 Cr", poss: 97.5 },
  { name: "Namma Metro Outer Ring Road – Airport Line (Silk Board to KR Puram)", code: "BMRCL-ORR-APL", state: "Karnataka", district: "Bengaluru Urban", type: "Metro & Urban Transit", ministry: "Ministry of Housing and Urban Affairs (MoHUA)", health: 91, status: "ON TRACK", stage: "Possession Handover (Sec 38)", landA: "141.2", landR: "145 Ha", compP: "₹1845", compA: "₹1890 Cr", poss: 97.4 },
  { name: "Dholera Special Investment Region (Activation Area Node)", code: "NICDC-DSIR-PN1", state: "Gujarat", district: "Ahmedabad", type: "Industrial Corridor & Smart City", ministry: "Dept. for Promotion of Industry and Internal Trade (DPIIT)", health: 89, status: "ON TRACK", stage: "Possession Handover (Sec 38)", landA: "2118", landR: "2258 Ha", compP: "₹1870", compA: "₹1980 Cr", poss: 93.8 },
  { name: "Khavda Renewable Energy Ultra Mega Solar Park", code: "MNRE-KSP-PK01", state: "Gujarat", district: "Kutch", type: "Renewable Energy Park", ministry: "Ministry of New and Renewable Energy (MNRE)", health: 88, status: "ON TRACK", stage: "Award & Compensation (Sec 23)", landA: "4628", landR: "4888 Ha", compP: "₹820", compA: "₹880 Cr", poss: 92.1 },
  { name: "Western Dedicated Freight Corridor (Rewari–Palanpur Track)", code: "DFCCIL-WDFC-STBO7", state: "Rajasthan", district: "Jaipur", type: "Dedicated Freight Corridor", ministry: "Ministry of Railways", health: 71, status: "AT RISK", stage: "Award & Compensation (Sec 22)", landA: "792", landR: "980 Ha", compP: "₹1210", compA: "₹1650 Cr", poss: 80.8 },
  { name: "Bengaluru-Chennai Expressway (Chittoor Section)", code: "NHAI-BCE-PKG07", state: "Andhra Pradesh", district: "Chittoor", type: "Expressway & Highway", ministry: "Ministry of Road Transport and Highways (MoRTH)", health: 54, status: "DELAYED", stage: "Declaration of Acquisition (Sec 19)", landA: "680", landR: "1120 Ha", compP: "₹810", compA: "₹1450 Cr", poss: 60.7 },
  { name: "Eastern Dedicated Freight Corridor (Sonnagar–Dankuni Section)", code: "DFCCIL-EDFC-SD03", state: "West Bengal", district: "Purba Bardhaman", type: "Dedicated Freight Corridor", ministry: "Ministry of Railways", health: 49, status: "DELAYED", stage: "Declaration of Acquisition (Sec 19)", landA: "710", landR: "1380 Ha", compP: "₹1140", compA: "₹2750 Cr", poss: 51.4 },
  { name: "Varanasi-Kolkata Economic Corridor (Package 6–9)", code: "NHAI-VKC-VAR-006", state: "Bihar", district: "Kaimur", type: "Economic Corridor", ministry: "Ministry of Road Transport and Highways (MoRTH)", health: 38, status: "BLOCKED", stage: "Preliminary Notification (Sec 11)", landA: "420", landR: "1650 Ha", compP: "₹390", compA: "₹2150 Cr", poss: 25.5 },
];

/** Row shape of the state performance directory (monitored + unmonitored). */
export interface StateRow {
  s: string;
  st: string;
  proj: number;
  req: string;
  not: string;
  acq: string;
  pct: number;
  ass: string;
  paid: string;
  fam: string;
  rr: string;
  del: number;
  monitored: boolean;
  type: string;
  code: string;
}

/** Row shape of the district MIS directory (monitored + unmonitored). */
export interface DistrictRow {
  d: string;
  s: string;
  p: number;
  area: string;
  acq: number;
  comp: string;
  fam: string;
  rr: string;
  poss: string;
  adh: string;
  monitored: boolean;
}

export const stateBoard = [
  { rank: 1, state: "Uttar Pradesh", status: "ON TRACK", meta: "1 Mega Projects | 3,820 Affected Families", acq: "1,318 / 1,334 Ha", comp: "₹3,080 Cr", rr: "96%", rate: 98.2 },
  { rank: 2, state: "Karnataka", status: "ON TRACK", meta: "1 Mega Projects | 1,120 Affected Families", acq: "141.2 / 145 Ha", comp: "₹1,845 Cr", rr: "91%", rate: 97.4 },
  { rank: 3, state: "Gujarat", status: "ON TRACK", meta: "4 Mega Projects | 9,470 Affected Families", acq: "8,776 / 9,334 Ha", comp: "₹9,765.5 Cr", rr: "92.6%", rate: 94.0 },
  { rank: 4, state: "Rajasthan", status: "AT RISK", meta: "1 Mega Projects | 2,180 Affected Families", acq: "792 / 980 Ha", comp: "₹1,210 Cr", rr: "68%", rate: 80.8 },
  { rank: 5, state: "Andhra Pradesh", status: "DELAYED", meta: "1 Mega Projects | 2,890 Affected Families", acq: "680 / 1,120 Ha", comp: "₹810 Cr", rr: "42%", rate: 60.7 },
  { rank: 6, state: "West Bengal", status: "DELAYED", meta: "1 Mega Projects | 6,420 Affected Families", acq: "710 / 1,380 Ha", comp: "₹1,140 Cr", rr: "35%", rate: 51.4 },
  { rank: 7, state: "Bihar", status: "BLOCKED", meta: "1 Mega Projects | 5,120 Affected Families", acq: "420 / 1,650 Ha", comp: "₹390 Cr", rr: "21%", rate: 25.5 },
];

export const stateBenchmark = [
  { s: "Uttar Pradesh", st: "ON TRACK", proj: 1, req: "1,334", not: "1,334", acq: "1,318", pct: 98.2, ass: "₹3,120", paid: "₹3,080", fam: "3,820", rr: "96%", del: 0 },
  { s: "Karnataka", st: "ON TRACK", proj: 1, req: "145", not: "145", acq: "141.2", pct: 97.4, ass: "₹1,890", paid: "₹1,845", fam: "1,120", rr: "91%", del: 0 },
  { s: "Gujarat", st: "ON TRACK", proj: 4, req: "9,338.7", not: "9,338.7", acq: "8,770", pct: 94.0, ass: "₹9,120", paid: "₹8,785.5", fam: "9,470", rr: "93.8%", del: 0 },
  { s: "Rajasthan", st: "AT RISK", proj: 1, req: "980", not: "980", acq: "792", pct: 80.8, ass: "₹1,650", paid: "₹1,210", fam: "2,180", rr: "68%", del: 1 },
  { s: "Andhra Pradesh", st: "DELAYED", proj: 1, req: "1,120", not: "1,120", acq: "680", pct: 60.7, ass: "₹1,450", paid: "₹810", fam: "2,890", rr: "42%", del: 1 },
  { s: "West Bengal", st: "DELAYED", proj: 1, req: "1,380", not: "1,380", acq: "710", pct: 51.4, ass: "₹2,750", paid: "₹1,140", fam: "6,420", rr: "35%", del: 1 },
  { s: "Bihar", st: "BLOCKED", proj: 1, req: "1,650", not: "1,410", acq: "420", pct: 25.5, ass: "₹2,150", paid: "₹390", fam: "5,120", rr: "21%", del: 1 },
];

export const districts = [
  { d: "Surat", s: "Gujarat", p: 1, area: "855 / 868.2", acq: 99.4, comp: "₹3380 / ₹3418 Cr", fam: "4,200", rr: "98%", poss: "99.4%", adh: "ON TRACK" },
  { d: "Gautam Buddha Nagar", s: "Uttar Pradesh", p: 1, area: "1318 / 1334", acq: 98.2, comp: "₹3080 / ₹3128 Cr", fam: "3,820", rr: "96%", poss: "98.2%", adh: "ON TRACK" },
  { d: "Vadodara", s: "Gujarat", p: 1, area: "1385 / 1420.5", acq: 97.5, comp: "₹7215.5 / ₹7340 Cr", fam: "3,410", rr: "94.2%", poss: "97.5%", adh: "ON TRACK" },
  { d: "Bengaluru Urban", s: "Karnataka", p: 1, area: "141.2 / 145", acq: 97.4, comp: "₹1845 / ₹1890 Cr", fam: "1,120", rr: "91%", poss: "97.4%", adh: "ON TRACK" },
  { d: "Ahmedabad", s: "Gujarat", p: 1, area: "2118 / 2258", acq: 93.8, comp: "₹1870 / ₹1980 Cr", fam: "1,540", rr: "85.3%", poss: "93.8%", adh: "ON TRACK" },
  { d: "Kutch", s: "Gujarat", p: 1, area: "4628 / 4888", acq: 92.1, comp: "₹820 / ₹880 Cr", fam: "320", rr: "95%", poss: "92.1%", adh: "ON TRACK" },
  { d: "Jaipur", s: "Rajasthan", p: 1, area: "792 / 980", acq: 80.8, comp: "₹1210 / ₹1650 Cr", fam: "2,180", rr: "68%", poss: "80.8%", adh: "AT RISK" },
  { d: "Chittoor", s: "Andhra Pradesh", p: 1, area: "680 / 1120", acq: 60.7, comp: "₹810 / ₹1450 Cr", fam: "2,890", rr: "42%", poss: "60.7%", adh: "DELAYED" },
  { d: "Purba Bardhaman", s: "West Bengal", p: 1, area: "710 / 1380", acq: 51.4, comp: "₹1140 / ₹2750 Cr", fam: "6,420", rr: "35%", poss: "51.4%", adh: "DELAYED" },
  { d: "Kaimur", s: "Bihar", p: 1, area: "420 / 1650", acq: 25.5, comp: "₹390 / ₹2150 Cr", fam: "5,120", rr: "21%", poss: "25.5%", adh: "BLOCKED" },
];

export const funnel = [
  { label: "1. Total Required Corridor Footprint", v: "15939.7 Ha (100%)" },
  { label: "2. Section 11 Preliminary Notification", v: "15699.7 Ha (98.5%)" },
  { label: "3. Section 19 Declaration of Acquisition", v: "12823.2 Ha (81.0%)" },
  { label: "4. Section 38 Physical Possession Transferred", v: "80.4% Handover" },
];

export const compMonths = [
  ["Oct 2025", "₹940 / ₹1100 Cr"],
  ["Nov 2025", "₹1100 / ₹1450 Cr"],
  ["Dec 2025", "₹1250 / ₹1310 Cr"],
  ["Jan 2026", "₹1350 / ₹1550 Cr"],
  ["Feb 2026", "₹1490 / ₹1690 Cr"],
  ["Mar 2026", "₹1300 / ₹1610 Cr"],
  ["Apr 2026", "₹1520 / ₹1680 Cr"],
  ["May 2026", "₹1410 / ₹1580 Cr"],
  ["Jun 2026", "₹1350 / ₹1570 Cr"],
  ["Jul 2026", "₹1680 / ₹1810 Cr"],
  ["Aug 2026", "₹1790 / ₹2010 Cr"],
  ["Sep 2026", "₹1520 / ₹1810 Cr"],
];

export const compStates: Array<[string, string, string, string, string]> = [
  ["Gujarat", "₹9,120 Cr", "₹8,785.5 Cr", "₹334.5 Cr", "96.3%"],
  ["Uttar Pradesh", "₹3,120 Cr", "₹3,080 Cr", "₹40 Cr", "98.7%"],
  ["Karnataka", "₹1,890 Cr", "₹1,845 Cr", "₹45 Cr", "97.6%"],
  ["Rajasthan", "₹1,650 Cr", "₹1,210 Cr", "₹440 Cr", "73.3%"],
  ["Andhra Pradesh", "₹1,450 Cr", "₹810 Cr", "₹640 Cr", "55.9%"],
  ["West Bengal", "₹2,750 Cr", "₹1,140 Cr", "₹1,610 Cr", "41.5%"],
  ["Bihar", "₹2,150 Cr", "₹390 Cr", "₹1,760 Cr", "18.1%"],
];

export const compCorridors: Array<[string, string, string, string]> = [
  ["Delhi-Mumbai Expressway (Vadodara–Kim)", "₹2840 Cr", "₹2715.5 Cr", "95.6%"],
  ["Western DFC (Rewari–Palanpur)", "₹1650 Cr", "₹1210 Cr", "73.3%"],
  ["Mumbai-Ahmedabad HSR (Surat–Navsari)", "₹3410 Cr", "₹3380 Cr", "99.1%"],
  ["Dholera SIR (Activation Area)", "₹1980 Cr", "₹1870 Cr", "94.4%"],
  ["Bengaluru-Chennai Expressway (Chittoor)", "₹1450 Cr", "₹810 Cr", "55.9%"],
  ["Jewar Airport Connectivity Expressway", "₹3120 Cr", "₹3080 Cr", "98.7%"],
  ["Khavda Renewable Energy Park", "₹880 Cr", "₹820 Cr", "93.2%"],
  ["Varanasi-Kolkata Corridor (Pkg 6–9)", "₹2150 Cr", "₹390 Cr", "18.1%"],
  ["Eastern DFC (Sonnagar–Dankuni)", "₹2750 Cr", "₹1140 Cr", "41.5%"],
  ["Namma Metro ORR–Airport Line", "₹1890 Cr", "₹1845 Cr", "97.6%"],
];

export const rrRows: Array<[string, string, string, string, string]> = [
  ["Delhi-Mumbai Expressway", "ON TRACK", "620", "584", "94.2%"],
  ["Western DFC", "AT RISK", "350", "278", "68%"],
  ["Mumbai-Ahmedabad HSR", "ON TRACK", "940", "921", "98%"],
  ["Dholera SIR", "ON TRACK", "180", "159", "88.5%"],
  ["Bengaluru-Chennai Expressway", "DELAYED", "310", "222", "42%"],
  ["Jewar Airport Connectivity", "ON TRACK", "890", "854", "96%"],
  ["Varanasi-Kolkata Corridor", "BLOCKED", "240", "176", "21%"],
  ["Eastern DFC", "DELAYED", "520", "392", "35%"],
  ["Namma Metro ORR–Airport Line", "ON TRACK", "280", "255", "91%"],
];

export const possDistricts: Array<[string, string, string, string, string, string, string]> = [
  ["Surat", "Gujarat", "1,420", "1,412", "8", "0", "99.4%"],
  ["Gautam Buddha Nagar", "Uttar Pradesh", "1,890", "1,856", "34", "0", "98.2%"],
  ["Vadodara", "Gujarat", "2,150", "2,096", "54", "4 stayed", "97.5%"],
  ["Bengaluru Urban", "Karnataka", "420", "409", "11", "0", "97.4%"],
  ["Ahmedabad", "Gujarat", "1,050", "1,735", "115", "12 stayed", "93.8%"],
  ["Kutch", "Gujarat", "820", "755", "65", "0", "92.1%"],
  ["Jaipur", "Rajasthan", "1,450", "1,172", "278", "24 stayed", "80.8%"],
  ["Chittoor", "Andhra Pradesh", "1,680", "1,020", "660", "78 stayed", "60.7%"],
  ["Purba Bardhaman", "West Bengal", "1,820", "935", "885", "114 stayed", "51.4%"],
  ["Kaimur", "Bihar", "1,550", "344", "1096", "140 stayed", "25.5%"],
];

export const milestones: Array<[string, string, string, string, string, string, string, string]> = [
  ["Varanasi-Kolkata Econo…", "Sec 11 Preliminary Notification Gazette publication", "RFCTLARR Act 2023 Sec 11(1)", "2023-09-30", "2024-04-15", "2026-09-26", "+139 Days", "DELAYED"],
  ["Varanasi-Kolkata Econo…", "Sec 19 Declaration of Acquisition", "RFCTLARR Act 2023 Sec 19(1)", "2024-09-30", "2027-01-31", "2026-09-26", "+210 Days", "DELAYED"],
  ["Bengaluru-Chennai Expr…", "Sec 23 Award by Land Acquisition Officer", "RFCTLARR Act 2023 Sec 23", "2024-03-31", "2025-02-15", "2026-09-26", "+140 Days", "DELAYED"],
  ["Eastern Dedicated Freig…", "Sec 38 Taking Possession of Land", "RFCTLARR Act 2023 Sec 38", "2025-06-30", "2026-12-15", "2026-09-26", "+165 Days", "DELAYED"],
  ["Western Dedicated Freig…", "Sec 31 Rehabilitation & Resettlement Award", "RFCTLARR Act 2023 Sec 31", "2026-01-15", "2026-03-01", "2026-09-26", "+45 Days", "AT RISK"],
  ["Mumbai-Ahmedabad Hig…", "100% Possession Handover to Civil Contractor", "RFCTLARR Act 2023 Sec 38", "2026-06-30", "2026-06-25", "2026-09-26", "0 Days", "COMPLETED"],
  ["Noida International Airp…", "Possession Certificate under Sec 38", "RFCTLARR Act 2023 Sec 38", "2026-05-31", "2026-05-28", "2026-09-26", "0 Days", "COMPLETED"],
  ["Delhi-Mumbai Expressw…", "Final Commercial Operations Date (COD)", "NHAI Concession Agreement Cl. 14", "2026-12-31", "2026-12-31", "2026-09-26", "0 Days", "ON TRACK"],
];

export const backlogCards = [
  { t: "Objection backlog", imp: "3 Projects Impacted", n: "482", sub: "pending cases", area: "418.5 Ha", age: "142 days", trend: "Increasing", bracket: "> 90 Days", cause: "Sec 15 hearing adjournments due to multi-claimant title disputes and inherited co-parcenary claims.", sev: "CRITICAL" },
  { t: "Possession backlog", imp: "3 Projects Impacted", n: "372", sub: "pending cases", area: "512 Ha", age: "188 days", trend: "Stable", bracket: "> 90 Days", cause: "High Court status-quo stays and unevacuated standing crop compensation claims.", sev: "CRITICAL" },
  { t: "Compensation backlog", imp: "4 Projects Impacted", n: "1,240", sub: "pending cases", area: "685.2 Ha", age: "95 days", trend: "Decreasing", bracket: "> 90 Days", cause: "PFMS/Treasury mandate rejection due to mismatched name spellings across Aadhaar vs Khatiyan.", sev: "HIGH" },
  { t: "Approval backlog", imp: "2 Projects Impacted", n: "64", sub: "pending cases", area: "188 Ha", age: "78 days", trend: "Stable", bracket: "< 90 Days", cause: "Inter-ministerial Section 20 Forest Clearance (Stage-2) and Railway Overbridge approval clearances.", sev: "HIGH" },
  { t: "R&R backlog", imp: "3 Projects Impacted", n: "1,074", sub: "pending cases", area: "340 Ha", age: "132 days", trend: "Increasing", bracket: "> 90 Days", cause: "Resettlement colony layout municipal drainage sanction delayed by local development authority.", sev: "HIGH" },
  { t: "Field verification backlog", imp: "2 Projects Impacted", n: "215", sub: "pending cases", area: "112.4 Ha", age: "46 days", trend: "Decreasing", bracket: "< 90 Days", cause: "Joint Measurement Survey (JMS) rover GPS crew shortage in monsoon inundation zones.", sev: "MEDIUM" },
  { t: "Validation backlog", imp: "2 Projects Impacted", n: "88", sub: "pending cases", area: "84 Ha", age: "31 days", trend: "Decreasing", bracket: "< 90 Days", cause: "Revenue inspector RoR (Record of Rights) digitisation discrepancies in legacy Urdu/Devanagari jamabandi records.", sev: "MEDIUM" },
];

export const forecasts = [
  { id: "PRED-ML-VKC-2026-09", title: "Varanasi-Kolkata Economic Corridor (Pkg 6–9)", risk: "HIGH RISK (92% PROB)", delay: "+245 Days Projected Delay", model: "ZameenAI GatiShakti Corridor Predictor v1.4", gen: "26 Sep 2026, 00:00 AM", jur: "Bihar", factors: ["High density of un-disposed Section 15 objections (482 cases) in Kaimur district", "Pending Section 19 declaration re-notification clock running since June 2026", "Revenue officer staff vacancy at 41% in Sasaram subdivision", "Monsoonal JMS delays compounded by waterlogging in Son basin"], esc: "Convene Special State High-Powered Land Committee under Bihar Chief Secretary to sanction fast-track arbitration camps." },
  { id: "PRED-ML-EDFC-2026-08", title: "Eastern Dedicated Freight Corridor (Sonnagar–Dankuni Section)", risk: "HIGH RISK (86% PROB)", delay: "+180 Days Projected Delay", model: "ZameenAI GatiShakti Corridor Predictor v1.4", gen: "26 Sep 2026, 00:00 AM", jur: "West Bengal", factors: ["Concentration of 114 High Court status-quo interim orders in Purba Bardhaman", "Gram Sabha resolution impasse in 3 resettlement villages regarding community hall entitlements", "Compensation disbursement velocity at only ₹18 Cr/month against required ₹65 Cr/month"], esc: "Engage Advocate General for clubbed hearing before High Court of Calcutta Division Bench for vacating interim stays." },
  { id: "PRED-ML-BCE-2026-07", title: "Bengaluru-Chennai Expressway (Chittoor Section)", risk: "MEDIUM RISK (68% PROB)", delay: "+85 Days Projected Delay", model: "ZameenAI Spatial Encroachment & Risk Model v2.1", gen: "26 Sep 2026, 00:00 AM", jur: "Andhra Pradesh", factors: ["Market value revision revision petitions filed before Land Acquisition, Rehabilitation & Resettlement Authority (LARRA)", "Underground optical fiber and gas pipeline utility diversion clearances pending"], esc: "Sanction one-time consent award premium differential under Section 23A to expedite negotiated settlement." },
  { id: "PRED-ML-WDFC-2026-06", title: "Western Dedicated Freight Corridor (Rewari–Palanpur Track)", risk: "MEDIUM RISK (54% PROB)", delay: "+65 Days Projected Delay", model: "ZameenAI Spatial Encroachment & Risk Model v2.1", gen: "26 Sep 2026, 00:00 AM", jur: "Rajasthan", factors: ["Minor gap of 24 stayed khasras near Phulera junction requiring bypass alignment tweak", "Gram Sabha R&R package signing pending in 2 revenue villages"], esc: "District Collector Jaipur to organize weekend Lok Adalat camp for immediate compensation release." },
];

export const reports = [
  { t: "National Infrastructure Land Acquisition Performance Dossier", f: "PDF", d: "Comprehensive high-level digest covering all 10 monitored corridors, land notified, acquired, compensation burn rate, and critical path delays.", c: "Project Progress", fr: "Weekly", u: "26 Sep 2026, 06:00 AM" },
  { t: "RFCTLARR Section-wise Statutory Compliance & Award Status", f: "PDF", d: "Statutory milestone audit comparing Gazette notifications under Sec 11, declarations under Sec 19, and award passing under Sec 23.", c: "Land Acquisition", fr: "Monthly", u: "25 Sep 2026, 08:30 PM" },
  { t: "Compensation Disbursement & Treasury Reconciliation Statement", f: "XLSX", d: "Aggregated financial statement of assessed versus disbursed compensation, pending treasury mandates, and interest liabilities.", c: "Compensation", fr: "Daily", u: "26 Sep 2026, 09:00 AM" },
  { t: "Resettlement & Rehabilitation (R&R) Family Entitlements Register", f: "PDF", d: "Aggregated progress tracking on R&R packages, colony allotment, transitional allowances, and livelihood grants without citizen PII.", c: "R&R", fr: "Monthly", u: "24 Sep 2026, 04:00 PM" },
  { t: "Possession Handover & Stalled Corridor Exception Ledger", f: "CSV", d: "Detailing parcel-level bottlenecks, judicial stay orders, police assistance requirements, and physical possession certificates under Sec 38.", c: "Possession", fr: "Weekly", u: "26 Sep 2026, 10:15 AM" },
  { t: "PM GatiShakti Multi-Modal Timeline Adherence & Slippage Forecast", f: "PDF", d: "Predictive timeline deviation model with planned versus actual completion forecasts and critical path impacts.", c: "Timeline", fr: "Weekly", u: "26 Sep 2026, 06:00 AM" },
  { t: "Geographic State & District Disaggregated Benchmark Summary", f: "XLSX", d: "Cross-state comparison matrix ranking land acquisition velocity, acquisition cost per hectare, and dispute resolution turnaround.", c: "Geographic Summary", fr: "Monthly", u: "25 Sep 2026, 11:00 AM" },
];

export const alerts = [
  { sev: "CRITICAL", t: "Critical Delay: Varanasi-Kolkata Corridor Section 19 Clock At Risk", d: "Acquisition in Kaimur district is delayed by 210 days. 482 objections under Sec 15 remain unresolved, risk of statutory limitation expiry.", meta: "Corridor: Varanasi-Kolkata Economic Corridor · State: Bihar · Impact: 1,410 Ha notified land pending declaration · Logged: 26 Sep 2026, 10:30 AM" },
  { sev: "CRITICAL", t: "Judicial Stay Concentration in Eastern DFC Corridor", d: "High Court status-quo orders now affect 114 contiguous khasras in Memari taluka, stalling civil contractor mobilization.", meta: "Corridor: Eastern Dedicated Freight Corridor · State: West Bengal · Impact: 670 Ha corridor blocked from physical possession · Logged: 26 Sep 2026, 09:45 AM" },
  { sev: "WARNING", t: "Compensation Disbursement Backlog Alert", d: "Compensation payment progress stands at only 55.9% (₹640 Cr pending disbursement) due to LARRA reference petitions.", meta: "Corridor: Bengaluru-Chennai Expressway · State: Andhra Pradesh · Impact: 1,178 families pending final award settlement · Logged: 25 Sep 2026, 04:15 PM" },
  { sev: "INFO", t: "Milestone Achievement: High Speed Rail Surat Handover Complete", d: "100% physical possession of 855 Ha successfully achieved and certified under Section 38 without pending litigation.", meta: "Corridor: Mumbai-Ahmedabad High Speed Rail · State: Gujarat · Impact: 100% handover complete · Logged: 25 Sep 2026, 11:20 AM" },
  { sev: "WARNING", t: "Predictive Timeline Deviation: Western DFC Palanpur Link", d: "ZameenAI predictive model flagged a 45-day delay risk during Gram Sabha R&R consultations.", meta: "Corridor: Western Dedicated Freight Corridor · State: Rajasthan · Impact: Predicted 45 days slippage on R&R award · Logged: 24 Sep 2026, 05:40 PM" },
];

/** In-page (non-routed) tab strips that must stay local state. */
export const PROGRAM_TABS = ["Acquisition & Land Trends", "Compensation Burn Rates", "R&R & Family Entitlements", "Possession Handover Velocity", "Geographic State Distribution"];

export const REPORT_TABS = ["All MIS Reports", "Project Progress", "Land Acquisition", "Compensation", "R&R", "Possession", "Timeline", "Geographic Summary"];

export const DASHBOARD_BOTTLENECK_SUMMARY: Array<[string, string, string]> = [
  ["Objection backlog", "Sec 15 hearing adjournments due to multi-claimant title disputes. Count: 482 · Area: 418.5 Ha · Avg: 142 days", "CRITICAL"],
  ["Possession backlog", "High Court status-quo stays and unevacuated standing crop claims. Count: 372 · Area: 512 Ha · Avg: 188 days", "CRITICAL"],
  ["Compensation backlog", "PFMS mandate rejections on Aadhaar vs Khatiyan name mismatch. Count: 1,240 · Area: 685.2 Ha · Avg: 95 days", "HIGH"],
];

export const DASHBOARD_PREDICTIVE_SUMMARY: Array<[string, string, string]> = [
  ["Varanasi-Kolkata Economic Corridor (Pkg 6–9)", "+245 Days Slippage · Prob: 92%", "Convene Special State High-Powered Land Committee under Bihar Chief Secretary."],
  ["Eastern Dedicated Freight Corridor (Sonnagar–Dankuni)", "+180 Days Slippage · Prob: 86%", "Engage Advocate General for clubbed hearing before Calcutta Division Bench."],
  ["Bengaluru-Chennai Expressway (Chittoor)", "+85 Days Slippage · Prob: 68%", "Sanction one-time consent award premium differential under Section 23A."],
];

export const NATIONAL_KPIS: Array<[string, string, string]> = [
  ["Total Land Under Acquisition", "15,939.7 Hectares", "+3.1% vs 15,460 Ha prev"],
  ["Pan-India Acquisition Rate", "80% Overall", "+4.5% vs 77.6% prev"],
  ["National Compensation Disbursed", "₹17,260.5 Cr", "+12.6% vs ₹15,320 Cr prev"],
  ["Statutory R&R Settlement Rate", "63.5% Settled", "+5.0% vs 72.0% prev"],
];

export const COMPENSATION_KPIS: Array<[string, string, string]> = [
  ["Total Compensation Assessed", "₹22,180 Cr", "+5.0% vs ₹20,450 Cr prev"],
  ["Total Disbursed (PFMS/Treasury)", "₹17,260.5 Cr", "+12.6% vs ₹15,320 Cr prev"],
  ["Total Pending Treasury Mandates", "₹4,919.5 Cr", "Awaiting LAO verification"],
  ["Overall Disbursement Progress", "77.8% Paid", "+3.9% vs 74.9% prev"],
];

export const PROGRAM_CORRIDOR_PROGRESS: Array<[string, string, number, string]> = [
  ["Delhi-Mumbai Expressway (Vadodara–Kim Section)", "1385 / 1420.5 Ha (99%)", 99, "bg-emerald-500"],
  ["Western Dedicated Freight Corridor (Rewari–Palanpur…)", "792 / 980 Ha (81%)", 81, "bg-amber-500"],
  ["Mumbai-Ahmedabad High Speed Rail (Surat–Navsari…)", "855 / 868.1 Ha (99%)", 99, "bg-emerald-500"],
  ["Dholera Special Investment Region (Activation Area N…)", "2118 / 2258 Ha (94%)", 94, "bg-emerald-500"],
  ["Bengaluru-Chennai Expressway (Chittoor Section)", "680 / 1120 Ha (61%)", 61, "bg-red-500"],
  ["Noida International Airport (Jewar Connectivity Expre…)", "1318 / 1334 Ha (98%)", 98, "bg-emerald-500"],
];

export const RR_KPIS: Array<[string, string, string]> = [
  ["Total Affected Families", "31,710", "+2.9% vs 30,800 prev"],
  ["Total Displaced Families", "4,970", "0% vs 4,970 prev"],
  ["R&R Packages Disbursed", "3,896 of 4,970", "+32.9% vs 4,450 prev"],
  ["R&R Sanctioned Outlay", "₹982 Cr (of ₹1245.6 Cr)", "Transitional & livelihood grants"],
];

export const RR_COLONY_STATS: Array<[string, string, string]> = [
  ["Colonies Planned", "24 Sites", "Approved in Section 31 Scheme"],
  ["Colonies Handed Over", "19 Sites", "Occupancy certificates issued"],
  ["Families Resettled", "3,896", "House plots & pucca houses allocated"],
  ["Families Pending Resettlement", "1,074", "Temporary rental allowance disbursed"],
];

export const POSSESSION_KPIS: Array<[string, string, string]> = [
  ["Possession Completed", "11,142", "12,500 Ha · 81.8%"],
  ["Approved by LAO", "12,026", "Awaiting physical panchnama"],
  ["Pending Handover", "2,824", "No standing crop vacation"],
  ["Possession Blocked", "512", "Acquisition / clearance deficit"],
  ["Court Stay / Contested", "372", "Judicial status quo orders"],
];

export const DOSSIER_FIGURES: Array<[string, string, string]> = [
  ["Total Projects Covered:", "10", ""],
  ["Required Footprint:", "15939.7 Ha", ""],
  ["Physically Acquired:", "12823.2 Ha (80.4%)", "text-emerald-700"],
  ["Compensation Disbursed:", "₹17260.5 Cr", "text-emerald-700"],
  ["Affected Families:", "31,020", ""],
  ["Delayed Corridors:", "3 Projects", "text-red-600"],
];

export const ACCESS_PROFILE: Array<[string, string, string]> = [
  ["Official Role", "Executive / Decision Maker (Read-Only)", ""],
  ["Access Scope", "National (All Jurisdictions)", "text-amber-600"],
  ["Assigned Ministry / Department", "Department of Land Resources & PM GatiShakti Cell", ""],
  ["Jurisdictional Coverage", "National (All States & Union Territories)", ""],
  ["Last Active Session", "26 Sep 2026, 09:15 AM", "font-mono"],
  ["Statutory Mandate", "RFCTLARR Act 2013 & PM GatiShakti NMP", "text-emerald-700"],
];

export const PROHIBITED_CAPABILITIES = [
  "Create or edit acquisition proposals",
  "OCR document corrections",
  "Field verification & GPS boundary recording",
  "Section 23 award approvals & rejections",
  "Direct citizen land record edits",
  "GIS cadastral geometry alterations",
];

export const ENABLED_CAPABILITIES = [
  "Pan-India corridor health monitoring",
  "Disbursement velocity & treasury reconciliation",
  "Spatial GIS cadastral overlay inspection",
  "Section 18 bottleneck exception analysis",
  "Machine learning predictive slippage forecasts",
  "Cabinet briefing dossier generation & export",
];

/** Cadastral SVG overlay geometry for the GIS screen. */
export const CADASTRAL_PARCELS: Array<[number, number, number, number, string, string]> = [
  [110, 45, 70, 55, "#34d399", "142/1"],
  [180, 40, 60, 50, "#a7f3d0", "142/2"],
  [240, 38, 55, 48, "#60a5fa", "143"],
  [295, 40, 55, 52, "#60a5fa", "143/ broad"],
  [350, 48, 60, 56, "#f87171", "144/8"],
  [410, 58, 62, 58, "#34d399", "145"],
  [150, 100, 60, 55, "#f59e0b", "281"],
  [210, 105, 62, 58, "#f97316", "282"],
  [272, 108, 58, 55, "#60a5fa", "283/1"],
  [330, 112, 58, 55, "#f87171", "305"],
  [388, 118, 60, 58, "#f97316", "306"],
];

export const CADASTRAL_LEGEND: Array<[string, string]> = [
  ["Acquired", "#34d399"],
  ["Notified", "#60a5fa"],
  ["Pending", "#f59e0b"],
  ["Contested", "#f97316"],
  ["Stayed", "#f87171"],
  ["Alignment", "#fbbf24"],
];

export const PARCEL_INSPECTOR_FIELDS: Array<[string, string]> = [
  ["Project", "Delhi-Mumbai Expressway"],
  ["Parcel Area", "4.8 Hectares"],
  ["Acquisition Status", "Acquired"],
  ["Physical Possession", "Completed"],
  ["Compensation", "₹96 Lakh"],
  ["Disbursal State", "Disbursed to Beneficiary"],
  ["Objection / Court", "None"],
];
