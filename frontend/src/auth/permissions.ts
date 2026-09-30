/**
 * Canonical RBAC mirror (frontend).
 *
 * Single vocabulary: MODULE.ACTION — mirrors backend/app/core/permissions.py.
 * DO NOT invent frontend-only permission strings. Backend is authoritative;
 * this file exists for hide/disable UX + parity tests only.
 */

export type CanonicalRole =
  | "system_admin"
  | "pia"
  | "field_officer"
  | "desk_validator"
  | "approver"
  | "executive"
  | "citizen";

export const ALL_ROLES: CanonicalRole[] = [
  "system_admin",
  "pia",
  "field_officer",
  "desk_validator",
  "approver",
  "executive",
  "citizen",
];

/** Frontend display alias → canonical role (backend/app/core/roles.py). */
const ROLE_ALIASES: Record<string, CanonicalRole> = {
  SYSTEM_ADMIN: "system_admin",
  PIA: "pia",
  FIELD_OFFICER: "field_officer",
  FIELD: "field_officer",
  LAO: "desk_validator",
  DESK_VALIDATOR: "desk_validator",
  APPROVER: "approver",
  CALA: "approver",
  "CALA/DM": "approver",
  DM: "approver",
  EXECUTIVE: "executive",
  EXEC: "executive",
  CITIZEN: "citizen",
};

export function normalizeRole(raw: string): CanonicalRole | string {
  if (!raw) return raw;
  if ((ALL_ROLES as string[]).includes(raw)) return raw as CanonicalRole;
  return ROLE_ALIASES[raw.toUpperCase()] ?? raw;
}

