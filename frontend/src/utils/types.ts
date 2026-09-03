export type Language = 'en' | 'hi';

export interface PersonaInfo {
  id: string;
  roleCode: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  badge: string;
  badgeHi: string;
  description: string;
  descriptionHi: string;
  keyResponsibilities: string[];
  keyResponsibilitiesHi: string[];
  primaryEntity: string;
  primaryEntityHi: string;
  accentColor: string;
}

export interface KeyModuleInfo {
  id: string;
  title: string;
  titleHi: string;
  tag: string;
  tagHi: string;
  description: string;
  descriptionHi: string;
  details: string[];
  detailsHi: string[];
  icon: string;
  sampleMetric: string;
  sampleMetricLabel: string;
  sampleMetricLabelHi: string;
}

export interface ProblemSolutionStep {
  stepNumber: string;
  title: string;
  titleHi: string;
  tag: string;
  tagHi: string;
  points: string[];
  pointsHi: string[];
  icon: string;
  statusBadge: string;
  statusBadgeHi: string;
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
