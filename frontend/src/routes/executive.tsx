import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Globe,
  Flag,
  MapPin,
  FolderKanban,
  Map as MapIcon,
  TrendingUp,
  IndianRupee,
  Users,
  KeyRound,
  CalendarClock,
  TriangleAlert,
  FileBarChart,
  Bell,
  User,
  Search,
  ChevronDown,
  Download,
  Printer,
  Eye,
  ShieldCheck,
  Lock,
  ArrowRight,
  Gavel,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import PortalLayout, {
  PortalCard,
  GreetingHeader,
} from "../components/portal/PortalLayout";
import { INDIA_STATES, INDIA_DISTRICTS, ALL_DISTRICTS } from "../utils/indiaGeo";
import {
  INFRA_TYPES,
  MINISTRIES,
  RFCTLARR_STAGES,
  HEALTH_STATUSES,
} from "../utils/executiveRefs";

export const Route = createFileRoute("/executive")({
  component: ExecutivePortal,
});

type ViewKey =
  | "dashboard" | "national" | "states" | "districts" | "corridors" | "gis"
  | "program" | "compensation" | "rr" | "possession" | "timeline"
  | "bottlenecks" | "comparison" | "predictive" | "reports" | "alerts" | "profile";

type Scope = "National" | "State" | "District";

const OFFICER = {
  name: "Shri Vinod K. Saxena",
  initials: "VS",
  title: "Shri Vinod K. Saxena, IAS",
  designation: "Special Secretary (Land Governance & PM GatiShakti)",
  role: "National Executive",
  level: "Executive / Decision Maker (Read-Only)",
  jurisdiction: "National (All States & Union Territories)",
};

/* ================= DATA ================= */

