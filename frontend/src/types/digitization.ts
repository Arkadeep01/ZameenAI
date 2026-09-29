/**
 * TypeScript mirrors of the real backend `to_dict()` contracts
 * (backend/app/ocr/* /models.py and api bridge responses).
 * Transport shapes only — no business logic duplicated here.
 */

export interface PhaseIds {
  record_id: string;
  document_id: string;
  ingestion_id: string;
}

export interface ErrorEnvelope {
  phase?: string;
  status: string;
  error_code?: string;
  message?: string;
}

export interface IngestResponse extends Partial<PhaseIds> {
  phase: string;
  status: string;
  error_code?: string;
  message?: string;
  demo?: boolean;
  sample?: string;
  [key: string]: unknown;
}

export interface QualityResponse {
  phase: string;
  status: string;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface PreprocessResponse {
  phase: string;
  status: string;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ClassifyResponse {
  phase: string;
  classification_status?: string;
  predicted_document_type?: string;
  document_type?: string;
  classification_confidence?: number;
  confidence?: number;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface LanguageDetectionResponse {
  phase: string;
  status: string;
  primary_language?: string;
  primary_script?: string;
  ocr_routing?: Record<string, unknown>;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface OcrConfigResponse {
  phase: string;
  status: string;
  configuration?: Record<string, unknown>;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface OcrWord {
  text: string;
  confidence?: number | null;
  bbox?: [number, number, number, number] | number[];
  [key: string]: unknown;
}

export interface OcrPage {
  page_number: number;
  text?: string;
  words?: OcrWord[];
  lines?: Array<{ text?: string; words?: OcrWord[] }>;
  mean_confidence?: number;
  word_count?: number;
  character_count?: number;
  status?: string;
  [key: string]: unknown;
}

export interface OcrResponse {
  phase: string;
  status: string;
  record_id: string;
  document_id: string;
  full_text?: string;
  pages?: OcrPage[];
  metrics?: Record<string, number>;
  engine?: string;
  language?: string;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface FieldMetadataEntry {
  field_name: string;
  status: string;
  confidence: number;
  method?: string;
  raw_value?: string | null;
  normalized_value?: unknown;
  error_message?: string;
  source?: {
    page?: number;
    label?: string;
    text?: string;
    bbox?: { x: number; y: number; width: number; height: number };
  };
}

export interface ExtractResponse {
  phase: string;
  status: string;
  record_id: string;
  document_id: string;
  document_type?: string;
  extracted_record?: Record<string, Record<string, unknown>>;
  field_metadata?: Record<string, FieldMetadataEntry>;
  unresolved_fields?: string[];
  conflicts?: Array<Record<string, unknown>>;
  needs_review?: boolean;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface FieldAssessmentEntry {
  field_name: string;
  value_status: string;
  confidence: number;
  priority?: string;
  confidence_factors?: Record<string, number>;
  value?: unknown;
  raw_value?: string | null;
  method?: string;
  source_page?: number | null;
  source_label?: string;
  in_conflict?: boolean;
  conflict_alternatives?: Array<Record<string, unknown>>;
}

export interface ConfidenceResponse {
  phase: string;
  status: string;
  record_id: string;
  document_id: string;
  confidence?: { overall: number; band: string };
  completeness?: {
    score: number;
    band: string;
    applicable_fields?: number;
    present_fields?: number;
    missing_fields?: number;
    unreadable_fields?: number;
    not_applicable_fields?: number;
    critical_missing?: string[];
    important_missing?: string[];
  };
  fields?: Record<string, FieldAssessmentEntry>;
  missing_fields?: string[];
  unreadable_fields?: string[];
  conflicting_fields?: string[];
  critical_issues?: string[];
  needs_review?: boolean;
  next_phase?: string;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ValidationFinding {
  field: string;
  status: string;
  severity: string;
  rule_category: string;
  reason: string;
  original_value?: unknown;
  comparison_value?: unknown;
}

export interface ValidationResponse {
  phase: string;
  status: string;
  validation_run_id?: string;
  record_id: string;
  decision?: string;
  summary?: string;
  needs_review?: boolean;
  findings?: ValidationFinding[];
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface AnomalyEntry {
  category: string;
  severity: string;
  explanation: string;
  field?: string | null;
  evidence?: Record<string, unknown>;
}

export interface DuplicateMatchEntry {
  matched_record_id: string;
  match_type: string;
  confidence: number;
  fuzzy?: boolean;
  evidence?: unknown;
}

export interface AnomalyResponse {
  phase: string;
  status: string;
  stage_id?: string;
  record_id: string;
  anomalies?: AnomalyEntry[];
  duplicates?: {
    status: string;
    scope?: string;
    matched_records?: DuplicateMatchEntry[];
  };
  workflow_state?: string;
  needs_review?: boolean;
  next_phase?: string | null;
  error_code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface HitlSession {
  phase: string;
  status: string;
  hitl1_id: string;
  record_id: string;
  document_id?: string;
  validation_run_id?: string;
  stage_id?: string | null;
  flagged_fields?: string[];
  field_snapshot?: Record<string, Record<string, unknown>>;
  field_reviews?: Record<
    string,
    {
      action: string;
      value?: unknown;
      original_value?: unknown;
      note?: string;
      reviewer?: string;
      reviewed_at?: string;
    }
  >;
  evidence?: Record<string, unknown>;
  notes?: Array<{ by?: string; at?: string; text?: string }>;
  error_code?: string;
  error_message?: string;
  [key: string]: unknown;
}

export type FieldReviewAction = "VERIFY" | "CORRECT" | "UNRESOLVED";
export type HitlDecision = "VERIFIED" | "CORRECTION_REQUIRED" | "REJECTED";
