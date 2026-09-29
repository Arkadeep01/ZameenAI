import type { ExtractedField } from "../routes/citizen.digitalizations";
import type {
  ConfidenceResponse,
  ExtractResponse,
  FieldAssessmentEntry,
  FieldMetadataEntry,
} from "../types/digitization";

/**
 * Adapters: backend canonical contracts → the existing UI field shape.
 * Presentation mapping only — no scoring, no thresholds, no business rules.
 * Backend remains authoritative for every value and status.
 */

interface Slot {
  id: string;
  label: string;
  group: string;
}

const CANONICAL_SLOTS: Array<{ canonical: string; slot: Slot }> = [
  { canonical: "record_id", slot: { id: "record_id", label: "Record ID", group: "Record Information" } },
  { canonical: "document.document_id", slot: { id: "doc_id", label: "Document ID", group: "Document Details" } },
  { canonical: "document.document_type", slot: { id: "doc_type", label: "Document Type", group: "Document Details" } },
  { canonical: "document.document_title", slot: { id: "doc_title", label: "Document Title", group: "Document Details" } },
  { canonical: "document.department", slot: { id: "department", label: "Department", group: "Document Details" } },
  { canonical: "document.document_date", slot: { id: "doc_date", label: "Document Date", group: "Document Details" } },
  { canonical: "document.map_number", slot: { id: "map_number", label: "Map Number", group: "Document Details" } },
  { canonical: "owner.name", slot: { id: "owner_name", label: "Owner Name", group: "Owner Information" } },
  { canonical: "owner.father_husband_name", slot: { id: "father_name", label: "Father/Husband Name", group: "Owner Information" } },
  { canonical: "owner.co_owner", slot: { id: "co_owner", label: "Co-owner", group: "Owner Information" } },
  { canonical: "owner.recorded_tenant", slot: { id: "recorded_tenant", label: "Recorded Tenant", group: "Owner Information" } },
  { canonical: "land.survey_number", slot: { id: "survey_number", label: "Survey Number", group: "Land Details" } },
  { canonical: "land.khasra_number", slot: { id: "khasra_number", label: "Khasra Number", group: "Land Details" } },
  { canonical: "land.plot_number", slot: { id: "plot_number", label: "Plot Number", group: "Land Details" } },
  { canonical: "land.khata_number", slot: { id: "khata_number", label: "Khata Number", group: "Land Details" } },
  { canonical: "land.area", slot: { id: "area", label: "Area", group: "Land Details" } },
  { canonical: "land.area_unit", slot: { id: "area_unit", label: "Area Unit", group: "Land Details" } },
  { canonical: "land.nature_of_land", slot: { id: "nature_of_land", label: "Nature of Land", group: "Land Details" } },
  { canonical: "land.land_type", slot: { id: "land_type", label: "Land Type", group: "Land Details" } },
  { canonical: "location.state", slot: { id: "state", label: "State", group: "Location Details" } },
  { canonical: "location.district", slot: { id: "district", label: "District", group: "Location Details" } },
  { canonical: "location.block", slot: { id: "block", label: "Block", group: "Location Details" } },
  { canonical: "location.tehsil", slot: { id: "tehsil", label: "Tehsil", group: "Location Details" } },
  { canonical: "location.mouza", slot: { id: "mouza", label: "Mouza", group: "Location Details" } },
  { canonical: "location.village", slot: { id: "village", label: "Village", group: "Location Details" } },
  { canonical: "mutation.mutation_number", slot: { id: "mutation_number", label: "Mutation Number", group: "Mutation Details" } },
  { canonical: "mutation.mutation_date", slot: { id: "mutation_date", label: "Mutation Date", group: "Mutation Details" } },
  { canonical: "registration.document_number", slot: { id: "reg_document_number", label: "Registration Doc No.", group: "Additional Information" } },
  { canonical: "registration.registration_date", slot: { id: "reg_registration_date", label: "Registration Date", group: "Additional Information" } },
  { canonical: "registration.issue_date", slot: { id: "reg_issue_date", label: "Issue Date", group: "Additional Information" } },
  { canonical: "additional.remarks", slot: { id: "remarks", label: "Remarks", group: "Additional Information" } },
];

const SLOT_BY_CANONICAL = new Map(CANONICAL_SLOTS.map((s) => [s.canonical, s.slot]));

