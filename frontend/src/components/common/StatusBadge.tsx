import React from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  CircleDot,
  Circle,
  PauseCircle,
  ShieldCheck,
  MapPin,
  Ban,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TONE MAPPING                                                               */
/* Only the *presentation* of a status is defined here. No backend / API       */
/* status value is added, removed or renamed.                                  */
/* -------------------------------------------------------------------------- */

export type StatusTone =
  | "success"
  | "progress"
  | "current"
  | "pending"
  | "action"
  | "warning"
  | "danger"
  | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  progress: "bg-sky-50 text-sky-700 border-sky-200",
  current: "bg-[#EAF3FC] text-[#1261A8] border-[#BFDCF0]",
  pending: "bg-slate-100 text-slate-600 border-slate-200",
  action: "bg-amber-50 text-amber-800 border-amber-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

const TONE_ICON: Record<StatusTone, typeof Clock> = {
  success: CheckCircle2,
  progress: Clock,
  current: CircleDot,
  pending: Circle,
  action: AlertCircle,
  warning: AlertCircle,
  danger: XCircle,
  neutral: Circle,
};

/**
 * Keyword fallback for labels that are not single tokens, e.g.
 * "Stage 4 of 6 · In Progress", "e-KYC Verified", "2 Notices", "Case 12".
 * Ordered — the first matching group wins.
 */
const TONE_KEYWORDS: Array<[StatusTone, string[]]> = [
  [
    "danger",
    ["REJECT", "FAIL", "EXPIRE", "DISPUTE", "CANCEL", "INVALID", "MISSING"],
  ],
  [
    "action",
    [
      "ACTION",
      "REQUIRED",
      "IMPORTANT",
      "WARNING",
      "ALERT",
      "DUE",
      "CLAIM",
      "PENDING_SIGNATURE",
      "NEEDS",
    ],
  ],
  [
    "success",
    [
      "VERIFIED",
      "COMPLETE",
      "APPROVED",
      "SANCTION",
      "ARCHIVED",
      "PUBLISHED",
      "OFFICIAL",
      "CERTIFIED",
      "RECORD",
      "PAID",
      "DISBURS",
      "REGISTERED",
      "ELIGIBLE",
    ],
  ],
  [
    "progress",
    [
      "IN_PROGRESS",
      "PROCESSING",
      "PENDING",
      "UNDER_REVIEW",
      "IN_REVIEW",
      "AWAIT",
      "SUBMITTED",
      "UPLOADED",
      "STAGE",
      "IN_PROGRESS_STAGE",
      "CASE",
    ],
  ],
  [
    "pending",
    ["UPCOMING", "DRAFT", "QUEUED", "NOT_STARTED", "SCHEDULED"],
  ],
  ["warning", ["HOLD", "SUSPEND", "EXPIRY", "EXPIRING", "PAUSE", "ON_HOLD"]],
  ["current", ["CURRENT", "ACTIVE", "LIVE", "ONGOING"]],
];

/** Normalises any known status string (any case, underscores/spaces) to a tone. */
export function toneForStatus(status: string): StatusTone {
  const key = status.trim().toUpperCase().replace(/[\s_.-]+/g, "_");

  switch (key) {
    /* ---- success / done ---- */
    case "COMPLETED":
    case "COMPLETE":
    case "APPROVED":
    case "VERIFIED":
    case "SANCTIONED":
    case "ARCHIVED":
    case "ACTIVE":
    case "ENABLED":
    case "LINKED":
    case "REGISTRY_ACTIVE":
    case "SURVEY_COMPLETED":
    case "ELIGIBLE_REGISTERED":
    case "PUBLISHED":
      return "success";

    /* ---- in progress ---- */
    case "IN_PROGRESS":
    case "PROCESSING":
    case "UNDER_REVIEW":
    case "UNDER_ACQUISITION":
    case "IN_VERIFICATION":
    case "ON_HOLD":
      return key === "ON_HOLD" ? "warning" : "progress";

    /* ---- current / active stage ---- */
    case "CURRENT":
    case "PROCESSING_COMPLETE":
      return "current";

    /* ---- waiting ---- */
    case "PENDING":
    case "DRAFT":
    case "UPCOMING":
    case "AWAITING":
    case "INACTIVE":
      return "pending";

    /* ---- needs the citizen ---- */
    case "ACTION_REQUIRED":
    case "ACTION_AVAILABLE":
    case "CLAIMS_OPEN":
      return "action";

    /* ---- negative ---- */
    case "REJECTED":
    case "FAILED":
    case "EXPIRED":
    case "DISPUTED":
      return "danger";

    /* ---- cadastral parcel states ---- */
    case "SAFE":
    case "CLEAR_TITLE":
    case "NO_ACTIVE_NOTICE":
      return "success";
    case "REVIEW":
    case "PENDING_VERIFICATION":
      return "progress";
    case "ACQUISITION":
      return "action";

    default:
      break;
  }

  /* Fallback: scan for known keywords so composed labels still get a tone. */
  for (const [tone, keywords] of TONE_KEYWORDS) {
    if (keywords.some((kw) => key.includes(kw))) return tone;
  }

  return "neutral";
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

interface StatusBadgeProps {
  /** The status value exactly as supplied by the page / API. Never transformed. */
  status: string;
  /** Optional override when the caller already knows the tone. */
  tone?: StatusTone;
  /** Show a leading status icon. */
  withIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  withIcon = true,
  size = "sm",
  className = "",
  title,
}) => {
  const resolved = tone ?? toneForStatus(status);
  const Icon = TONE_ICON[resolved];

  const sizing =
    size === "md"
      ? "px-2.5 py-1 text-xs font-semibold gap-1.5"
      : "px-2 py-0.5 text-[11px] font-semibold gap-1";
  const iconSize = size === "md" ? 13 : 11;

  return (
    <span
      title={title ?? status}
      className={`inline-flex max-w-full items-center rounded-full border font-semibold whitespace-nowrap ${sizing} ${TONE_CLASS[resolved]} ${className}`}
    >
      {withIcon && <Icon size={iconSize} aria-hidden="true" className="shrink-0" />}
      <span className="truncate">{status}</span>
    </span>
  );
};

export default StatusBadge;

/* -------------------------------------------------------------------------- */
/* ICON RE-EXPORTS (single icon library: lucide-react)                         */
/* -------------------------------------------------------------------------- */

export const PortalStatusIcons = {
  success: CheckCircle2,
  progress: Clock,
  current: CircleDot,
  pending: Circle,
  action: AlertCircle,
  warning: AlertCircle,
  danger: XCircle,
  neutral: Circle,
  hold: PauseCircle,
  verified: ShieldCheck,
  parcel: MapPin,
  blocked: Ban,
};
