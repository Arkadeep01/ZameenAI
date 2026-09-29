import { apiClient } from "./client";
import type {
  AnomalyResponse,
  ConfidenceResponse,
  ClassifyResponse,
  ExtractResponse,
  HitlSession,
  IngestResponse,
  LanguageDetectionResponse,
  OcrConfigResponse,
  OcrResponse,
  PhaseIds,
  PreprocessResponse,
  QualityResponse,
  ValidationResponse,
} from "../types/digitization";

const BASE = "/api/digitization";

async function post<T>(path: string, body: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(`${BASE}${path}`, body ?? {});
  return data;
}

async function get<T>(path: string): Promise<T> {
  const { data } = await apiClient.get<T>(`${BASE}${path}`);
  return data;
}

/** Window 1 — real file upload (multipart) and demo ingestion. */
export function ingestFile(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiClient
    .post<IngestResponse>(`${BASE}/ingest`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

export function ingestDemo(sample = "clear") {
  return post<IngestResponse>("/ingest/demo", { sample });
}

/** Windows 2–4 — quality / preprocessing / classification. */
export function qualityCheck(ids: PhaseIds) {
  return post<QualityResponse>("/quality-check", ids);
}

export function preprocess(ids: PhaseIds) {
  return post<PreprocessResponse>("/preprocess", ids);
}

export function classifyDocument(
  ids: PhaseIds & { ocr_text?: string; title_or_header?: string; layout_regions?: unknown },
) {
  return post<ClassifyResponse>("/classify", ids);
}

/** Window 5 — language / OCR config / OCR. */
export function languageCapabilities() {
  return get<{
    status: string;
    scheduled_languages: string[];
    verified_languages: string[];
    capabilities: unknown;
  }>("/language-capabilities");
}

export function detectLanguage(
  body: PhaseIds & {
    classification_id?: string;
    document_type?: string;
    classification_confidence?: number;
    ocr_text?: string;
    force?: boolean;
  },
) {
  return post<LanguageDetectionResponse>("/language-detection", body);
}

export function configureOcr(
  body: PhaseIds & {
    document_type?: string;
    classification_confidence?: number;
    classification_status?: string;
  },
) {
  return post<OcrConfigResponse>("/ocr-config", body);
}

export function performOcr(
  body: PhaseIds & { ocr_config?: Record<string, unknown>; document_type?: string },
) {
  return post<OcrResponse>("/ocr", body);
}

/** Window 6 — semantic extraction. */
export function extractFields(ids: PhaseIds) {
  return post<ExtractResponse>("/extract", ids);
}

/** Window 7 — confidence / validation / anomaly / HITL. */
export function confidenceCompleteness(ids: PhaseIds) {
  return post<ConfidenceResponse>("/confidence-completeness", ids);
}

export function automatedValidation(ids: PhaseIds) {
  return post<ValidationResponse>("/automated-validation", ids);
}

export function anomalyDuplicate(body: { validation_run_id: string }) {
  return post<AnomalyResponse>("/anomaly-duplicate", body);
}

export function openHitlSession(validation_run_id: string, reviewer: string) {
  return post<HitlSession>("/hitl-1/open", { validation_run_id, reviewer });
}

export function reviewHitlField(
  hitl1_id: string,
  body: { field: string; action: string; value?: unknown; note?: string; reviewer: string },
) {
  return post<HitlSession>(`/hitl-1/${hitl1_id}/review-field`, body);
}

export function submitHitl(
  hitl1_id: string,
  body: { decision: string; reviewer: string; notes?: string },
) {
  return post<HitlSession>(`/hitl-1/${hitl1_id}/submit`, body);
}

/** Correction loop — remediation / resubmission / reprocessing. */
export function createRemediation(
  body: PhaseIds & { created_by?: string; force?: boolean },
) {
  return post<Record<string, unknown>>("/remediation", body);
}

export function submitRemediationEvidence(
  remediation_id: string,
  args: { record_id: string; uploader?: string; resolution_notes?: string; files: File[] },
) {
  const form = new FormData();
  form.append("record_id", args.record_id);
  if (args.uploader) form.append("uploader", args.uploader);
  if (args.resolution_notes) form.append("resolution_notes", args.resolution_notes);
  for (const f of args.files) form.append("files", f, f.name);
  return apiClient
    .post<Record<string, unknown>>(`${BASE}/remediation/${remediation_id}/submit`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

export function createResubmission(
  body: { record_id: string; document_id: string; remediation_id: string; notes?: string },
) {
  return post<Record<string, unknown>>("/resubmission", body);
}

export function reprocessSubmission(body: { record_id: string; submission_id: string }) {
  return post<Record<string, unknown>>("/reprocess", body);
}
