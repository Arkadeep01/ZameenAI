import axios, { AxiosError } from "axios";

/** Shared axios instance for ZameenAI APIs.
 *
 * Production API origin comes from VITE_API_URL (e.g. the Render backend URL).
 * When empty (local dev), paths stay relative ("/api/...") so the Vite dev
 * proxy forwards them to http://localhost:8000. No secrets here — only the
 * public backend origin.
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const apiClient = axios.create({
  baseURL: API_ORIGIN || undefined,
  headers: { "Content-Type": "application/json" },
  timeout: 1000 * 60 * 10, // OCR/LLM phases can take minutes on real docs
});

export interface BackendError {
  status: number;
  error_code?: string;
  message: string;
  phase?: string;
  raw?: unknown;
}

/** Normalize axios failures into the backend error envelope (never silent). */
export function toBackendError(err: unknown): BackendError {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<Record<string, unknown>>;
    const data = e.response?.data;
    return {
      status: e.response?.status ?? 0,
      error_code:
        (typeof data?.error_code === "string" ? data.error_code : undefined) ??
        e.code,
      message:
        (typeof data?.message === "string" ? data.message : undefined) ??
        e.message,
      phase: typeof data?.phase === "string" ? data.phase : undefined,
      raw: data,
    };
  }
  return { status: 0, message: err instanceof Error ? err.message : String(err) };
}
