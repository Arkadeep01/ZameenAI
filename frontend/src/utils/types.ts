export type Language = 'en' | 'hi' | 'bn';

export interface PersonaInfo {
  id: string;
  roleCode: string;
  title: string;
  titleHi: string;
  titleBn: string;
  subtitle: string;
  subtitleHi: string;
  subtitleBn: string;
  badge: string;
  badgeHi: string;
  badgeBn: string;
  description: string;
  descriptionHi: string;
  descriptionBn: string;
  keyResponsibilities: string[];
  keyResponsibilitiesHi: string[];
  keyResponsibilitiesBn: string[];
  primaryEntity: string;
  primaryEntityHi: string;
  primaryEntityBn: string;
  accentColor: string;
}

export interface KeyModuleInfo {
  id: string;
  title: string;
  titleHi: string;
  titleBn: string;
  tag: string;
  tagHi: string;
  tagBn: string;
  description: string;
  descriptionHi: string;
  descriptionBn: string;
  details: string[];
  detailsHi: string[];
  detailsBn: string[];
  icon: string;
  sampleMetric: string;
  sampleMetricLabel: string;
  sampleMetricLabelHi: string;
  sampleMetricLabelBn: string;
}

export interface ProblemSolutionStep {
  stepNumber: string;
  title: string;
  titleHi: string;
  titleBn: string;
  tag: string;
  tagHi: string;
  tagBn: string;
  points: string[];
  pointsHi: string[];
  pointsBn: string[];
  icon: string;
  statusBadge: string;
  statusBadgeHi: string;
  statusBadgeBn: string;
  color: string;
}

export interface LandRecordStatus {
  notificationId: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  khasraNo: string;
  landownerName: string;
  projectAffiliation: string;
  notifiedAreaHectares: number;
  currentStage: 'Sec 11(1) Notified' | 'Joint Measurement Survey' | 'Sec 19 Declaration' | 'Award Inquiry' | 'Compensation Disbursed';
  stageIndex: number; // 1 to 5
  compensationCalculated: string;
  solatiumComponent: string;
  dbtPaymentStatus: 'Processed via PFMS' | 'Under Bank Verification' | 'Sanction Order Issued';
  utrReference: string;
  dateNotified: string;
  disputeFlag: boolean;
}
