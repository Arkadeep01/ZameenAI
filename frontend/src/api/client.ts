import axios, { AxiosError } from "axios";

/** Shared axios instance for ZameenAI APIs (Vite proxies /api → :8000). */
export const apiClient = axios.create({
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
