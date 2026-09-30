import { useQuery } from "@tanstack/react-query";
import axios from "axios";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

export type StageStatus =
  | "COMPLETED"
  | "CURRENT"
  | "UPCOMING"
  | "ACTION_REQUIRED"
  | "ON_HOLD";

export interface StageVerificationPoint {
  id: string;
  label: string;
  verified: boolean;
  timestamp?: string;
}

export interface StageDocument {
  id: string;
  title: string;
  type: string;
  issuedDate: string;
  fileSize?: string;
  authority: string;
  downloadUrl?: string;
}

export interface CitizenActionItem {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  buttonText: string;
  actionUrl: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
}

export interface AcquisitionStage {
  id: string;
  stageNumber: number;
  title: string;
  status: StageStatus;
  date?: string;
  description: string;
  statutoryReference?: {
    act: string;
    section: string;
    summary: string;
    gazetteRef?: string;
  };
  verificationPoints?: StageVerificationPoint[];
  documents?: StageDocument[];
  citizenAction?: CitizenActionItem;
  whatHappensNext?: string;
}

export interface AcquisitionCase {
  id: string;
  projectTitle: string;
  acquiringAuthority: string;
  khasraNumber: string;
  khataNumber?: string;
  surveyNumber?: string;
  area: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  currentStageName: string;
  statusLabel: string;
  startDate: string;
  lastUpdated: string;
  stages: AcquisitionStage[];
}

/* ========================================================================== */
/* MOCK ACQUISITION CASES (ISOLATED DATA LAYER)                               */
/* ========================================================================== */