/** Canonical permission strings (subset used by UI gates; full set server-side). */
export const PERMISSIONS = {
  LAND_RECORD_READ: "LAND_RECORD.READ",
  LAND_RECORD_CREATE: "LAND_RECORD.CREATE",
  LAND_RECORD_UPDATE: "LAND_RECORD.UPDATE",
  LAND_RECORD_VALIDATE: "LAND_RECORD.VALIDATE",
  LAND_RECORD_APPROVE: "LAND_RECORD.APPROVE",
  LAND_RECORD_REJECT: "LAND_RECORD.REJECT",
  DOCUMENT_READ: "DOCUMENT.READ",
  DOCUMENT_CREATE: "DOCUMENT.CREATE",
  DOCUMENT_UPLOAD: "DOCUMENT.UPLOAD",
  DOCUMENT_UPDATE: "DOCUMENT.UPDATE",
  DOCUMENT_DELETE: "DOCUMENT.DELETE",
  DOCUMENT_DOWNLOAD: "DOCUMENT.DOWNLOAD",
  PROJECT_READ: "PROJECT.READ",
  PROJECT_WRITE: "PROJECT.WRITE",
  RECORD_FREEZE: "RECORD.FREEZE",
  RECORD_UNFREEZE: "RECORD.UNFREEZE",
  VALIDATION_REVIEW: "VALIDATION.REVIEW",
  CORRECTION_REQUEST: "CORRECTION.REQUEST",
  FIELD_VERIFY: "FIELD.VERIFY",
  DIGITIZATION_RUN: "DIGITIZATION.RUN",
  DIGITIZATION_READ: "DIGITIZATION.READ",
  OCR_READ: "OCR.READ",
  OCR_PROCESS: "OCR.PROCESS",
  OCR_UPDATE: "OCR.UPDATE",
  OCR_VALIDATE: "OCR.VALIDATE",
  EXTRACTION_READ: "EXTRACTION.READ",
  EXTRACTION_UPDATE: "EXTRACTION.UPDATE",
  FIELD_VERIFICATION_READ: "FIELD_VERIFICATION.READ",
  FIELD_VERIFICATION_CREATE: "FIELD_VERIFICATION.CREATE",
  FIELD_VERIFICATION_UPDATE: "FIELD_VERIFICATION.UPDATE",
  FIELD_VERIFICATION_SUBMIT: "FIELD_VERIFICATION.SUBMIT",
  FIELD_VERIFICATION_APPROVE: "FIELD_VERIFICATION.APPROVE",
  HITL_REVIEW: "HITL.REVIEW",
  WORKFLOW_READ: "WORKFLOW.READ",
  WORKFLOW_ASSIGN: "WORKFLOW.ASSIGN",
  WORKFLOW_APPROVE: "WORKFLOW.APPROVE",
  WORKFLOW_REJECT: "WORKFLOW.REJECT",
  WORKFLOW_RETURN: "WORKFLOW.RETURN",
  ACQUISITION_READ: "ACQUISITION.READ",
  ACQUISITION_CREATE: "ACQUISITION.CREATE",
  ACQUISITION_UPDATE: "ACQUISITION.UPDATE",
  ACQUISITION_SUBMIT: "ACQUISITION.SUBMIT",
  ACQUISITION_APPROVE: "ACQUISITION.APPROVE",
  ACQUISITION_REJECT: "ACQUISITION.REJECT",
  COMPENSATION_READ: "COMPENSATION.READ",
  COMPENSATION_CALCULATE: "COMPENSATION.CALCULATE",
  COMPENSATION_APPROVE: "COMPENSATION.APPROVE",
  COMPENSATION_PAYMENT_REQUEST: "COMPENSATION.PAYMENT_REQUEST",
  NOTICE_READ: "NOTICE.READ",
  NOTICE_ISSUE: "NOTICE.ISSUE",
  POSSESSION_READ: "POSSESSION.READ",
  POSSESSION_APPROVE: "POSSESSION.APPROVE",
  OBJECTION_CREATE: "OBJECTION.CREATE",
  OBJECTION_READ: "OBJECTION.READ",
  OBJECTION_RESOLVE: "OBJECTION.RESOLVE",
  CONTESTED_FLAG: "CONTESTED.FLAG",
  CONTESTED_READ: "CONTESTED.READ",
  CONTESTED_RESOLVE: "CONTESTED.RESOLVE",
  OWN_RECORD_READ: "OWN.RECORD.READ",
  OWN_STATUS_READ: "OWN.STATUS.READ",
  RNR_READ: "RNR.READ",
  RNR_CREATE: "RNR.CREATE",
  RNR_UPDATE: "RNR.UPDATE",
  RNR_APPROVE: "RNR.APPROVE",
  GIS_READ: "GIS.READ",
  GIS_UPDATE: "GIS.UPDATE",
  GIS_EXPORT: "GIS.EXPORT",
  REPORT_READ: "REPORT.READ",
  REPORT_CREATE: "REPORT.CREATE",
  REPORT_EXPORT: "REPORT.EXPORT",
  DASHBOARD_READ: "DASHBOARD.READ",
  ANALYTICS_READ: "ANALYTICS.READ",
  PREDICTIVE_READ: "PREDICTIVE.READ",
  AUDIT_READ: "AUDIT.READ",
  USER_READ: "USER.READ",
  USER_CREATE: "USER.CREATE",
  USER_UPDATE: "USER.UPDATE",
  USER_DISABLE: "USER.DISABLE",
  ROLE_READ: "ROLE.READ",
  ROLE_CREATE: "ROLE.CREATE",
  ROLE_UPDATE: "ROLE.UPDATE",
  PERMISSION_READ: "PERMISSION.READ",
  PERMISSION_ASSIGN: "PERMISSION.ASSIGN",
  SYSTEM_CONFIGURE: "SYSTEM.CONFIGURE",
  EXPORT_DATA: "EXPORT.DATA",
  GRIEVANCE_CREATE: "GRIEVANCE.CREATE",
  GRIEVANCE_READ: "GRIEVANCE.READ",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Portal home per canonical role (used after login). */
export const ROLE_HOME: Record<CanonicalRole, string> = {
  system_admin: "/admin",
  pia: "/pia",
  field_officer: "/field-officer",
  desk_validator: "/desk-validator",
  approver: "/approver",
  executive: "/executive",
  citizen: "/citizen/dashboard",
};

/**
 * Resolve the landing route for an untrusted role string.
 *
 * Normalises display aliases and returns undefined for anything that is not a
 * canonical role, so navigation never falls back to another role's portal.
 */
export function roleHome(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  const canonical = isCanonicalRole(role) ? role : ROLE_ALIASES[role.toUpperCase()];
  return canonical ? ROLE_HOME[canonical] : undefined;
}

function isCanonicalRole(role: string): role is CanonicalRole {
  return (ALL_ROLES as string[]).includes(role);
}