const dashKpis = [
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

const programStages = [
  { code: "S1", label: "Land Requisition", value: "15,939.7 Ha", pct: 100 },
  { code: "S2", label: "Sec 11 Notification", value: "15,699.7 Ha", pct: 98 },
  { code: "S3", label: "Sec 19 Acquisition", value: "12,823.2 Ha", pct: 80 },
  { code: "S4", label: "Sec 23/30 Compensation", value: "17,260.5 Cr", pct: 78 },
  { code: "S5", label: "Sec 38 Possession", value: "80.4%", pct: 80 },
  { code: "S6", label: "Sec 31 R&R Packages", value: "63.5%", pct: 63 },
];

interface Corridor {
  name: string; code: string; state: string; district: string; type: string;
  ministry: string;
  health: number; status: "ON TRACK" | "AT RISK" | "DELAYED" | "BLOCKED";
  stage: string; landA: string; landR: string; compP: string; compA: string; poss: number;
}

const corridors: Corridor[] = [
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

const stateBoard = [
  { rank: 1, state: "Uttar Pradesh", status: "ON TRACK", meta: "1 Mega Projects | 3,820 Affected Families", acq: "1,318 / 1,334 Ha", comp: "₹3,080 Cr", rr: "96%", rate: 98.2 },
  { rank: 2, state: "Karnataka", status: "ON TRACK", meta: "1 Mega Projects | 1,120 Affected Families", acq: "141.2 / 145 Ha", comp: "₹1,845 Cr", rr: "91%", rate: 97.4 },
  { rank: 3, state: "Gujarat", status: "ON TRACK", meta: "4 Mega Projects | 9,470 Affected Families", acq: "8,776 / 9,334 Ha", comp: "₹9,765.5 Cr", rr: "92.6%", rate: 94.0 },
  { rank: 4, state: "Rajasthan", status: "AT RISK", meta: "1 Mega Projects | 2,180 Affected Families", acq: "792 / 980 Ha", comp: "₹1,210 Cr", rr: "68%", rate: 80.8 },
  { rank: 5, state: "Andhra Pradesh", status: "DELAYED", meta: "1 Mega Projects | 2,890 Affected Families", acq: "680 / 1,120 Ha", comp: "₹810 Cr", rr: "42%", rate: 60.7 },
  { rank: 6, state: "West Bengal", status: "DELAYED", meta: "1 Mega Projects | 6,420 Affected Families", acq: "710 / 1,380 Ha", comp: "₹1,140 Cr", rr: "35%", rate: 51.4 },
  { rank: 7, state: "Bihar", status: "BLOCKED", meta: "1 Mega Projects | 5,120 Affected Families", acq: "420 / 1,650 Ha", comp: "₹390 Cr", rr: "21%", rate: 25.5 },
];

const stateBenchmark = [
  { s: "Uttar Pradesh", st: "ON TRACK", proj: 1, req: "1,334", not: "1,334", acq: "1,318", pct: 98.2, ass: "₹3,120", paid: "₹3,080", fam: "3,820", rr: "96%", del: 0 },
  { s: "Karnataka", st: "ON TRACK", proj: 1, req: "145", not: "145", acq: "141.2", pct: 97.4, ass: "₹1,890", paid: "₹1,845", fam: "1,120", rr: "91%", del: 0 },
  { s: "Gujarat", st: "ON TRACK", proj: 4, req: "9,338.7", not: "9,338.7", acq: "8,770", pct: 94.0, ass: "₹9,120", paid: "₹8,785.5", fam: "9,470", rr: "93.8%", del: 0 },
  { s: "Rajasthan", st: "AT RISK", proj: 1, req: "980", not: "980", acq: "792", pct: 80.8, ass: "₹1,650", paid: "₹1,210", fam: "2,180", rr: "68%", del: 1 },
  { s: "Andhra Pradesh", st: "DELAYED", proj: 1, req: "1,120", not: "1,120", acq: "680", pct: 60.7, ass: "₹1,450", paid: "₹810", fam: "2,890", rr: "42%", del: 1 },
  { s: "West Bengal", st: "DELAYED", proj: 1, req: "1,380", not: "1,380", acq: "710", pct: 51.4, ass: "₹2,750", paid: "₹1,140", fam: "6,420", rr: "35%", del: 1 },
  { s: "Bihar", st: "BLOCKED", proj: 1, req: "1,650", not: "1,410", acq: "420", pct: 25.5, ass: "₹2,150", paid: "₹390", fam: "5,120", rr: "21%", del: 1 },
];

const districts = [
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

const funnel = [
  { label: "1. Total Required Corridor Footprint", v: "15939.7 Ha (100%)" },
  { label: "2. Section 11 Preliminary Notification", v: "15699.7 Ha (98.5%)" },
  { label: "3. Section 19 Declaration of Acquisition", v: "12823.2 Ha (81.0%)" },
  { label: "4. Section 38 Physical Possession Transferred", v: "80.4% Handover" },
];

const compMonths = [
  ["Oct 2025", "₹940 / ₹1100 Cr"], ["Nov 2025", "₹1100 / ₹1450 Cr"], ["Dec 2025", "₹1250 / ₹1310 Cr"],
  ["Jan 2026", "₹1350 / ₹1550 Cr"], ["Feb 2026", "₹1490 / ₹1690 Cr"], ["Mar 2026", "₹1300 / ₹1610 Cr"],
  ["Apr 2026", "₹1520 / ₹1680 Cr"], ["May 2026", "₹1410 / ₹1580 Cr"], ["Jun 2026", "₹1350 / ₹1570 Cr"],
  ["Jul 2026", "₹1680 / ₹1810 Cr"], ["Aug 2026", "₹1790 / ₹2010 Cr"], ["Sep 2026", "₹1520 / ₹1810 Cr"],
];

const compStates = [
  ["Gujarat", "₹9,120 Cr", "₹8,785.5 Cr", "₹334.5 Cr", "96.3%"],
  ["Uttar Pradesh", "₹3,120 Cr", "₹3,080 Cr", "₹40 Cr", "98.7%"],
  ["Karnataka", "₹1,890 Cr", "₹1,845 Cr", "₹45 Cr", "97.6%"],
  ["Rajasthan", "₹1,650 Cr", "₹1,210 Cr", "₹440 Cr", "73.3%"],
  ["Andhra Pradesh", "₹1,450 Cr", "₹810 Cr", "₹640 Cr", "55.9%"],
  ["West Bengal", "₹2,750 Cr", "₹1,140 Cr", "₹1,610 Cr", "41.5%"],
  ["Bihar", "₹2,150 Cr", "₹390 Cr", "₹1,760 Cr", "18.1%"],
];

const compCorridors = [
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

const rrRows = [
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

const possDistricts = [
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

const milestones = [
  ["Varanasi-Kolkata Econo…", "Sec 11 Preliminary Notification Gazette publication", "RFCTLARR Act 2023 Sec 11(1)", "2023-09-30", "2024-04-15", "2026-09-26", "+139 Days", "DELAYED"],
  ["Varanasi-Kolkata Econo…", "Sec 19 Declaration of Acquisition", "RFCTLARR Act 2023 Sec 19(1)", "2024-09-30", "2027-01-31", "2026-09-26", "+210 Days", "DELAYED"],
  ["Bengaluru-Chennai Expr…", "Sec 23 Award by Land Acquisition Officer", "RFCTLARR Act 2023 Sec 23", "2024-03-31", "2025-02-15", "2026-09-26", "+140 Days", "DELAYED"],
  ["Eastern Dedicated Freig…", "Sec 38 Taking Possession of Land", "RFCTLARR Act 2023 Sec 38", "2025-06-30", "2026-12-15", "2026-09-26", "+165 Days", "DELAYED"],
  ["Western Dedicated Freig…", "Sec 31 Rehabilitation & Resettlement Award", "RFCTLARR Act 2023 Sec 31", "2026-01-15", "2026-03-01", "2026-09-26", "+45 Days", "AT RISK"],
  ["Mumbai-Ahmedabad Hig…", "100% Possession Handover to Civil Contractor", "RFCTLARR Act 2023 Sec 38", "2026-06-30", "2026-06-25", "2026-09-26", "0 Days", "COMPLETED"],
  ["Noida International Airp…", "Possession Certificate under Sec 38", "RFCTLARR Act 2023 Sec 38", "2026-05-31", "2026-05-28", "2026-09-26", "0 Days", "COMPLETED"],
  ["Delhi-Mumbai Expressw…", "Final Commercial Operations Date (COD)", "NHAI Concession Agreement Cl. 14", "2026-12-31", "2026-12-31", "2026-09-26", "0 Days", "ON TRACK"],
];

const backlogCards = [
  { t: "Objection backlog", imp: "3 Projects Impacted", n: "482", sub: "pending cases", area: "418.5 Ha", age: "142 days", trend: "Increasing", bracket: "> 90 Days", cause: "Sec 15 hearing adjournments due to multi-claimant title disputes and inherited co-parcenary claims.", sev: "CRITICAL" },
  { t: "Possession backlog", imp: "3 Projects Impacted", n: "372", sub: "pending cases", area: "512 Ha", age: "188 days", trend: "Stable", bracket: "> 90 Days", cause: "High Court status-quo stays and unevacuated standing crop compensation claims.", sev: "CRITICAL" },
  { t: "Compensation backlog", imp: "4 Projects Impacted", n: "1,240", sub: "pending cases", area: "685.2 Ha", age: "95 days", trend: "Decreasing", bracket: "> 90 Days", cause: "PFMS/Treasury mandate rejection due to mismatched name spellings across Aadhaar vs Khatiyan.", sev: "HIGH" },
  { t: "Approval backlog", imp: "2 Projects Impacted", n: "64", sub: "pending cases", area: "188 Ha", age: "78 days", trend: "Stable", bracket: "< 90 Days", cause: "Inter-ministerial Section 20 Forest Clearance (Stage-2) and Railway Overbridge approval clearances.", sev: "HIGH" },
  { t: "R&R backlog", imp: "3 Projects Impacted", n: "1,074", sub: "pending cases", area: "340 Ha", age: "132 days", trend: "Increasing", bracket: "> 90 Days", cause: "Resettlement colony layout municipal drainage sanction delayed by local development authority.", sev: "HIGH" },
  { t: "Field verification backlog", imp: "2 Projects Impacted", n: "215", sub: "pending cases", area: "112.4 Ha", age: "46 days", trend: "Decreasing", bracket: "< 90 Days", cause: "Joint Measurement Survey (JMS) rover GPS crew shortage in monsoon inundation zones.", sev: "MEDIUM" },
  { t: "Validation backlog", imp: "2 Projects Impacted", n: "88", sub: "pending cases", area: "84 Ha", age: "31 days", trend: "Decreasing", bracket: "< 90 Days", cause: "Revenue inspector RoR (Record of Rights) digitisation discrepancies in legacy Urdu/Devanagari jamabandi records.", sev: "MEDIUM" },
];

const forecasts = [
  { id: "PRED-ML-VKC-2026-09", title: "Varanasi-Kolkata Economic Corridor (Pkg 6–9)", risk: "HIGH RISK (92% PROB)", delay: "+245 Days Projected Delay", model: "ZameenAI GatiShakti Corridor Predictor v1.4", gen: "26 Sep 2026, 00:00 AM", jur: "Bihar", factors: ["High density of un-disposed Section 15 objections (482 cases) in Kaimur district", "Pending Section 19 declaration re-notification clock running since June 2026", "Revenue officer staff vacancy at 41% in Sasaram subdivision", "Monsoonal JMS delays compounded by waterlogging in Son basin"], esc: "Convene Special State High-Powered Land Committee under Bihar Chief Secretary to sanction fast-track arbitration camps." },
  { id: "PRED-ML-EDFC-2026-08", title: "Eastern Dedicated Freight Corridor (Sonnagar–Dankuni Section)", risk: "HIGH RISK (86% PROB)", delay: "+180 Days Projected Delay", model: "ZameenAI GatiShakti Corridor Predictor v1.4", gen: "26 Sep 2026, 00:00 AM", jur: "West Bengal", factors: ["Concentration of 114 High Court status-quo interim orders in Purba Bardhaman", "Gram Sabha resolution impasse in 3 resettlement villages regarding community hall entitlements", "Compensation disbursement velocity at only ₹18 Cr/month against required ₹65 Cr/month"], esc: "Engage Advocate General for clubbed hearing before High Court of Calcutta Division Bench for vacating interim stays." },
  { id: "PRED-ML-BCE-2026-07", title: "Bengaluru-Chennai Expressway (Chittoor Section)", risk: "MEDIUM RISK (68% PROB)", delay: "+85 Days Projected Delay", model: "ZameenAI Spatial Encroachment & Risk Model v2.1", gen: "26 Sep 2026, 00:00 AM", jur: "Andhra Pradesh", factors: ["Market value revision revision petitions filed before Land Acquisition, Rehabilitation & Resettlement Authority (LARRA)", "Underground optical fiber and gas pipeline utility diversion clearances pending"], esc: "Sanction one-time consent award premium differential under Section 23A to expedite negotiated settlement." },
  { id: "PRED-ML-WDFC-2026-06", title: "Western Dedicated Freight Corridor (Rewari–Palanpur Track)", risk: "MEDIUM RISK (54% PROB)", delay: "+65 Days Projected Delay", model: "ZameenAI Spatial Encroachment & Risk Model v2.1", gen: "26 Sep 2026, 00:00 AM", jur: "Rajasthan", factors: ["Minor gap of 24 stayed khasras near Phulera junction requiring bypass alignment tweak", "Gram Sabha R&R package signing pending in 2 revenue villages"], esc: "District Collector Jaipur to organize weekend Lok Adalat camp for immediate compensation release." },
];

const reports = [
  { t: "National Infrastructure Land Acquisition Performance Dossier", f: "PDF", d: "Comprehensive high-level digest covering all 10 monitored corridors, land notified, acquired, compensation burn rate, and critical path delays.", c: "Project Progress", fr: "Weekly", u: "26 Sep 2026, 06:00 AM" },
  { t: "RFCTLARR Section-wise Statutory Compliance & Award Status", f: "PDF", d: "Statutory milestone audit comparing Gazette notifications under Sec 11, declarations under Sec 19, and award passing under Sec 23.", c: "Land Acquisition", fr: "Monthly", u: "25 Sep 2026, 08:30 PM" },
  { t: "Compensation Disbursement & Treasury Reconciliation Statement", f: "XLSX", d: "Aggregated financial statement of assessed versus disbursed compensation, pending treasury mandates, and interest liabilities.", c: "Compensation", fr: "Daily", u: "26 Sep 2026, 09:00 AM" },
  { t: "Resettlement & Rehabilitation (R&R) Family Entitlements Register", f: "PDF", d: "Aggregated progress tracking on R&R packages, colony allotment, transitional allowances, and livelihood grants without citizen PII.", c: "R&R", fr: "Monthly", u: "24 Sep 2026, 04:00 PM" },
  { t: "Possession Handover & Stalled Corridor Exception Ledger", f: "CSV", d: "Detailing parcel-level bottlenecks, judicial stay orders, police assistance requirements, and physical possession certificates under Sec 38.", c: "Possession", fr: "Weekly", u: "26 Sep 2026, 10:15 AM" },
  { t: "PM GatiShakti Multi-Modal Timeline Adherence & Slippage Forecast", f: "PDF", d: "Predictive timeline deviation model with planned versus actual completion forecasts and critical path impacts.", c: "Timeline", fr: "Weekly", u: "26 Sep 2026, 06:00 AM" },
  { t: "Geographic State & District Disaggregated Benchmark Summary", f: "XLSX", d: "Cross-state comparison matrix ranking land acquisition velocity, acquisition cost per hectare, and dispute resolution turnaround.", c: "Geographic Summary", fr: "Monthly", u: "25 Sep 2026, 11:00 AM" },
];

const alerts = [
  { sev: "CRITICAL", t: "Critical Delay: Varanasi-Kolkata Corridor Section 19 Clock At Risk", d: "Acquisition in Kaimur district is delayed by 210 days. 482 objections under Sec 15 remain unresolved, risk of statutory limitation expiry.", meta: "Corridor: Varanasi-Kolkata Economic Corridor · State: Bihar · Impact: 1,410 Ha notified land pending declaration · Logged: 26 Sep 2026, 10:30 AM" },
  { sev: "CRITICAL", t: "Judicial Stay Concentration in Eastern DFC Corridor", d: "High Court status-quo orders now affect 114 contiguous khasras in Memari taluka, stalling civil contractor mobilization.", meta: "Corridor: Eastern Dedicated Freight Corridor · State: West Bengal · Impact: 670 Ha corridor blocked from physical possession · Logged: 26 Sep 2026, 09:45 AM" },
  { sev: "WARNING", t: "Compensation Disbursement Backlog Alert", d: "Compensation payment progress stands at only 55.9% (₹640 Cr pending disbursement) due to LARRA reference petitions.", meta: "Corridor: Bengaluru-Chennai Expressway · State: Andhra Pradesh · Impact: 1,178 families pending final award settlement · Logged: 25 Sep 2026, 04:15 PM" },
  { sev: "INFO", t: "Milestone Achievement: High Speed Rail Surat Handover Complete", d: "100% physical possession of 855 Ha successfully achieved and certified under Section 38 without pending litigation.", meta: "Corridor: Mumbai-Ahmedabad High Speed Rail · State: Gujarat · Impact: 100% handover complete · Logged: 25 Sep 2026, 11:20 AM" },
  { sev: "WARNING", t: "Predictive Timeline Deviation: Western DFC Palanpur Link", d: "ZameenAI predictive model flagged a 45-day delay risk during Gram Sabha R&R consultations.", meta: "Corridor: Western Dedicated Freight Corridor · State: Rajasthan · Impact: Predicted 45 days slippage on R&R award · Logged: 24 Sep 2026, 05:40 PM" },
];

/* ================= HELPERS ================= */

function HealthPill({ s }: { s: string }) {
  const tone =
    s === "ON TRACK" || s === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : s === "AT RISK" ? "border-amber-200 bg-amber-50 text-amber-800"
    : s === "DELAYED" ? "border-red-200 bg-red-50 text-red-700"
    : "border-slate-700 bg-slate-800 text-slate-200";
  if (s === "BLOCKED") return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-800">■ BLOCKED</span>;
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-black ${tone}`}>● {s}</span>;
}

function Bar({ pct, color = "bg-emerald-500" }: { pct: number; color?: string }) {
  return (
    <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </span>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`bg-slate-50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-t border-slate-100 px-3 py-2.5 text-[11px] ${className}`}>{children}</td>;
}
function TableShell({ children, minWidth = "min-w-[900px]" }: { children: React.ReactNode; minWidth?: string }) {
  return <div className="overflow-x-auto"><table className={`w-full ${minWidth} text-left`}>{children}</table></div>;
}
function FilterSelect({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600">
      <span className="truncate">{label}</span> <ChevronDown size={13} className="shrink-0 text-slate-400" />
    </label>
  );
}
function SectionTag({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-800">{children}</span>;
}

/* ================= MAIN ================= */

function ExecutivePortal() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [scope, setScope] = useState<Scope>("National");
  const [query, setQuery] = useState("");
  const [globalState, setGlobalState] = useState("All States");
  const [globalDistrict, setGlobalDistrict] = useState("All Districts");
  const [globalType, setGlobalType] = useState("All Infrastructure Types");
  const [globalMinistry, setGlobalMinistry] = useState("All Ministries & Agencies");
  const [globalStage, setGlobalStage] = useState("All RFCTLARR Stages");
  const [globalHealth, setGlobalHealth] = useState("All Statuses");
  const hasActiveFilters =
    globalState !== "All States" || globalDistrict !== "All Districts" ||
    globalType !== "All Infrastructure Types" || globalMinistry !== "All Ministries & Agencies" ||
    globalStage !== "All RFCTLARR Stages" || globalHealth !== "All Statuses";
  const clearGlobalFilters = () => {
    setGlobalState("All States");
    setGlobalDistrict("All Districts");
    setGlobalType("All Infrastructure Types");
    setGlobalMinistry("All Ministries & Agencies");
    setGlobalStage("All RFCTLARR Stages");
    setGlobalHealth("All Statuses");
  };
  const [stateScope, setStateScope] = useState<"monitored" | "all">("monitored");
  const [districtState, setDistrictState] = useState("All States");
  const [districtPage, setDistrictPage] = useState(0);

  const PAGE_SIZE = 25;
  const districtsOfGlobalState =
    globalState === "All States" ? [] : (INDIA_DISTRICTS[globalState] ?? []);
  const [compare, setCompare] = useState<string[]>([
    "Delhi-Mumbai Expressway (Vadodara–Kim Section)",
    "Western Dedicated Freight Corridor (Rewari–Palanpur Track)",
    "Varanasi-Kolkata Economic Corridor (Package 6–9)",
  ]);
  const [reportTab, setReportTab] = useState("All MIS Reports");

  const nav = (key: ViewKey) => () => {
    setView(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredCorridors = useMemo(() => {
    const x = query.trim().toLowerCase();
    return corridors.filter((c) => {
      const matchesQ = !x || `${c.name} ${c.code} ${c.state} ${c.district}`.toLowerCase().includes(x);
      const matchesState = globalState === "All States" || c.state === globalState;
      const matchesDist =
        globalDistrict === "All Districts" || c.district === globalDistrict;
      const matchesType = globalType === "All Infrastructure Types" || c.type === globalType;
      const matchesMinistry = globalMinistry === "All Ministries & Agencies" || c.ministry === globalMinistry;
      const stageMatch = RFCTLARR_STAGES.find((s) => s.label === globalStage)?.match;
      const matchesStage = !stageMatch || c.stage.includes(stageMatch);
      const matchesHealth = globalHealth === "All Statuses" || c.status === globalHealth;
      return matchesQ && matchesState && matchesDist && matchesType && matchesMinistry && matchesStage && matchesHealth;
    });
  }, [query, globalState, globalDistrict, globalType, globalMinistry, globalStage, globalHealth]);

  /** All 36 States/UTs: 7 monitored rows + remaining directory rows. */
  const allStatesRows = useMemo(() => {
    const monitored = new Map(stateBenchmark.map((r) => [r.s, r]));
    return INDIA_STATES.map((s) => {
      const m = monitored.get(s.name);
      if (m) return { ...m, monitored: true, type: s.type, code: s.code };
      return {
        s: s.name, st: "No Active Corridor", proj: 0, req: "—", not: "—", acq: "—",
        pct: 0, ass: "—", paid: "—", fam: "—", rr: "—", del: 0,
        monitored: false, type: s.type, code: s.code,
      };
    });
  }, []);

  const visibleStates = useMemo(() => {
    const rows = stateScope === "monitored" ? allStatesRows.filter((r) => r.monitored) : allStatesRows;
    const x = query.trim().toLowerCase();
    if (!x) return rows;
    return rows.filter((r) => r.s.toLowerCase().includes(x));
  }, [allStatesRows, stateScope, query]);

  /** Full district directory: monitored KPI rows merged over the all-India list. */
  const districtDirectory = useMemo(() => {
    const kpi = new Map(districts.map((r) => [`${r.d}|${r.s}`, r]));
    return ALL_DISTRICTS.map(({ district, state }) => {
      const m = kpi.get(`${district}|${state}`);
      if (m) return { d: m.d, s: m.s, p: m.p, area: m.area, acq: m.acq, comp: m.comp, fam: m.fam, rr: m.rr, poss: m.poss, adh: m.adh, monitored: true };
      return { d: district, s: state, p: 0, area: "—", acq: 0, comp: "—", fam: "—", rr: "—", poss: "—", adh: "No Active Corridor", monitored: false };
    });
  }, []);

  const visibleDistricts = useMemo(() => {
    const x = query.trim().toLowerCase();
    return districtDirectory.filter((r) => {
      const matchesState = districtState === "All States" || r.s === districtState;
      const matchesQ = !x || `${r.d} ${r.s}`.toLowerCase().includes(x);
      return matchesState && matchesQ;
    });
  }, [districtDirectory, districtState, query]);

  const districtPages = Math.max(1, Math.ceil(visibleDistricts.length / PAGE_SIZE));
  const districtRows = visibleDistricts.slice(districtPage * PAGE_SIZE, districtPage * PAGE_SIZE + PAGE_SIZE);

  const toggleCompare = (name: string) =>
    setCompare((s) => (s.includes(name) ? s.filter((x) => x !== name) : s.length >= 4 ? s : [...s, name]));
  const compared = corridors.filter((c) => compare.includes(c.name));

  const sidebarGroups = [
    {
      title: "Executive Monitoring",
      items: [
        { label: "Executive Dashboard", icon: <LayoutDashboard size={16} />, active: view === "dashboard", onClick: nav("dashboard") },
        { label: "National Overview", icon: <Globe size={16} />, active: view === "national", onClick: nav("national") },
        { label: "States Performance", icon: <Flag size={16} />, active: view === "states", onClick: nav("states") },
        { label: "Districts MIS", icon: <MapPin size={16} />, active: view === "districts", onClick: nav("districts") },
        { label: "Corridor Projects", icon: <FolderKanban size={16} />, active: view === "corridors", onClick: nav("corridors") },
        { label: "Executive GIS Map", icon: <MapIcon size={16} />, active: view === "gis", onClick: nav("gis") },
      ],
    },
    {
      title: "Analytics",
      items: [
        { label: "Program Analytics", icon: <TrendingUp size={16} />, active: view === "program", onClick: nav("program") },
        { label: "Compensation Analytics", icon: <IndianRupee size={16} />, active: view === "compensation", onClick: nav("compensation") },
        { label: "R&R Progress", icon: <Users size={16} />, active: view === "rr", onClick: nav("rr") },
        { label: "Possession Monitoring", icon: <KeyRound size={16} />, active: view === "possession", onClick: nav("possession") },
        { label: "Timeline Adherence", icon: <CalendarClock size={16} />, active: view === "timeline", onClick: nav("timeline") },
        { label: "Bottlenecks & Backlog", icon: <TriangleAlert size={16} />, badge: "CRITICAL", active: view === "bottlenecks", onClick: nav("bottlenecks") },
        { label: "Project Comparison", icon: <Gavel size={16} />, active: view === "comparison", onClick: nav("comparison") },
        { label: "Predictive Indicators", icon: <Sparkles size={16} />, badge: "AI/ML", active: view === "predictive", onClick: nav("predictive") },
      ],
    },
    {
      title: "Executive Office",
      items: [
        { label: "MIS Reports & Briefs", icon: <FileBarChart size={16} />, active: view === "reports", onClick: nav("reports") },
        { label: "Executive Alerts", icon: <Bell size={16} />, badge: 5, active: view === "alerts", onClick: nav("alerts") },
        { label: "Executive Profile", icon: <User size={16} />, active: view === "profile", onClick: nav("profile") },
      ],
    },
  ];

  const corridorTable = (rows: Corridor[]) => (
    <PortalCard className="!p-0">
      <div className="hidden lg:block">
        <TableShell minWidth="min-w-[1100px]">
          <thead><tr><Th>Project Code / Name</Th><Th>State / District</Th><Th>Type</Th><Th className="text-right">Health Index</Th><Th>Status</Th><Th>Current Statutory Stage</Th><Th className="text-right">Land Acq. / Req.</Th><Th className="text-right">Compensation Paid</Th><Th>Possession %</Th><Th className="text-right">Action</Th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code} className="hover:bg-amber-50/40">
                <Td><p className="max-w-[260px] font-bold text-slate-800">{c.name}</p><p className="font-mono text-[10px] text-slate-400">{c.code}</p></Td>
                <Td><p className="font-medium text-slate-700">{c.state}</p><p className="text-[10px] text-slate-400">{c.district}</p></Td>
                <Td className="max-w-[150px] text-slate-500">{c.type}</Td>
                <Td className={`text-right font-mono font-black ${c.health >= 85 ? "text-emerald-700" : c.health >= 60 ? "text-amber-700" : "text-red-600"}`}>{c.health}/100</Td>
                <Td><HealthPill s={c.status} /></Td>
                <Td className="max-w-[180px] text-slate-500">{c.stage}</Td>
                <Td className="whitespace-nowrap text-right font-mono"><b>{c.landA}</b> <span className="text-slate-400">/ {c.landR}</span></Td>
                <Td className="whitespace-nowrap text-right font-mono"><b className="text-emerald-700">{c.compP}</b> <span className="text-slate-400">/ {c.compA}</span></Td>
                <Td><p className="font-mono text-[11px] font-bold">{c.poss.toFixed(1)}%</p><Bar pct={c.poss} color={c.poss > 90 ? "bg-emerald-500" : c.poss > 60 ? "bg-amber-500" : "bg-red-500"} /></Td>
                <Td className="text-right"><button className="text-[11px] font-bold text-amber-700 hover:text-amber-900">Inspect →</button></Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
      <div className="space-y-3 p-4 lg:hidden">
        {rows.map((c) => (
          <div key={c.code} className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[13px] font-bold text-slate-800">{c.name}</p>
            <p className="font-mono text-[10px] text-slate-400">{c.code} · {c.state}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><HealthPill s={c.status} /><span className="font-mono text-[11px] font-bold">{c.health}/100</span></div>
            <p className="mt-1.5 font-mono text-[11px] text-slate-500">Land {c.landA}/{c.landR} · Paid {c.compP} · Poss {c.poss.toFixed(1)}%</p>
            <Bar pct={c.poss} />
          </div>
        ))}
      </div>
    </PortalCard>
  );

  return (
    <PortalLayout
      portalBadge="Executive MIS & DSS"
      portalSub="PM GatiShakti & Land Acquisition Decision Support System"
      userName={OFFICER.name}
      userInitials={OFFICER.initials}
      userRole={OFFICER.role}
      activeContext={`${scope} Scope • FY 2026–27`}
      sidebarGroups={sidebarGroups}
      userMenu={{
        userDesignation: OFFICER.designation,
        userLevelLabel: OFFICER.level,
        jurisdiction: OFFICER.jurisdiction,
        orgProfileLabel: "Executive Authorization Profile",
        showOfficerProfileRow: true,
        officerProfileLabel: "My Executive Profile",
        onViewOfficerProfile: nav("profile"),
        onViewOrgProfile: nav("profile"),
        onResetDemo: () => {
          setQuery("");
          setCompare(corridors.slice(2, 5).map((c) => c.name));
          setReportTab("All MIS Reports");
          setGlobalState("All States");
          setGlobalDistrict("All Districts");
          clearGlobalFilters();
          setStateScope("monitored");
          setDistrictState("All States");
          setDistrictPage(0);
          setView("dashboard");
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        notificationCount: 5,
        onNotificationClick: nav("alerts"),
      }}
      topActions={
        <>
          <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold xl:inline-flex">
            {(["National", "State", "District"] as Scope[]).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`rounded-md px-2.5 py-1 ${scope === s ? "bg-amber-500 text-white" : "text-slate-500 hover:text-slate-800"}`}>{s}</button>
            ))}
          </span>
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-500 xl:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Updated: 26 Sep 2026, 11:34 AM
          </span>
          <button onClick={() => window.print()} className="hidden items-center gap-1.5 rounded-lg bg-[#0B2A5B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#123a75] lg:inline-flex">
            <Download size={14} /> Download Dossier
          </button>
        </>
      }
    >
      {/* Global MIS filter strip */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          ▽ Global MIS Filters
          <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 font-mono normal-case tracking-normal text-emerald-700">Read-only decision maker</span>
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono normal-case tracking-normal text-slate-500">{INDIA_STATES.length} States/UTs · {ALL_DISTRICTS.length} Districts</span>
          {hasActiveFilters && (
            <button
              onClick={clearGlobalFilters}
              className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono normal-case tracking-normal text-amber-800 hover:bg-amber-200"
            >
              Clear ✕
            </button>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
            <span className="truncate">State: {globalState === "All States" ? "All States" : globalState}</span>
            <select
              value={globalState}
              onChange={(e) => { setGlobalState(e.target.value); setGlobalDistrict("All Districts"); }}
              className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
              aria-label="Filter by State"
            >
              <option value="All States">All States ({INDIA_STATES.length})</option>
              {INDIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>{s.name} ({s.type})</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
            <span className="truncate">District: {globalDistrict}</span>
            <select
              value={globalDistrict}
              onChange={(e) => setGlobalDistrict(e.target.value)}
              className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
              aria-label="Filter by District"
            >
              <option value="All Districts">
                {globalState === "All States" ? `All Districts (${ALL_DISTRICTS.length})` : `All of ${globalState} (${districtsOfGlobalState.length})`}
              </option>
              {(globalState === "All States" ? ALL_DISTRICTS.map((d) => d.district) : districtsOfGlobalState).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
            <span className="truncate">Type: {globalType === "All Infrastructure Types" ? "All Types" : globalType}</span>
            <select value={globalType} onChange={(e) => setGlobalType(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Infrastructure Type">
              <option value="All Infrastructure Types">All Infrastructure Types ({INFRA_TYPES.length})</option>
              {INFRA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
            <span className="truncate">Ministry: {globalMinistry === "All Ministries & Agencies" ? "All Agencies" : globalMinistry.replace(/ \(.*/, "")}</span>
            <select value={globalMinistry} onChange={(e) => setGlobalMinistry(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Ministry or Agency">
              <option value="All Ministries & Agencies">All Ministries & Agencies ({MINISTRIES.length})</option>
              {MINISTRIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
            <span className="truncate">Stage: {globalStage === "All RFCTLARR Stages" ? "All Stages" : globalStage.split("–")[0].trim()}</span>
            <select value={globalStage} onChange={(e) => setGlobalStage(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Statutory Stage">
              <option value="All RFCTLARR Stages">All RFCTLARR Stages ({RFCTLARR_STAGES.length})</option>
              {RFCTLARR_STAGES.map((s) => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700">
            <span className="truncate">Health: {globalHealth === "All Statuses" ? "All Statuses" : globalHealth}</span>
            <select value={globalHealth} onChange={(e) => setGlobalHealth(e.target.value)} className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none" aria-label="Filter by Health Status">
              <option value="All Statuses">All Statuses ({HEALTH_STATUSES.length})</option>
              {HEALTH_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ================= EXECUTIVE DASHBOARD ================= */}
      {view === "dashboard" && (
        <>
          <GreetingHeader
            eyebrow="Executive Monitoring Window • FY 2026–27"
            title="National Infrastructure Land Acquisition Dossier"
            subtitle="Aggregated statutory progress under RFCTLARR Act 2013 across notified corridors."
            actions={
              <>
                <button onClick={nav("gis")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">Launch GIS Map</button>
                <button onClick={nav("bottlenecks")} className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-800">Review Bottlenecks (7)</button>
              </>
            }
          />

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {dashKpis.map((k) => (
              <PortalCard key={k.label} className="!p-3.5">
                <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label} <span className="rounded bg-amber-100 px-1 py-px font-mono text-[8px] text-amber-800">DEMO DATA</span></p>
                <p className="mt-1 font-mono text-xl font-black text-[#0B1F44]">{k.value}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{k.sub} · 26 Sep 2026</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Statutory Program Progress & Pipeline Adherence</h2>
              <p className="font-mono text-[10px] text-slate-500">Total: 10 · <span className="text-emerald-700">On Track: 6</span> · <span className="text-amber-700">At Risk: 1</span> · <span className="text-red-600">Delayed: 2</span> · Blocked: 1</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
              {programStages.map((s) => (
                <div key={s.code} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                  <p className="flex items-center justify-between font-mono text-[10px] text-slate-400">{s.code} <span className="font-bold text-slate-600">{s.pct}%</span></p>
                  <p className="mt-0.5 text-[11px] font-bold leading-tight text-slate-700">{s.label}</p>
                  <p className="mt-1 font-mono text-[11px] font-bold text-slate-800">{s.value}</p>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${s.pct}%` }} /></span>
                </div>
              ))}
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-red-900">Critical Bottleneck Backlog (Section 18)</h2>
                <button onClick={nav("bottlenecks")} className="text-[11px] font-bold text-amber-700">View All (7) →</button>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  ["Objection backlog", "Sec 15 hearing adjournments due to multi-claimant title disputes. Count: 482 · Area: 418.5 Ha · Avg: 142 days", "CRITICAL"],
                  ["Possession backlog", "High Court status-quo stays and unevacuated standing crop claims. Count: 372 · Area: 512 Ha · Avg: 188 days", "CRITICAL"],
                  ["Compensation backlog", "PFMS mandate rejections on Aadhaar vs Khatiyan name mismatch. Count: 1,240 · Area: 685.2 Ha · Avg: 95 days", "HIGH"],
                ].map(([t, d, s]) => (
                  <div key={t as string} className="rounded-lg border border-slate-200 p-3">
                    <p className="flex items-center justify-between font-bold text-slate-800">{t as string} <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${s === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{s as string}</span></p>
                    <p className="mt-1 leading-relaxed text-slate-500">{d as string}</p>
                  </div>
                ))}
              </div>
            </PortalCard>
            <PortalCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Predictive Delay Indicators (Section 21)</h2>
                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">PREDICTIVE INDICATORS</span>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  ["Varanasi-Kolkata Economic Corridor (Pkg 6–9)", "+245 Days Slippage · Prob: 92%", "Convene Special State High-Powered Land Committee under Bihar Chief Secretary."],
                  ["Eastern Dedicated Freight Corridor (Sonnagar–Dankuni)", "+180 Days Slippage · Prob: 86%", "Engage Advocate General for clubbed hearing before Calcutta Division Bench."],
                  ["Bengaluru-Chennai Expressway (Chittoor)", "+85 Days Slippage · Prob: 68%", "Sanction one-time consent award premium differential under Section 23A."],
                ].map(([t, m, r]) => (
                  <div key={t as string} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-bold text-slate-800">{t as string}</p>
                    <p className="mt-0.5 font-mono text-[11px] font-bold text-red-600">{m as string}</p>
                    <p className="mt-1 leading-relaxed text-slate-500">“{r as string}”</p>
                  </div>
                ))}
              </div>
            </PortalCard>
          </div>

          <div className="mb-2 mt-5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0B1F44]">Corridor Projects Overview ({filteredCorridors.length})</h2>
            <button onClick={nav("corridors")} className="text-xs font-bold text-amber-700">Explore All Projects →</button>
          </div>
          {corridorTable(filteredCorridors.slice(0, 7))}
        </>
      )}

      {/* ================= NATIONAL OVERVIEW ================= */}
      {view === "national" && (
        <>
          <GreetingHeader
            eyebrow="National Aggregated Scope • PM GatiShakti NMP Integration"
            title="Pan-India Land Acquisition Governance Framework"
            subtitle="Aggregated national oversight across 7 active state jurisdictions — mega expressways, freight corridors, high-speed rail, and industrial nodes."
            actions={<button onClick={nav("states")} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600">State Comparison Table</button>}
          />
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total Land Under Acquisition", "15,939.7 Hectares", "+3.1% vs 15,460 Ha prev"],
              ["Pan-India Acquisition Rate", "80% Overall", "+4.5% vs 77.6% prev"],
              ["National Compensation Disbursed", "₹17,260.5 Cr", "+12.6% vs ₹15,320 Cr prev"],
              ["Statutory R&R Settlement Rate", "63.5% Settled", "+5.0% vs 72.0% prev"],
            ].map(([l, v, s]) => (
              <PortalCard key={l} className="!p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
                <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{v}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s} · 26 Sep 2026</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5 !p-0">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">State Performance & Acquisition Velocity Leaderboard</h2><p className="text-[11px] text-slate-500">States ranked by percentage of required land physically acquired and possession certified.</p></div>
              <button onClick={nav("states")} className="w-fit text-xs font-bold text-amber-700">Full State Table →</button>
            </div>
            <div className="space-y-2 p-4">
              {stateBoard.map((s) => (
                <div key={s.state} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 lg:flex-row lg:items-center">
                  <p className="flex items-center gap-2 lg:w-72 lg:shrink-0"><span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 font-mono text-[10px] font-black text-slate-600">#{s.rank}</span><span><span className="block text-[13px] font-bold text-slate-800">{s.state} <HealthPill s={s.status} /></span><span className="block text-[10px] text-slate-400">{s.meta}</span></span></p>
                  <div className="grid flex-1 grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
                    <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">Acquired Area</span><b>{s.acq}</b></span>
                    <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">Compensation Paid</span><b className="text-emerald-700">{s.comp}</b></span>
                    <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">R&R Progress</span><b>{s.rr}</b></span>
                    <span><span className="block font-sans text-[9px] uppercase tracking-wider text-slate-400">Acquisition Rate</span><b>{s.rate}%</b><Bar pct={s.rate} color={s.rate > 90 ? "bg-emerald-500" : s.rate > 60 ? "bg-amber-500" : "bg-red-500"} /></span>
                  </div>
                </div>
              ))}
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= STATES ================= */}
      {view === "states" && (
        <>
          <GreetingHeader
            eyebrow="State Governance Matrix • Section 9 Cross-State Audit"
            title="State Land Acquisition Performance Benchmark"
            subtitle="Click on any state row to drill down into district-level Land Acquisition Officer (LAO) progress."
          />
          <PortalCard className="!p-0">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1.5 text-xs font-bold">
                <button onClick={() => setStateScope("monitored")} className={`rounded-lg px-3 py-1.5 ${stateScope === "monitored" ? "bg-[#0B2A5B] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  Monitored Corridors ({allStatesRows.filter((r) => r.monitored).length})
                </button>
                <button onClick={() => setStateScope("all")} className={`rounded-lg px-3 py-1.5 ${stateScope === "all" ? "bg-[#0B2A5B] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  All States & UTs ({allStatesRows.length})
                </button>
              </div>
              <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 sm:w-64">
                <Search size={14} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search State / UT…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <p className="border-b border-slate-100 px-4 py-2 font-mono text-[11px] text-slate-500">
              Showing {visibleStates.length} of {stateScope === "monitored" ? allStatesRows.filter((r) => r.monitored).length : allStatesRows.length} {stateScope === "monitored" ? "monitored states" : "States & UTs"}
            </p>
            <TableShell minWidth="min-w-[1100px]">
              <thead><tr><Th>State / UT</Th><Th className="text-center">Projects</Th><Th className="text-right">Land Req (Ha)</Th><Th className="text-right">Notified (Ha)</Th><Th className="text-right">Acquired (Ha)</Th><Th>Acquisition %</Th><Th className="text-right">Assessed (₹ Cr)</Th><Th className="text-right">Paid (₹ Cr)</Th><Th className="text-right">Affected Fam.</Th><Th className="text-right">R&R %</Th><Th className="text-center">Delayed</Th><Th className="text-right">Drill-down</Th></tr></thead>
              <tbody>
                {visibleStates.map((r) => (
                  <tr key={r.s} className={`hover:bg-amber-50/40 ${r.monitored ? "" : "opacity-75"}`}>
                    <Td>
                      <p className="font-bold text-slate-800">{r.s} <span className="ml-1 rounded bg-slate-100 px-1 py-px font-mono text-[9px] font-bold text-slate-500">{r.code} · {r.type}</span></p>
                      {r.monitored ? <HealthPill s={r.st} /> : <span className="inline-flex items-center whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">— No Active Corridor</span>}
                    </Td>
                    <Td className="text-center font-mono">{r.proj}</Td>
                    <Td className="text-right font-mono">{r.req}</Td>
                    <Td className="text-right font-mono">{r.not}</Td>
                    <Td className="text-right font-mono font-bold text-emerald-700">{r.acq}</Td>
                    <Td>{r.monitored ? (<><span className="font-mono text-[11px] font-bold">{r.pct}%</span><Bar pct={r.pct} color={r.pct > 90 ? "bg-emerald-500" : r.pct > 60 ? "bg-amber-500" : "bg-red-500"} /></>) : <span className="font-mono text-slate-300">—</span>}</Td>
                    <Td className="text-right font-mono">{r.ass}</Td>
                    <Td className="text-right font-mono font-bold text-emerald-700">{r.paid}</Td>
                    <Td className="text-right font-mono">{r.fam}</Td>
                    <Td className="text-right font-mono font-bold text-amber-700">{r.rr}</Td>
                    <Td className="text-center">{r.del > 0 ? <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-red-700">{r.del}</span> : <span className="font-mono text-slate-400">0</span>}</Td>
                    <Td className="text-right"><button onClick={() => { setDistrictState(r.monitored ? r.s : "All States"); setDistrictPage(0); nav("districts")(); }} className="text-[11px] font-bold text-amber-700">Drill-down →</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= DISTRICTS ================= */}
      {view === "districts" && (
        <>
          <GreetingHeader
            eyebrow="District Revenue Administration • Section 10 LAO Oversight"
            title="District Land Acquisition & Compensation Directory"
            subtitle="Read-only performance review of district land acquisition collectorates — all-India directory with monitored KPIs merged in."
          />
          <PortalCard className="!p-0">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
              <label className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 sm:w-64">
                <span className="truncate">{districtState === "All States" ? `All States (${INDIA_STATES.length})` : districtState}</span>
                <select
                  value={districtState}
                  onChange={(e) => { setDistrictState(e.target.value); setDistrictPage(0); }}
                  className="w-5 cursor-pointer bg-transparent text-slate-400 outline-none"
                  aria-label="Filter districts by State"
                >
                  <option value="All States">All States</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s.code} value={s.name}>{s.name} ({(INDIA_DISTRICTS[s.name] ?? []).length})</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                <Search size={14} className="text-slate-400" />
                <input value={query} onChange={(e) => { setQuery(e.target.value); setDistrictPage(0); }} placeholder="Search District or State…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <p className="border-b border-slate-100 px-4 py-2 font-mono text-[11px] text-slate-500">
              Showing {districtRows.length} of {visibleDistricts.length} districts
              {districtState !== "All States" ? ` in ${districtState}` : " pan-India"}
              {" "}· {districtDirectory.filter((r) => r.monitored).length} with live corridor KPIs · Page {districtPage + 1} of {districtPages}
            </p>
            <TableShell minWidth="min-w-[1050px]">
              <thead><tr><Th>District</Th><Th className="text-center">Projects</Th><Th className="text-right">Area (Ha)</Th><Th>Acquisition %</Th><Th className="text-right">Compensation Paid</Th><Th className="text-right">Affected Fam.</Th><Th className="text-right">R&R %</Th><Th className="text-right">Possession %</Th><Th>Timeline Adherence</Th><Th className="text-right">View Detail</Th></tr></thead>
              <tbody>
                {districtRows.map((r) => (
                  <tr key={`${r.s}|${r.d}`} className={`hover:bg-amber-50/40 ${r.monitored ? "" : "opacity-80"}`}>
                    <Td>
                      <p className="font-bold text-slate-800">{r.d} {r.monitored && <span className="ml-1 rounded bg-emerald-100 px-1 py-px font-mono text-[9px] font-black text-emerald-800">LIVE</span>}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">{r.s}</p>
                    </Td>
                    <Td className="text-center font-mono">{r.p}</Td>
                    {r.monitored ? (
                      <>
                        <Td className="text-right font-mono"><b className="text-emerald-700">{r.area.split(" / ")[0]}</b> <span className="text-slate-400">/ {r.area.split(" / ")[1]}</span></Td>
                        <Td><span className="font-mono text-[11px] font-bold">{r.acq}%</span><Bar pct={r.acq} color={r.acq > 90 ? "bg-emerald-500" : r.acq > 60 ? "bg-amber-500" : "bg-red-500"} /></Td>
                        <Td className="text-right font-mono text-[11px] text-slate-600">{r.comp}</Td>
                        <Td className="text-right font-mono">{r.fam}</Td>
                        <Td className="text-right font-mono font-bold text-amber-700">{r.rr}</Td>
                        <Td className="text-right font-mono">{r.poss}</Td>
                        <Td><HealthPill s={r.adh} /></Td>
                        <Td className="text-right"><button className="text-[11px] font-bold text-amber-700">Inspect →</button></Td>
                      </>
                    ) : (
                      <>
                        <Td className="text-right font-mono text-slate-300">—</Td>
                        <Td><span className="font-mono text-[11px] text-slate-300">—</span></Td>
                        <Td className="text-right font-mono text-slate-300">—</Td>
                        <Td className="text-right font-mono text-slate-300">—</Td>
                        <Td className="text-right font-mono text-slate-300">—</Td>
                        <Td className="text-right font-mono text-slate-300">—</Td>
                        <Td><span className="inline-flex items-center whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">No Active Corridor</span></Td>
                        <Td className="text-right"><span className="font-mono text-[11px] text-slate-300">—</span></Td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
              <p className="font-mono text-[11px] text-slate-500">Page {districtPage + 1} of {districtPages}</p>
              <div className="flex gap-2">
                <button disabled={districtPage === 0} onClick={() => setDistrictPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40">← Prev</button>
                <button disabled={districtPage + 1 >= districtPages} onClick={() => setDistrictPage((p) => Math.min(districtPages - 1, p + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40">Next →</button>
              </div>
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= CORRIDORS ================= */}
      {view === "corridors" && (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">National Corridor Registry • Section 11 Project Dossier Directory</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Infrastructure Corridor Projects ({filteredCorridors.length})</h1>
              <p className="mt-1 text-sm text-slate-500">Click any project to inspect statutory milestones, compensation disbursal, GIS parcels, and risk forecasts.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-white">Compare Selected ({compare.length}) →</button>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search project or code…" className="w-44 bg-transparent text-xs outline-none placeholder:text-slate-400" />
              </label>
            </div>
          </div>
          {corridorTable(filteredCorridors)}
          <p className="mt-3 text-[11px] text-slate-500">Select up to 4 corridors with the checkboxes on the comparison view to benchmark acquisition velocity and risk side-by-side.</p>
        </>
      )}

      {/* ================= GIS ================= */}
      {view === "gis" && (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 12 – GIS Decision Support • WGS-84 / UTM Zone 43N</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Cadastral Parcel GIS Visualization & Corridor Alignments</h1>
              <p className="mt-1 text-sm text-slate-500">Read-only spatial viewer overlaying notified khasra boundaries, possession certification, and court stay corridors.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800"><Lock size={13} /> GIS Consumption Only — drawing & edits locked</span>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
            <PortalCard className="!p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <FilterSelect label="All Infrastructure Corridors" />
                <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                  <Search size={14} className="text-slate-400" />
                  <input placeholder="Search Khasra / Village…" className="w-full bg-transparent text-[11px] outline-none placeholder:text-slate-400" />
                </label>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-slate-900 p-3 sm:p-5" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "30px 30px" }}>
                <svg viewBox="0 0 640 240" className="mx-auto w-full max-w-[640px]">
                  <path d="M60 60 Q 320 20 580 200" fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" opacity={0.9} />
                  <g fontSize={9} textAnchor="middle" fontWeight={700} transform="rotate(-4 320 120)">
                    {[
                      [110, 45, 70, 55, "#34d399", "142/1"], [180, 40, 60, 50, "#a7f3d0", "142/2"], [240, 38, 55, 48, "#60a5fa", "143"],
                      [295, 40, 55, 52, "#60a5fa", "143/ broad"], [350, 48, 60, 56, "#f87171", "144/8"], [410, 58, 62, 58, "#34d399", "145"],
                      [150, 100, 60, 55, "#f59e0b", "281"], [210, 105, 62, 58, "#f97316", "282"], [272, 108, 58, 55, "#60a5fa", "283/1"],
                      [330, 112, 58, 55, "#f87171", "305"], [388, 118, 60, 58, "#f97316", "306"],
                    ].map(([x, y, w, h, f, t], i) => (
                      <g key={i}>
                        <rect x={x as number} y={y as number} width={w as number} height={h as number} fill={f as string} opacity={0.55} stroke="#0f172a" strokeWidth={1.5} />
                        <text x={(x as number) + (w as number) / 2} y={(y as number) + (h as number) / 2 + 3} fill="#0f172a">{t as string}</text>
                      </g>
                    ))}
                  </g>
                </svg>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-300">
                  <span className="font-bold text-white">Cadastral Legend:</span>
                  {[["Acquired", "#34d399"], ["Notified", "#60a5fa"], ["Pending", "#f59e0b"], ["Contested", "#f97316"], ["Stayed", "#f87171"], ["Alignment", "#fbbf24"]].map(([l, c]) => (
                    <span key={l as string} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c as string }} />{l as string}</span>
                  ))}
                </div>
              </div>
            </PortalCard>

            <PortalCard>
              <h2 className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#0B1F44]">Parcel Executive Inspector <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">Read-Only</span></h2>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-400">Khasra / Survey Number</p>
              <p className="font-mono text-xl font-black text-slate-900">142/1</p>
              <p className="text-[11px] text-slate-500">Village: Chhani · Vadodara Rural<br />District: Vadodara, Gujarat</p>
              <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                {[["Project", "Delhi-Mumbai Expressway"], ["Parcel Area", "4.8 Hectares"], ["Acquisition Status", "Acquired"], ["Physical Possession", "Completed"], ["Compensation", "₹96 Lakh"], ["Disbursal State", "Disbursed to Beneficiary"], ["Objection / Court", "None"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2"><dt className="text-slate-400">{k}</dt><dd className={`font-bold ${v === "Acquired" || v === "Completed" || v === "Disbursed to Beneficiary" ? "text-emerald-700" : "text-slate-800"}`}>{v}</dd></div>
                ))}
              </dl>
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-500"><b className="text-slate-700">Executive View Boundary:</b> Cadastral boundary modifications and survey vertex re-alignments are reserved for authorized Survey of India & LAO personnel.</p>
            </PortalCard>
          </div>
        </>
      )}

      {/* ================= PROGRAM ANALYTICS ================= */}
      {view === "program" && (
        <>
          <GreetingHeader
            eyebrow="Section 20 – MIS Analytics Workspace • FY 2026–27"
            title="Cross-Dimensional Program Performance & Trend Analytics"
            subtitle="Aggregated time-series, disbursement trajectories, and displacement ratios sourced from state treasury feeds."
          />
          <div className="mb-4 flex gap-1.5 overflow-x-auto text-xs font-semibold">
            {["Acquisition & Land Trends", "Compensation Burn Rates", "R&R & Family Entitlements", "Possession Handover Velocity", "Geographic State Distribution"].map((t, i) => (
              <button key={t} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 ${i === 0 ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
            <PortalCard>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Corridor Acquisition Progress (%)</h2>
              <div className="mt-3 space-y-3">
                {[
                  ["Delhi-Mumbai Expressway (Vadodara–Kim Section)", "1385 / 1420.5 Ha (99%)", 99, "bg-emerald-500"],
                  ["Western Dedicated Freight Corridor (Rewari–Palanpur…)", "792 / 980 Ha (81%)", 81, "bg-amber-500"],
                  ["Mumbai-Ahmedabad High Speed Rail (Surat–Navsari…)", "855 / 868.1 Ha (99%)", 99, "bg-emerald-500"],
                  ["Dholera Special Investment Region (Activation Area N…)", "2118 / 2258 Ha (94%)", 94, "bg-emerald-500"],
                  ["Bengaluru-Chennai Expressway (Chittoor Section)", "680 / 1120 Ha (61%)", 61, "bg-red-500"],
                  ["Noida International Airport (Jewar Connectivity Expre…)", "1318 / 1334 Ha (98%)", 98, "bg-emerald-500"],
                ].map(([l, v, pct, c]) => (
                  <div key={l as string}>
                    <div className="flex justify-between gap-2 text-[11px]"><span className="truncate font-medium text-slate-600">{l as string}</span><span className="shrink-0 font-mono text-slate-500">{v as string}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c as string}`} style={{ width: `${pct as number}%` }} /></div>
                  </div>
                ))}
              </div>
            </PortalCard>
            <PortalCard>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Statutory Stage Funnel Conversion</h2>
              <div className="mt-3 space-y-2">
                {funnel.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[11px]">
                    <span className="font-medium text-slate-600">{f.label}</span>
                    <span className="shrink-0 font-mono font-bold text-amber-700">{f.v}</span>
                  </div>
                ))}
              </div>
            </PortalCard>
          </div>
        </>
      )}

      {/* ================= COMPENSATION ================= */}
      {view === "compensation" && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 13 – Macro Financial MIS · Treasury & Award Reconciliation</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Statutory Compensation Assessment & Disbursement Analytics</h1>
              <p className="mt-1 text-sm text-slate-500">Aggregated monetary payouts sanctioned under Section 23/30 of RFCTLARR Act 2013 across notified project corridors.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><ShieldCheck size={13} /> Aggregated · Privacy Compliant</span>
          </div>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total Compensation Assessed", "₹22,180 Cr", "+5.0% vs ₹20,450 Cr prev"],
              ["Total Disbursed (PFMS/Treasury)", "₹17,260.5 Cr", "+12.6% vs ₹15,320 Cr prev"],
              ["Total Pending Treasury Mandates", "₹4,919.5 Cr", "Awaiting LAO verification"],
              ["Overall Disbursement Progress", "77.8% Paid", "+3.9% vs 74.9% prev"],
            ].map(([l, v, s]) => (
              <PortalCard key={l} className="!p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
                <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{v}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s} · 26 Sep 2026</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Monthly Assessed vs Disbursed Disbursement Pipeline</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {compMonths.map(([m, v]) => (
                <div key={m} className="rounded-lg border border-slate-200 bg-slate-900 p-2.5 text-white">
                  <p className="font-mono text-[10px] text-slate-400">{m}</p>
                  <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-400">{v}</p>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full w-4/5 rounded-full bg-emerald-400" /></span>
                </div>
              ))}
            </div>
          </PortalCard>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PortalCard className="!p-0">
              <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">State Compensation Disbursal Performance</h2>
              <TableShell minWidth="min-w-[560px]">
                <thead><tr><Th>State</Th><Th className="text-right">Assessed</Th><Th className="text-right">Paid</Th><Th className="text-right">Pending</Th><Th className="text-right">Disbursed %</Th></tr></thead>
                <tbody>
                  {compStates.map(([s, a, p, pe, pct]) => (
                    <tr key={s as string} className="hover:bg-amber-50/40">
                      <Td className="font-bold text-slate-800">{s as string}</Td>
                      <Td className="text-right font-mono">{a as string}</Td>
                      <Td className="text-right font-mono font-bold text-emerald-700">{p as string}</Td>
                      <Td className="text-right font-mono text-amber-700">{pe as string}</Td>
                      <Td className="text-right font-mono font-bold">{pct as string}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </PortalCard>
            <PortalCard className="!p-0">
              <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">Project Corridor Compensation Breakdown</h2>
              <TableShell minWidth="min-w-[560px]">
                <thead><tr><Th>Corridor</Th><Th className="text-right">Assessed</Th><Th className="text-right">Paid</Th><Th className="text-right">Progress %</Th></tr></thead>
                <tbody>
                  {compCorridors.map(([c, a, p, pct]) => (
                    <tr key={c as string} className="hover:bg-amber-50/40">
                      <Td className="max-w-[240px] truncate font-medium text-slate-700">{c as string}</Td>
                      <Td className="text-right font-mono">{a as string}</Td>
                      <Td className="text-right font-mono font-bold text-emerald-700">{p as string}</Td>
                      <Td className="text-right font-mono font-bold">{pct as string}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </PortalCard>
          </div>
        </>
      )}

      {/* ================= R&R ================= */}
      {view === "rr" && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 14 & 15 – Human Impact & Rehabilitation MIS</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Resettlement & Rehabilitation (R&R) Progress Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Aggregated monitoring of displaced families, resettlement colony construction, and livelihood grant disbursement.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600"><Lock size={13} className="text-emerald-700" /> No Citizen PII Exposed</span>
          </div>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total Affected Families", "31,710", "+2.9% vs 30,800 prev"],
              ["Total Displaced Families", "4,970", "0% vs 4,970 prev"],
              ["R&R Packages Disbursed", "3,896 of 4,970", "+32.9% vs 4,450 prev"],
              ["R&R Sanctioned Outlay", "₹982 Cr (of ₹1245.6 Cr)", "Transitional & livelihood grants"],
            ].map(([l, v, s]) => (
              <PortalCard key={l} className="!p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
                <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{v}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{s} · 26 Sep 2026</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Resettlement Colony Infrastructure & Allotment Audit</h2>
              <p className="font-mono text-[10px] text-slate-500"><span className="text-emerald-700">19 Completed Colonies</span> · <span className="text-amber-700">5 In Construction</span></p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              {[["Colonies Planned", "24 Sites", "Approved in Section 31 Scheme"], ["Colonies Handed Over", "19 Sites", "Occupancy certificates issued"], ["Families Resettled", "3,896", "House plots & pucca houses allocated"], ["Families Pending Resettlement", "1,074", "Temporary rental allowance disbursed"]].map(([l, v, s]) => (
                <div key={l} className="rounded-lg bg-slate-900 p-3 text-white">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
                  <p className="mt-0.5 font-mono text-lg font-black text-emerald-400">{v}</p>
                  <p className="text-[10px] text-slate-400">{s}</p>
                </div>
              ))}
            </div>
          </PortalCard>

          <PortalCard className="mt-5 !p-0">
            <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">Corridor-wise R&R Package Settlement Progress</h2>
            <TableShell minWidth="min-w-[760px]">
              <thead><tr><Th>Project Corridor</Th><Th>Status</Th><Th className="text-right">Sanctioned Packages</Th><Th className="text-right">Disbursed Packages</Th><Th>Progress %</Th><Th className="text-right">Inspect</Th></tr></thead>
              <tbody>
                {rrRows.map(([p, s, sa, di, pct]) => (
                  <tr key={p as string} className="hover:bg-amber-50/40">
                    <Td className="font-medium text-slate-700">{p as string}</Td>
                    <Td><HealthPill s={s as string} /></Td>
                    <Td className="text-right font-mono">{sa as string}</Td>
                    <Td className="text-right font-mono font-bold text-emerald-700">{di as string}</Td>
                    <Td><span className="font-mono text-[11px] font-bold">{pct as string}</span><Bar pct={parseFloat(pct as string)} /></Td>
                    <Td className="text-right"><button className="text-[11px] font-bold text-amber-700">Inspect →</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= POSSESSION ================= */}
      {view === "possession" && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 16 – Physical Corridor Handover</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Cadastral Possession & Right-of-Way (RoW) Clearance Monitoring</h1>
              <p className="mt-1 text-sm text-slate-500">Read-only physical handover tracking to EPC civil contractors, unencumbered corridor verification.</p>
            </div>
            <button onClick={nav("gis")} className="w-fit rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">View Possession GIS Layers</button>
          </div>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[
              ["Possession Completed", "11,142", "12,500 Ha · 81.8%"],
              ["Approved by LAO", "12,026", "Awaiting physical panchnama"],
              ["Pending Handover", "2,824", "No standing crop vacation"],
              ["Possession Blocked", "512", "Acquisition / clearance deficit"],
              ["Court Stay / Contested", "372", "Judicial status quo orders"],
            ].map(([l, v, s]) => (
              <PortalCard key={l} className="!p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
                <p className={`mt-1 font-mono text-xl font-black ${l === "Pending Handover" ? "text-amber-700" : l === "Possession Blocked" || l === "Court Stay / Contested" ? "text-red-600" : "text-emerald-700"}`}>{v}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{s}</p>
              </PortalCard>
            ))}
          </section>

          <PortalCard className="mt-5">
            <div className="mb-1.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Overall Program Handover Schedule vs Projected Delay</h2>
              <p className="font-mono text-[10px] text-slate-500">Target Handover Date: <b>2026-11-30</b> · <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">Avg Corridor Delay: +65 Days</span></p>
            </div>
            <p className="text-[11px] text-slate-500">Contiguous Right-of-Way handed Over to EPC</p>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: "83%" }} /></div>
            <p className="mt-1 text-right font-mono text-[11px] font-bold text-emerald-700">83%</p>
          </PortalCard>

          <PortalCard className="mt-5 !p-0">
            <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">District-wise Cadastral Possession Progress</h2>
            <TableShell minWidth="min-w-[900px]">
              <thead><tr><Th>District</Th><Th>State</Th><Th className="text-right">Total Parcels</Th><Th className="text-right">Handed Over</Th><Th className="text-right">Pending</Th><Th className="text-right">Court Stayed</Th><Th className="text-right">Possession %</Th></tr></thead>
              <tbody>
                {possDistricts.map(([d, s, t, h, p, cs, pct]) => (
                  <tr key={d as string} className="hover:bg-amber-50/40">
                    <Td className="font-bold text-slate-800">{d as string}</Td>
                    <Td className="text-slate-500">{s as string}</Td>
                    <Td className="text-right font-mono">{t as string}</Td>
                    <Td className="text-right font-mono font-bold text-emerald-700">{h as string}</Td>
                    <Td className="text-right font-mono">{p as string}</Td>
                    <Td className="text-right">{(cs as string) === "0" ? <span className="font-mono text-slate-400">0</span> : <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-700">{cs as string}</span>}</Td>
                    <Td className="text-right font-mono font-bold">{pct as string}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= TIMELINE ================= */}
      {view === "timeline" && (
        <>
          <GreetingHeader
            eyebrow="Section 17 – Milestone Adherence Ledger"
            title="Project Milestone Timeline & Statutory Delay Tracking"
            subtitle="Read-only statutory timeline monitoring for Preliminary Notifications, Declarations, and Award deadlines under RFCTLARR Act 2013."
          />
          <PortalCard className="!p-0">
            <TableShell minWidth="min-w-[1100px]">
              <thead><tr><Th>Project Corridor</Th><Th>Statutory Milestone</Th><Th>Legal Provision</Th><Th>Planned Date</Th><Th>Actual / Projected</Th><Th>Current Date</Th><Th>Delay Duration</Th><Th>Status</Th></tr></thead>
              <tbody>
                {milestones.map(([p, m, l, pl, ac, cu, dl, s]) => (
                  <tr key={`${p as string}-${m as string}`} className="hover:bg-amber-50/40">
                    <Td className="max-w-[160px] truncate font-medium text-slate-700">{p as string}</Td>
                    <Td className="max-w-[260px] text-slate-600">{m as string}</Td>
                    <Td className="whitespace-nowrap font-mono text-[10px] text-slate-500">{l as string}</Td>
                    <Td className="whitespace-nowrap font-mono text-slate-500">{pl as string}</Td>
                    <Td className="whitespace-nowrap font-mono font-bold">{ac as string}</Td>
                    <Td className="whitespace-nowrap font-mono text-slate-500">{cu as string}</Td>
                    <Td className={`whitespace-nowrap font-mono text-[11px] font-bold ${(dl as string).startsWith("+") ? "text-red-600" : "text-emerald-700"}`}>{dl as string}</Td>
                    <Td><HealthPill s={s as string} /></Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </PortalCard>
        </>
      )}

      {/* ================= BOTTLENECKS ================= */}
      {view === "bottlenecks" && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 18 – Statutory Exceptions & Obstacles</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Program Exception & Bottleneck Backlog Analysis</h1>
              <p className="mt-1 text-sm text-slate-500">Aggregated delay concentrations, pending Section 15 objections, PFMS treasury rejections, and court stay orders.</p>
            </div>
            <span className="w-fit rounded-lg bg-red-700 px-3 py-1.5 text-xs font-black text-white">2 Critical Bottlenecks</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {backlogCards.map((b) => (
              <PortalCard key={b.t} className={`!p-4 ${b.sev === "CRITICAL" ? "!border-l-4 !border-l-red-500" : b.sev === "HIGH" ? "!border-l-4 !border-l-amber-500" : "!border-l-4 !border-l-sky-500"}`}>
                <p className="flex items-center justify-between text-sm font-bold text-slate-800">{b.t} <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${b.sev === "CRITICAL" ? "bg-red-100 text-red-700" : b.sev === "HIGH" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>{b.sev}</span></p>
                <p className="mt-0.5 text-[11px] text-slate-400">{b.imp}</p>
                <p className="mt-1.5 font-mono text-2xl font-black text-slate-900">{b.n} <span className="text-[11px] font-medium text-slate-400">{b.sub}</span></p>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-900 p-2.5 font-mono text-[10px] text-white">
                  <span><span className="block text-slate-400">Blocked Area</span><b className="text-amber-400">{b.area}</b></span>
                  <span><span className="block text-slate-400">Average Age</span><b className="text-red-400">{b.age}</b></span>
                  <span><span className="block text-slate-400">Case Trend</span><b>{b.trend}</b></span>
                  <span><span className="block text-slate-400">Aging Bracket</span><b>{b.bracket}</b></span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600"><b>Root Cause:</b> {b.cause}</p>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= COMPARISON ================= */}
      {view === "comparison" && (
        <>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 19 – Multi-Corridor Comparator</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Side-by-Side Project Performance & Risk Comparison</h1>
              <p className="mt-1 text-sm text-slate-500">Select up to 4 infrastructure corridors to benchmark acquisition velocity, compensation burn rate, and displacement ratios.</p>
            </div>
            <span className="font-mono text-[11px] text-slate-500">Comparing {compare.length} of 4 max</span>
          </div>
          <PortalCard className="!p-3">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Quick Select Corridors:</p>
            <div className="flex flex-wrap gap-1.5">
              {corridors.map((c) => (
                <button key={c.code} onClick={() => toggleCompare(c.name)} className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${compare.includes(c.name) ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {c.name.split(" (")[0]}{compare.includes(c.name) ? " ×" : ""}
                </button>
              ))}
            </div>
          </PortalCard>
          <PortalCard className="mt-4 !p-0">
            <div className="overflow-x-auto">
              <table className={`text-left ${compared.length <= 2 ? "w-full" : "w-full min-w-[860px]"}`}>
                <thead>
                  <tr className="bg-slate-50">
                    <Th className="min-w-[180px]">Metric Dimension</Th>
                    {compared.map((c) => (
                      <th key={c.code} className="min-w-[220px] border-l border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">{c.name}<br /><span className="font-mono font-medium normal-case text-slate-400">{c.code}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Statutory Health", compared.map((c) => `${c.health}/100 · ${c.status}`)],
                    ["State / District", compared.map((c) => `${c.state} (${c.district})`)],
                    ["Area Required", compared.map((c) => `${c.landR}`)],
                    ["Area Acquired (Sec 19)", compared.map((c) => `${c.landA} Ha`)],
                    ["Compensation Assessed", compared.map((c) => `₹${c.compA}`)],
                    ["Compensation Disbursed", compared.map((c) => `₹${c.compP}`)],
                    ["Possession Progress", compared.map((c) => `${c.poss.toFixed(1)}%`)],
                  ].map(([label, vals]) => (
                    <tr key={label as string} className="hover:bg-amber-50/40">
                      <Td className="font-bold text-slate-600">{label as string}</Td>
                      {(vals as string[]).map((v, i) => (
                        <td key={i} className="border-l border-slate-100 px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">{v}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <Td className="font-bold text-slate-600">Executive Dossier</Td>
                    {compared.map((c) => (
                      <td key={c.code} className="border-l border-slate-100 px-3 py-2.5"><button onClick={nav("reports")} className="text-[11px] font-bold text-amber-700">Open Full Dossier →</button></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </PortalCard>
        </>
      )}

      {/* ================= PREDICTIVE ================= */}
      {view === "predictive" && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 21 – Predictive Intelligence · GatiShakti ML Subsystem</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Predictive Milestone Slippage & Risk Forecasts</h1>
              <p className="mt-1 text-sm text-slate-500">Automated spatial and legal risk indicators estimating probability of statutory timeline slippages and land acquisition delays.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white"><Sparkles size={13} /> Predictive Indicator</span>
          </div>
          <div className="space-y-4">
            {forecasts.map((f) => (
              <PortalCard key={f.id} className="!p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-bold text-slate-900"><span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-800">{f.id}</span>{f.title}</p>
                  <p className="flex flex-wrap gap-1.5 font-mono text-[10px] font-black"><span className={`rounded px-1.5 py-0.5 ${f.risk.startsWith("HIGH") ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{f.risk}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{f.delay}</span></p>
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-2 rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-white sm:grid-cols-3">
                  <span><span className="block text-slate-400">Model / Source</span><b>{f.model}</b></span>
                  <span><span className="block text-slate-400">Generated At</span><b>{f.gen}</b></span>
                  <span><span className="block text-slate-400">Affected Jurisdiction</span><b>{f.jur}</b></span>
                </div>
                <p className="mt-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Relevant Contributing Factors (Model Parameters):</p>
                <div className="mt-1.5 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {f.factors.map((x) => (
                    <p key={x} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600">◆ {x}</p>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-col gap-2 rounded-lg bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] leading-relaxed text-slate-700"><b>Recommended Decision-Maker Escalation:</b> {f.esc}</p>
                  <button onClick={nav("corridors")} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white">Inspect Corridor Dossier →</button>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= REPORTS ================= */}
      {view === "reports" && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 22 – Official MIS Briefs · Cabinet Secretariat Format</p>
              <h1 className="mt-1 font-serif text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Executive MIS Reports & Statutory Briefs Register</h1>
              <p className="mt-1 text-sm text-slate-500">Read, generate, and export official ministerial briefs across Land Acquisition, Compensation, R&R, and Possession timelines.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-800">Export Permission: AUTHORIZED</span>
          </div>

          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
            {["All MIS Reports", "Project Progress", "Land Acquisition", "Compensation", "R&R", "Possession", "Timeline", "Geographic Summary"].map((t) => (
              <button key={t} onClick={() => setReportTab(t)} className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 ${reportTab === t ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{t}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
            <PortalCard className="!p-0">
              <p className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700">Available Official Report Definitions ({reports.filter((r) => reportTab === "All MIS Reports" || r.c === reportTab).length}) <span className="float-right font-mono text-[10px] font-medium normal-case text-slate-400">Scope: {scope} | Format: PDF/XLSX</span></p>
              <div>
                {reports.filter((r) => reportTab === "All MIS Reports" || r.c === reportTab).map((r) => (
                  <div key={r.t} className="flex flex-col gap-2 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{r.t} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-black text-slate-600">{r.f}</span></p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{r.d}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">Category: <b className="text-slate-600">{r.c}</b> · Frequency: <b className="text-slate-600">{r.fr}</b> · Updated: <b className="text-slate-600">{r.u}</b></p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Eye size={13} className="text-amber-600" /> View</button>
                      <button className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"><Download size={13} /> Export</button>
                    </div>
                  </div>
                ))}
              </div>
            </PortalCard>

            <PortalCard>
              <h2 className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700">Official Report Dossier Preview <button onClick={() => window.print()} className="inline-flex items-center gap-1 text-[11px] text-amber-700"><Printer size={13} /> Print</button></h2>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-900 p-4 text-white">
                <p className="font-mono text-[10px] font-bold tracking-wider text-amber-400">GOVERNMENT OF INDIA — LAND GOVERNANCE DSS</p>
                <p className="mt-1.5 text-sm font-bold leading-snug">National Infrastructure Land Acquisition Performance Dossier</p>
                <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-300">
                  <p>Generated Date: <b className="text-white">26 Sep 2026, 06:00 AM</b></p>
                  <p>Selected Scope: <b className="text-white">{scope} Jurisdictional Scope</b></p>
                  <p>Reporting Window: <b className="text-white">FY 2026-27</b></p>
                  <p>Data Source Timestamp: <b className="text-white">26 Sep 2026, 11:34 AM</b></p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Certified Program Figures:</p>
              <div className="mt-1.5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 font-mono text-[11px]">
                {[["Total Projects Covered:", "10", ""], ["Required Footprint:", "15939.7 Ha", ""], ["Physically Acquired:", "12823.2 Ha (80.4%)", "text-emerald-700"], ["Compensation Disbursed:", "₹17260.5 Cr", "text-emerald-700"], ["Affected Families:", "31,020", ""], ["Delayed Corridors:", "3 Projects", "text-red-600"]].map(([k, v, c]) => (
                  <p key={k as string} className="flex justify-between gap-2"><span className="font-sans text-slate-500">{k as string}</span><b className={c as string}>{v as string}</b></p>
                ))}
              </div>
              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600"><Download size={14} /> Download PDF Dossier (2840 KB)</button>
            </PortalCard>
          </div>
        </>
      )}

      {/* ================= ALERTS ================= */}
      {view === "alerts" && (
        <>
          <GreetingHeader
            eyebrow="Section 24 – High-Level Escalation Radar"
            title="High-Level Executive Alerts & Statutory Obstructions"
            subtitle="Filtered exclusively for high-level programmatic risks (delays, stay concentrations, compensation backlogs). Low-level system logs filtered out."
          />
          <div className="space-y-3">
            {alerts.map((a) => (
              <PortalCard key={a.t} className={`!p-4 ${a.sev === "CRITICAL" ? "!border-red-200 !bg-red-50/40" : a.sev === "WARNING" ? "!border-amber-200 !bg-amber-50/40" : ""}`}>
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-2.5">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.sev === "CRITICAL" ? "bg-red-100 text-red-700" : a.sev === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {a.sev === "INFO" ? <CircleCheck size={15} /> : <TriangleAlert size={15} />}
                    </span>
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">{a.t} <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${a.sev === "CRITICAL" ? "bg-red-700 text-white" : a.sev === "WARNING" ? "bg-amber-500 text-white" : "bg-blue-600 text-white"}`}>{a.sev}</span></p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.d}</p>
                      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-slate-400">{a.meta}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="text-[11px] font-semibold text-slate-400 hover:text-slate-700">Mark Read</button>
                    <button onClick={nav("corridors")} className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-amber-400">Inspect Corridor →</button>
                  </div>
                </div>
              </PortalCard>
            ))}
          </div>
        </>
      )}

      {/* ================= PROFILE ================= */}
      {view === "profile" && (
        <>
          <GreetingHeader
            eyebrow="Executive / Decision Maker • Read-Only Mode Enforced"
            title={`${OFFICER.title}`}
            subtitle={OFFICER.designation}
          />
          <div className="mx-auto w-full max-w-3xl">
            <PortalCard>
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xl font-black text-white">VS</span>
                <div>
                  <p className="inline-block rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-amber-800">Executive / Decision Maker</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{OFFICER.title}</p>
                  <p className="text-xs text-slate-500">{OFFICER.designation}</p>
                </div>
              </div>
            </PortalCard>

            <PortalCard className="mt-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Jurisdictional Access & Authorization Profile</h2>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  ["Official Role", OFFICER.level, ""],
                  ["Access Scope", "National (All Jurisdictions)", "text-amber-600"],
                  ["Assigned Ministry / Department", "Department of Land Resources & PM GatiShakti Cell", ""],
                  ["Jurisdictional Coverage", "National (All States & Union Territories)", ""],
                  ["Last Active Session", "26 Sep 2026, 09:15 AM", "font-mono"],
                  ["Statutory Mandate", "RFCTLARR Act 2013 & PM GatiShakti NMP", "text-emerald-700"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-lg bg-slate-900 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{l as string}</p>
                    <p className={`mt-0.5 text-xs font-bold text-white ${c as string}`}>{v as string}</p>
                  </div>
                ))}
              </div>
            </PortalCard>

            <PortalCard className="mt-4">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700"><Lock size={13} className="text-emerald-700" /> Section 26 — Read-Only Policy & Functional Boundary Audit</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">By statutory design, the Executive / Decision Maker interface is strictly configured for macro monitoring, MIS digest review, and spatial analytics. Operational data-entry and transactional workflow controls are physically decoupled:</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-red-700">Prohibited in this window:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-slate-600">
                    <li>Create or edit acquisition proposals</li>
                    <li>OCR document corrections</li>
                    <li>Field verification & GPS boundary recording</li>
                    <li>Section 23 award approvals & rejections</li>
                    <li>Direct citizen land record edits</li>
                    <li>GIS cadastral geometry alterations</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Enabled decision powers:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-slate-600">
                    <li>Pan-India corridor health monitoring</li>
                    <li>Disbursement velocity & treasury reconciliation</li>
                    <li>Spatial GIS cadastral overlay inspection</li>
                    <li>Section 18 bottleneck exception analysis</li>
                    <li>Machine learning predictive slippage forecasts</li>
                    <li>Cabinet briefing dossier generation & export</li>
                  </ul>
                </div>
              </div>
            </PortalCard>
          </div>
        </>
      )}

      {/* Footer role boundary */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5 text-[11px] leading-relaxed text-slate-500">
        <p className="flex items-center gap-1.5 font-bold text-amber-700"><Lock size={13} /> Strict Role Boundary</p>
        <p className="mt-1">Monitoring & Decision Support window. Operational proposal creation, OCR editing, and field approvals are restricted to field portals. This window is read-only — no transactional controls.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button onClick={nav("reports")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><FileBarChart size={12} /> MIS Reports & Briefs</button>
          <button onClick={nav("alerts")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-50"><Bell size={12} /> Executive Alerts</button>
          <button onClick={nav("dashboard")} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 font-bold text-white">National Dossier <ArrowRight size={12} /></button>
        </div>
      </div>
    </PortalLayout>
  );
}

export default ExecutivePortal;