export const MOCK_ACQUISITION_CASES: AcquisitionCase[] = [
  {
    id: "ACQ-2026-00182",
    projectTitle: "Eastern Freight Corridor",
    acquiringAuthority: "Competent Authority Land Acquisition (CALA) / Ministry of Railways",
    khasraNumber: "Khasra 184/2",
    khataNumber: "KH-9912",
    surveyNumber: "CAD-IND-1842",
    area: "0.84 Acre",
    village: "Singur",
    tehsil: "Singur",
    district: "Hooghly",
    state: "West Bengal",
    currentStageName: "Compensation Assessment",
    statusLabel: "In Progress",
    startDate: "12 Jan 2026",
    lastUpdated: "18 Sep 2026",
    stages: [
      {
        id: "stg-1",
        stageNumber: 1,
        title: "Proposal & Corridor Alignment",
        status: "COMPLETED",
        date: "12 Jan 2026",
        description:
          "Infrastructure corridor alignment proposed by Dedicated Freight Corridor Corporation and approved by the State Alignment Committee.",
        statutoryReference: {
          act: "National Infrastructure Corridor Act",
          section: "Section 3(1)",
          summary: "Approval of preliminary corridor alignment and right-of-way demarcation.",
          gazetteRef: "EFC/ALN/2026-001",
        },
        verificationPoints: [
          { id: "vp-1-1", label: "Alignment survey verified by revenue surveyor", verified: true, timestamp: "12 Jan 2026" },
          { id: "vp-1-2", label: "Cadastral map superposition completed", verified: true, timestamp: "14 Jan 2026" },
          { id: "vp-1-3", label: "Environmental and Social Impact preliminary review", verified: true, timestamp: "18 Jan 2026" },
        ],
        documents: [
          {
            id: "doc-aln-01",
            title: "Corridor Alignment Approval Order",
            type: "Official Order",
            issuedDate: "12 Jan 2026",
            fileSize: "1.4 MB",
            authority: "State Infrastructure Committee",
          },
        ],
      },
      {
        id: "stg-2",
        stageNumber: 2,
        title: "Land Identification & Joint Cadastral Survey",
        status: "COMPLETED",
        date: "04 Feb 2026",
        description:
          "Revenue team and project engineers completed high-precision DGPS boundary survey and matched parcel records with State Cadastre.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Section 4",
          summary: "Mandatory Social Impact Assessment & Land Demarcation Survey.",
          gazetteRef: "SIA/HGL/2026-084",
        },
        verificationPoints: [
          { id: "vp-2-1", label: "High-precision DGPS rover survey completed", verified: true, timestamp: "04 Feb 2026" },
          { id: "vp-2-2", label: "Titleholder roster matched with verified Khatauni", verified: true, timestamp: "06 Feb 2026" },
          { id: "vp-2-3", label: "Parcel area finalized at 0.84 Acre", verified: true, timestamp: "08 Feb 2026" },
        ],
        documents: [
          {
            id: "doc-jms-02",
            title: "Joint Measurement Survey (JMS) Extract",
            type: "Survey Extract",
            issuedDate: "04 Feb 2026",
            fileSize: "2.1 MB",
            authority: "District Directorate of Land Records",
          },
        ],
      },
      {
        id: "stg-3",
        stageNumber: 3,
        title: "Section 11(1) Preliminary Gazette Notification",
        status: "COMPLETED",
        date: "10 Mar 2026",
        description:
          "Preliminary notification published in official state gazette and local newspapers notifying intent of acquisition for public purpose.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Section 11(1)",
          summary: "Publication of preliminary notification of intention to acquire land for public purpose.",
          gazetteRef: "WB-GZT-2026-N11-091",
        },
        verificationPoints: [
          { id: "vp-3-1", label: "Published in West Bengal Official Gazette", verified: true, timestamp: "10 Mar 2026" },
          { id: "vp-3-2", label: "Published in two widely circulated local daily newspapers", verified: true, timestamp: "12 Mar 2026" },
          { id: "vp-3-3", label: "Public notice affixed at Singur Gram Panchayat notice board", verified: true, timestamp: "14 Mar 2026" },
        ],
        documents: [
          {
            id: "doc-gzt-03",
            title: "Gazette Notification u/s 11(1)",
            type: "Gazette Notification",
            issuedDate: "10 Mar 2026",
            fileSize: "840 KB",
            authority: "CALA / Ministry of Railways",
          },
        ],
      },
      {
        id: "stg-4",
        stageNumber: 4,
        title: "Verification of Rights & Hearing of Objections",
        status: "COMPLETED",
        date: "28 Apr 2026",
        description:
          "Statutory 60-day inquiry conducted by CALA to adjudicate landowner claims, objections on area demarcation, and ownership validation.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Section 15",
          summary: "Hearing of objections regarding public purpose, suitability of land, and boundary demarcations.",
          gazetteRef: "OBJ-HGL-2026-118",
        },
        verificationPoints: [
          { id: "vp-4-1", label: "Hearing notice served to verified titleholder", verified: true, timestamp: "28 Apr 2026" },
          { id: "vp-4-2", label: "Title deed and non-encumbrance certificate verified", verified: true, timestamp: "02 May 2026" },
          { id: "vp-4-3", label: "Inquiry report submitted by Tehsildar to Collector", verified: true, timestamp: "15 May 2026" },
        ],
        documents: [
          {
            id: "doc-obj-04",
            title: "Section 15 Objection Hearing Report",
            type: "Inquiry Report",
            issuedDate: "28 Apr 2026",
            fileSize: "1.2 MB",
            authority: "CALA Office, Hooghly",
          },
        ],
      },
      {
        id: "stg-5",
        stageNumber: 5,
        title: "Section 19 Declaration of Acquisition",
        status: "COMPLETED",
        date: "15 Jun 2026",
        description:
          "Final declaration published by the appropriate government declaring that notified parcel is needed for public corridor construction.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Section 19(1)",
          summary: "Publication of Declaration and Summary of Rehabilitation and Resettlement.",
          gazetteRef: "WB-GZT-2026-D19-044",
        },
        verificationPoints: [
          { id: "vp-5-1", label: "Final statutory declaration published in Official Gazette", verified: true, timestamp: "15 Jun 2026" },
          { id: "vp-5-2", label: "R&R Scheme approved by Commissioner of Rehabilitation", verified: true, timestamp: "18 Jun 2026" },
          { id: "vp-5-3", label: "Land ownership officially designated for public vesting", verified: true, timestamp: "22 Jun 2026" },
        ],
        documents: [
          {
            id: "doc-dec-05",
            title: "Section 19 Statutory Declaration",
            type: "Final Declaration",
            issuedDate: "15 Jun 2026",
            fileSize: "920 KB",
            authority: "Government of West Bengal & Ministry of Railways",
          },
        ],
      },
      {
        id: "stg-6",
        stageNumber: 6,
        title: "Compensation Assessment",
        status: "CURRENT",
        date: "18 Sep 2026",
        description:
          "Valuation officers are finalizing circle rate multipliers, 100% solatium, and statutory 12% interest for Parcel Khasra 184/2.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Sections 26 to 30",
          summary: "Determination of market value of land, computation of solatium, and award inquiry by Collector.",
          gazetteRef: "VAL-HGL-2026-082",
        },
        verificationPoints: [
          { id: "vp-6-1", label: "Registered circle rate valuation applied (₹45,00,000 / Acre)", verified: true, timestamp: "18 Sep 2026" },
          { id: "vp-6-2", label: "Rural multiplication factor verified (1.25x multiplier)", verified: true, timestamp: "20 Sep 2026" },
          { id: "vp-6-3", label: "100% Solatium factor computed under Section 30", verified: true, timestamp: "22 Sep 2026" },
          { id: "vp-6-4", label: "Aadhaar-seeded bank account for PFMS DBT transfer", verified: false },
        ],
        citizenAction: {
          id: "act-bank-01",
          title: "Bank Account DBT Verification Required",
          description: "Verify your Aadhaar-seeded bank account to enable direct electronic transfer of compensation via PFMS without office visits.",
          deadline: "28 Sep 2026",
          buttonText: "Review Now",
          actionUrl: "/citizen/compensation",
          urgency: "HIGH",
        },
        whatHappensNext:
          "Once the assessment is finalized and your bank account is verified, an official notice of award will be dispatched and electronic payment initiated through PFMS.",
        documents: [
          {
            id: "doc-val-06",
            title: "Provisional Valuation Assessment Worksheet",
            type: "Valuation Worksheet",
            issuedDate: "18 Sep 2026",
            fileSize: "680 KB",
            authority: "Competent Authority Land Acquisition (CALA)",
          },
        ],
      },
      {
        id: "stg-7",
        stageNumber: 7,
        title: "Award Disbursal & Direct Benefit Transfer",
        status: "UPCOMING",
        description:
          "Official award pronouncement u/s 31 and direct electronic disbursal of compensation into the titleholder's bank account via PFMS.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Sections 31 & 77",
          summary: "Awards of the Collector and payment of compensation into bank accounts.",
        },
        verificationPoints: [
          { id: "vp-7-1", label: "Final award signed by Collector", verified: false },
          { id: "vp-7-2", label: "Public Financial Management System (PFMS) mandate approved", verified: false },
          { id: "vp-7-3", label: "Direct bank credit and SMS confirmation", verified: false },
        ],
      },
      {
        id: "stg-8",
        stageNumber: 8,
        title: "Possession & Corridor Handover",
        status: "UPCOMING",
        description:
          "Collector takes physical possession of the acquired land parcel after full payment has been credited to the landowner.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Section 38",
          summary: "Power to take possession of land only after full payment of compensation.",
        },
        verificationPoints: [
          { id: "vp-8-1", label: "Payment verification before possession certificate", verified: false },
          { id: "vp-8-2", label: "Execution of Panchnama and possession memo", verified: false },
          { id: "vp-8-3", label: "Revenue record mutation in favor of acquiring agency", verified: false },
        ],
      },
      {
        id: "stg-9",
        stageNumber: 9,
        title: "Rehabilitation & Resettlement (R&R)",
        status: "UPCOMING",
        description:
          "Disbursal of secondary rehabilitation grants, transportation allowance, and livelihood support under the Second Schedule.",
        statutoryReference: {
          act: "RFCTLARR Act, 2013",
          section: "Second Schedule",
          summary: "Elements of Rehabilitation and Resettlement entitlements for affected families.",
        },
        verificationPoints: [
          { id: "vp-9-1", label: "R&R annuity / one-time resettlement grant disbursal", verified: false },
          { id: "vp-9-2", label: "Livelihood skill training and certificate issuance", verified: false },
        ],
      },
    ],
  },

  {
    id: "ACQ-2026-00144",
    projectTitle: "National Highway NH-31 Widening & Expressway Link",
    acquiringAuthority: "Competent Authority Land Acquisition (CALA) / NHAI",
    khasraNumber: "Khasra 342/2",
    khataNumber: "KH-9914",
    surveyNumber: "CAD-IND-3422",
    area: "2.00 Acres",
    village: "Haripur",
    tehsil: "Sadar",
    district: "Varanasi",
    state: "Uttar Pradesh",
    currentStageName: "Compensation Assessment",
    statusLabel: "In Progress",
    startDate: "10 Feb 2026",
    lastUpdated: "10 Sep 2026",
    stages: [
      {
        id: "nh-1",
        stageNumber: 1,
        title: "Highway Alignment Approval",
        status: "COMPLETED",
        date: "10 Feb 2026",
        description: "National Highway 4-lane widening corridor approved by Ministry of Road Transport & Highways.",
        verificationPoints: [
          { id: "nh-vp-1", label: "Feasibility and tollway alignment clearance", verified: true },
        ],
      },
      {
        id: "nh-2",
        stageNumber: 2,
        title: "Cadastral Survey & Demarcation",
        status: "COMPLETED",
        date: "14 Mar 2026",
        description: "DGPS demarcation of 2.00 Acres in Haripur village completed by Sadar Tehsil revenue inspectors.",
        verificationPoints: [
          { id: "nh-vp-2", label: "Boundary stones positioned along highway buffer", verified: true },
        ],
      },
      {
        id: "nh-3",
        stageNumber: 3,
        title: "Section 11(1) Gazette Publication",
        status: "COMPLETED",
        date: "10 Sep 2026",
        description: "Section 11(1) notification published in UP Gazette for Varanasi-Ghazipur corridor package.",
        verificationPoints: [
          { id: "nh-vp-3", label: "Gazette notification published in Hindi and English", verified: true },
        ],
      },
      {
        id: "nh-4",
        stageNumber: 4,
        title: "Compensation Assessment",
        status: "CURRENT",
        date: "10 Sep 2026",
        description: "Circle rate multiplier calculation and tree/structure valuation underway by Varanasi Revenue Office.",
        citizenAction: {
          id: "nh-act-1",
          title: "Bank Verification Required",
          description: "Aadhaar seeded bank account verification needed for NHAI DBT transfer.",
          deadline: "30 Sep 2026",
          buttonText: "Verify Now",
          actionUrl: "/citizen/compensation",
          urgency: "HIGH",
        },
      },
      {
        id: "nh-5",
        stageNumber: 5,
        title: "Award Disbursal",
        status: "UPCOMING",
        description: "Disbursal of compensation into verified bank account.",
      },
      {
        id: "nh-6",
        stageNumber: 6,
        title: "Possession & Road Handover",
        status: "UPCOMING",
        description: "Transfer of right-of-way to National Highways Authority of India.",
      },
    ],
  },
];

/* ========================================================================== */
/* HOOKS                                                                      */
/* ========================================================================== */

/**
 * Hook to retrieve all acquisition cases for the authenticated citizen.
 * No backend route serves this yet — serve mock cases directly
 * (no HTTP call; /api/citizen/* does not exist).
 */
export function useCitizenAcquisitionCases() {
  return useQuery<AcquisitionCase[]>({
    queryKey: ["citizen", "acquisition-cases"],
    queryFn: async () => MOCK_ACQUISITION_CASES,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to retrieve a specific acquisition case by ID.
 */
export function useCitizenAcquisitionCase(caseId?: string) {
  return useQuery<AcquisitionCase | null>({
    queryKey: ["citizen", "acquisition-case", caseId],
    queryFn: async () => {
      if (!caseId) {
        return MOCK_ACQUISITION_CASES[0];
      }
      const found = MOCK_ACQUISITION_CASES.find((c) => c.id === caseId);
      return found || MOCK_ACQUISITION_CASES[0];
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}
