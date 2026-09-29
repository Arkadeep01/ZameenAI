import { useCallback, useState } from "react";
import * as api from "../api/digitization";
import { toBackendError, type BackendError } from "../api/client";
import type {
  AnomalyResponse,
  ClassifyResponse,
  ConfidenceResponse,
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

export type StageKey =
  | "ingest"
  | "quality"
  | "preprocess"
  | "classify"
  | "language"
  | "ocrConfig"
  | "ocr"
  | "extract"
  | "confidence"
  | "validation"
  | "anomaly"
  | "hitl";

export type StageStatus = "idle" | "running" | "done" | "error";

export interface StageState {
  status: StageStatus;
  error?: BackendError;
}

const STAGE_ORDER: StageKey[] = [
  "ingest",
  "quality",
  "preprocess",
  "classify",
  "language",
  "ocrConfig",
  "ocr",
  "extract",
  "confidence",
  "validation",
  "anomaly",
  "hitl",
];

function idleStages(): Record<StageKey, StageState> {
  return Object.fromEntries(STAGE_ORDER.map((k) => [k, { status: "idle" as const }])) as Record<
    StageKey,
    StageState
  >;
}

/**
 * Real pipeline state machine. Every transition is driven by a backend
 * response — no timers, no mock data. A failed stage stops the chain with
 * a visible BackendError (never silently replaced by demo content).
 */
export function useDigitizationPipeline() {
  const [stages, setStages] = useState<Record<StageKey, StageState>>(idleStages);
  const [ids, setIds] = useState<PhaseIds | null>(null);
  const [ingest, setIngest] = useState<IngestResponse | null>(null);
  const [quality, setQuality] = useState<QualityResponse | null>(null);
  const [preprocess, setPreprocess] = useState<PreprocessResponse | null>(null);
  const [classify, setClassify] = useState<ClassifyResponse | null>(null);
  const [language, setLanguage] = useState<LanguageDetectionResponse | null>(null);
  const [ocrConfig, setOcrConfig] = useState<OcrConfigResponse | null>(null);
  const [ocr, setOcr] = useState<OcrResponse | null>(null);
  const [extract, setExtract] = useState<ExtractResponse | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceResponse | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyResponse | null>(null);
  const [hitl, setHitl] = useState<HitlSession | null>(null);
  const [running, setRunning] = useState(false);
  const [correction, setCorrection] = useState<{
    phase: "idle" | "remediation" | "evidence" | "resubmission" | "reprocessing" | "done" | "error";
    remediation?: Record<string, unknown>;
    submission?: Record<string, unknown>;
    run?: Record<string, unknown>;
    error?: BackendError;
  }>({ phase: "idle" });

  const mark = useCallback((key: StageKey, patch: StageState) => {
    setStages((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }, []);

  /** Run one stage; returns false when the backend reports failure. */
  async function runStage<T>(
    key: StageKey,
    call: () => Promise<T>,
    apply: (data: T) => void,
    ok: (data: T) => boolean,
  ): Promise<T | null> {
    mark(key, { status: "running", error: undefined });
    try {
      const data = await call();
      if (!ok(data)) {
        const envelope = (data ?? {}) as { error_code?: string; message?: string; phase?: string };
        mark(key, {
          status: "error",
          error: {
            status: 400,
            error_code: envelope.error_code,
            message: envelope.message ?? `${key} reported failure`,
            phase: envelope.phase,
            raw: data,
          },
        });
        return null;
      }
      apply(data);
      mark(key, { status: "done", error: undefined });
      return data;
    } catch (err) {
      mark(key, { status: "error", error: toBackendError(err) });
      return null;
    }
  }

  const isOk = (d: Record<string, unknown>) =>
    (d.status as string | undefined) !== undefined && d.status !== "FAILED";

  /** Full chain ingest→anomaly on real backend responses. */
  const runPipeline = useCallback(
    async (file: File): Promise<boolean> => {
      setRunning(true);
      setStages(idleStages());
      try {
        const ing = await runStage("ingest", () => api.ingestFile(file), setIngest, isOk);
        if (!ing || !ing.record_id || !ing.document_id || !ing.ingestion_id) {
          if (ing) mark("ingest", {
            status: "error",
            error: { status: 400, message: "Ingestion response missing identifiers", raw: ing },
          });
          return false;
        }
        const idset: PhaseIds = {
          record_id: ing.record_id,
          document_id: ing.document_id,
          ingestion_id: ing.ingestion_id,
        };
        setIds(idset);

        const q = await runStage("quality", () => api.qualityCheck(idset), setQuality, isOk);
        if (!q) return false;
        const pp = await runStage("preprocess", () => api.preprocess(idset), setPreprocess, (d) =>
          ["SUCCESS", "PARTIAL", "REJECTED"].includes(d.status),
        );
        if (!pp) return false;
        const cl = await runStage("classify", () => api.classifyDocument(idset), setClassify, isOk);
        if (!cl) return false;
        const lang = await runStage(
          "language",
          () =>
            api.detectLanguage({
              ...idset,
              document_type:
                (cl.predicted_document_type as string | undefined) ??
                (cl.document_type as string | undefined),
              classification_confidence:
                (cl.classification_confidence as number | undefined) ??
                (cl.confidence as number | undefined) ??
                0,
            }),
          setLanguage,
          isOk,
        );
        if (!lang) return false;
        const cfg = await runStage(
          "ocrConfig",
          () =>
            api.configureOcr({
              ...idset,
              document_type:
                (cl.predicted_document_type as string | undefined) ??
                (cl.document_type as string | undefined),
            }),
          setOcrConfig,
          isOk,
        );
        if (!cfg) return false;
        const o = await runStage(
          "ocr",
          () => api.performOcr({ ...idset, ocr_config: (cfg.configuration ?? {}) as Record<string, unknown> }),
          setOcr,
          () => true, // /ocr returns 200 with structured outcome incl. NO_TEXT_DETECTED
        );
        if (!o) return false;
        const ex = await runStage("extract", () => api.extractFields(idset), setExtract, isOk);
        if (!ex) return false;
        const cf = await runStage("confidence", () => api.confidenceCompleteness(idset), setConfidence, isOk);
        if (!cf) return false;
        const va = await runStage("validation", () => api.automatedValidation(idset), setValidation, isOk);
        if (!va) return false;
        if (!va.validation_run_id) {
          mark("anomaly", {
            status: "error",
            error: { status: 400, message: "Validation response missing validation_run_id", raw: va },
          });
          return false;
        }
        const an = await runStage(
          "anomaly",
          () => api.anomalyDuplicate({ validation_run_id: va.validation_run_id as string }),
          setAnomaly,
          isOk,
        );
        if (!an) return false;
        return true;
      } finally {
        setRunning(false);
      }
    },
    [mark],
  );

  const openHitl = useCallback(
    async (reviewer: string): Promise<HitlSession | null> => {
      if (!validation?.validation_run_id) return null;
      mark("hitl", { status: "running", error: undefined });
      try {
        const s = await api.openHitlSession(validation.validation_run_id, reviewer);
        if (s.error_code) {
          mark("hitl", {
            status: "error",
            error: { status: 400, error_code: s.error_code, message: s.error_message ?? "HITL open failed", raw: s },
          });
          return null;
        }
        setHitl(s);
        mark("hitl", { status: "done", error: undefined });
        return s;
      } catch (err) {
        mark("hitl", { status: "error", error: toBackendError(err) });
        return null;
      }
    },
    [mark, validation],
  );

  const reviewField = useCallback(
    async (args: { field: string; action: string; value?: unknown; note?: string; reviewer: string }) => {
      if (!hitl?.hitl1_id) return null;
      try {
        const s = await api.reviewHitlField(hitl.hitl1_id, args);
        if (!s.error_code) setHitl(s);
        return s;
      } catch (err) {
        return { error_code: "REQUEST_FAILED", error_message: toBackendError(err).message } as HitlSession;
      }
    },
    [hitl],
  );

  const submitDecision = useCallback(
    async (args: { decision: string; reviewer: string; notes?: string }) => {
      if (!hitl?.hitl1_id) return null;
      try {
        const s = await api.submitHitl(hitl.hitl1_id, args);
        if (!s.error_code) setHitl(s);
        return s;
      } catch (err) {
        return { error_code: "REQUEST_FAILED", error_message: toBackendError(err).message } as HitlSession;
      }
    },
    [hitl],
  );

  /**
   * Real correction cycle on backend states only:
   * remediation → evidence → resubmission → reprocessing.
   * Never resets the UI or fabricates a new pipeline run.
   */
  const runCorrectionCycle = useCallback(
    async (args: { reviewer: string; notes?: string; files: File[] }): Promise<boolean> => {
      if (!ids) return false;
      try {
        setCorrection({ phase: "remediation" });
        const rem = (await api.createRemediation({
          ...ids,
          created_by: args.reviewer,
          force: true,
        })) as Record<string, unknown>;
        if (rem.status === "FAILED") {
          setCorrection({ phase: "error", error: { status: 400, message: String(rem.message ?? "Remediation failed"), raw: rem } });
          return false;
        }
        const remediation_id = String(rem.remediation_id ?? rem.id ?? "");
        setCorrection({ phase: "evidence", remediation: rem });
        const sub = await api.submitRemediationEvidence(remediation_id, {
          record_id: ids.record_id,
          uploader: args.reviewer,
          resolution_notes: args.notes ?? "",
          files: args.files,
        });
        if (sub.status === "FAILED") {
          setCorrection({ phase: "error", remediation: rem, error: { status: 400, message: String(sub.message ?? "Evidence rejected"), raw: sub } });
          return false;
        }
        setCorrection({ phase: "resubmission", remediation: rem });
        const resub = (await api.createResubmission({
          record_id: ids.record_id,
          document_id: ids.document_id,
          remediation_id,
          notes: args.notes ?? "",
        })) as Record<string, unknown>;
        if (resub.status === "FAILED") {
          setCorrection({ phase: "error", remediation: rem, error: { status: 400, message: String(resub.message ?? "Resubmission rejected"), raw: resub } });
          return false;
        }
        const submission_id = String(resub.submission_id ?? "");
        setCorrection({ phase: "reprocessing", remediation: rem, submission: resub });
        const run = (await api.reprocessSubmission({
          record_id: ids.record_id,
          submission_id,
        })) as Record<string, unknown>;
        if (run.status === "FAILED") {
          setCorrection({ phase: "error", remediation: rem, submission: resub, error: { status: 400, message: String(run.message ?? "Reprocessing failed"), raw: run } });
          return false;
        }
        setCorrection({ phase: "done", remediation: rem, submission: resub, run });
        return true;
      } catch (err) {
        setCorrection((c) => ({ ...c, phase: "error", error: toBackendError(err) }));
        return false;
      }
    },
    [ids],
  );

  const reset = useCallback(() => {
    setStages(idleStages());
    setIds(null);
    setIngest(null);
    setQuality(null);
    setPreprocess(null);
    setClassify(null);
    setLanguage(null);
    setOcrConfig(null);
    setOcr(null);
    setExtract(null);
    setConfidence(null);
    setValidation(null);
    setAnomaly(null);
    setHitl(null);
    setCorrection({ phase: "idle" });
  }, []);

  return {
    stages,
    ids,
    ingest,
    quality,
    preprocess,
    classify,
    language,
    ocrConfig,
    ocr,
    extract,
    confidence,
    validation,
    anomaly,
    hitl,
    running,
    correction,
    runPipeline,
    runCorrectionCycle,
    openHitl,
    reviewField,
    submitDecision,
    reset,
  };
}

export type DigitizationPipeline = ReturnType<typeof useDigitizationPipeline>;