function displayValue(raw: unknown, normalized: unknown): string {
  const v = normalized ?? raw;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function issueFor(status: string, error?: string): string | undefined {
  switch (status) {
    case "REQUIRED_BUT_MISSING":
      return "Missing";
    case "REQUIRED_BUT_UNREADABLE":
      return "Unreadable";
    case "CONFLICTING":
    case "CONFLICT":
      return "Conflict";
    case "LOW_CONFIDENCE":
      return "Low confidence";
    default:
      return error || undefined;
  }
}

/** Flatten a real extraction response into the UI's field rows. */
export function extractionToFields(extract: ExtractResponse): ExtractedField[] {
  const meta = extract.field_metadata ?? {};
  const out: ExtractedField[] = [];
  const seen = new Set<string>();
  for (const { canonical, slot } of CANONICAL_SLOTS) {
    const m: FieldMetadataEntry | undefined = meta[canonical];
    seen.add(canonical);
    const value = m ? displayValue(m.raw_value, m.normalized_value) : "";
    out.push({
      id: slot.id,
      label: slot.label,
      value,
      confidence: m ? Math.round((m.confidence ?? 0) * 1000) / 10 : 0,
      issue: m ? issueFor(m.status, m.error_message ?? undefined) : "Missing",
    });
  }
  // Any backend field without a UI slot is appended, never dropped.
  for (const [canonical, m] of Object.entries(meta)) {
    if (seen.has(canonical)) continue;
    const [, ...rest] = canonical.split(".");
    const label = rest.join(" ").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || canonical;
    out.push({
      id: `extra_${canonical.replace(/[^a-z0-9]+/gi, "_")}`,
      label,
      value: displayValue(m.raw_value, m.normalized_value),
      confidence: Math.round((m.confidence ?? 0) * 1000) / 10,
      issue: issueFor(m.status, m.error_message ?? undefined),
    });
  }
  return out;
}

/** Override extraction rows with real confidence assessments (same ids). */
export function applyConfidence(
  fields: ExtractedField[],
  confidence: ConfidenceResponse,
): ExtractedField[] {
  const assessments: Record<string, FieldAssessmentEntry> = confidence.fields ?? {};
  const missing = new Set([...(confidence.missing_fields ?? []), ...(confidence.unreadable_fields ?? [])]);
  const conflicting = new Set(confidence.conflicting_fields ?? []);
  // Map canonical field names back onto UI rows via the slot table.
  const uiByCanonical = new Map(CANONICAL_SLOTS.map((s) => [s.canonical, s.slot.id]));
  const confByUiId = new Map<string, FieldAssessmentEntry>();
  for (const [canonical, a] of Object.entries(assessments)) {
    const uiId = uiByCanonical.get(canonical);
    if (uiId) confByUiId.set(uiId, a);
  }
  return fields.map((f) => {
    // Reverse-lookup canonical name for extra_* rows is unnecessary: match by label is avoided;
    // extras keep extraction values unless directly matched below.
    const a = confByUiId.get(f.id);
    if (!a) {
      const canonicalHit = Object.keys(assessments).find((c) => c.endsWith(`.${f.id}`) || c === f.id);
      const ah = canonicalHit ? assessments[canonicalHit] : undefined;
      if (!ah) {
        if (missing.has(f.id)) return { ...f, issue: f.issue ?? "Missing" };
        return f;
      }
      return {
        ...f,
        value: ah.value !== undefined && ah.value !== null ? String(ah.value) : f.value,
        confidence: Math.round((ah.confidence ?? 0) * 1000) / 10,
        issue: issueFor(ah.value_status) ?? f.issue,
      };
    }
    return {
      ...f,
      value: a.value !== undefined && a.value !== null ? String(a.value) : f.value,
      confidence: Math.round((a.confidence ?? 0) * 1000) / 10,
      issue: issueFor(a.value_status) ?? f.issue,
    };
  });
}

/** Group ids for the existing FIELD_GROUPS (plus registration extras). */
export const FIELD_GROUP_IDS: Record<string, string[]> = {
  "Record Information": ["record_id"],
  "Document Details": ["doc_id", "doc_type", "doc_title", "department", "doc_date", "map_number"],
  "Owner Information": ["owner_name", "father_name", "co_owner", "recorded_tenant"],
  "Land Details": ["survey_number", "khasra_number", "plot_number", "khata_number", "area", "area_unit", "nature_of_land", "land_type"],
  "Location Details": ["state", "district", "block", "tehsil", "mouza", "village"],
  "Mutation Details": ["mutation_number", "mutation_date"],
  "Additional Information": ["remarks", "reg_document_number", "reg_registration_date", "reg_issue_date"],
};

export function groupOf(fieldId: string): string {
  if (fieldId.startsWith("extra_")) return "Additional Information";
  for (const [group, ids] of Object.entries(FIELD_GROUP_IDS)) {
    if (ids.includes(fieldId)) return group;
  }
  return "Additional Information";
}
