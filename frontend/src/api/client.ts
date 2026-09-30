import axios, { AxiosError } from "axios";

/** Shared axios instance for ZameenAI APIs (Vite proxies /api → :8000). */
export const apiClient = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 1000 * 60 * 10, // OCR/LLM phases can take minutes on real docs
});

const ACCESS_KEY = "zameenai.access_token";
const REFRESH_KEY = "zameenai.refresh_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh: string) {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable — requests proceed unauthenticated */
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    // Legacy keys (never written by the new flow, removed defensively).
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("citizenToken");
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

// Attach Authorization header from storage (backend is authoritative).
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
      const { data } = await axios.post("/api/auth/refresh", { refresh_token: refresh });
      if (data?.access_token) {
        setTokens(data.access_token, data.refresh_token ?? refresh);
        return data.access_token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// 401 → attempt refresh once, else clear + redirect to login.
// 403 → surface to caller (guards render denied UI); never retry.
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (status === 401 && original && !original._retried && getRefreshToken()) {
      original._retried = true;
      const fresh = await tryRefresh();
      if (fresh) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>)["Authorization"] = `Bearer ${fresh}`;
        return apiClient.request(original);
      }
    }
    if (status === 401) {
      clearTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/citizen/find")) {
        window.dispatchEvent(new CustomEvent("zameenai:unauthorized"));
      }
    }
    return Promise.reject(error);
  },
);

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
    const nested = (data?.error ?? data) as Record<string, unknown> | undefined;
    return {
      status: e.response?.status ?? 0,
      error_code:
        (typeof nested?.code === "string" ? nested.code : undefined) ??
        (typeof data?.error_code === "string" ? data.error_code : undefined) ??
        e.code,
      message:
        (typeof nested?.message === "string" ? nested.message : undefined) ??
        (typeof data?.message === "string" ? data.message : undefined) ??
        e.message,
      phase: typeof data?.phase === "string" ? data.phase : undefined,
      raw: data,
    };
  }
  return { status: 0, message: err instanceof Error ? err.message : String(err) };
}
