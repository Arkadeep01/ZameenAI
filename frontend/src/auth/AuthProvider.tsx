import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, clearTokens, getAccessToken, setTokens } from "../api/client";
import { normalizeRole, ROLE_HOME, type CanonicalRole } from "./permissions";

export interface AuthUser {
  id: string;
  username: string;
  role: CanonicalRole;
  project_ids: string[];
  scopes: string[];
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  requestOtp: (username: string) => Promise<{ otp?: string }>;
  verifyOtp: (username: string, otp: string) => Promise<AuthUser>;
  refresh: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadMe(): Promise<AuthUser> {
  const { data: me } = await apiClient.get("/api/auth/me");
  const { data: roles } = await apiClient.get("/api/auth/roles").catch(() => ({ data: [] as never[] }));
  const entry = (roles as Array<{ role: string; permissions: string[] }>).find((r) => r.role === me.role);
  return {
    id: me.id,
    username: me.username,
    role: normalizeRole(me.role) as CanonicalRole,
    project_ids: me.project_ids ?? [],
    scopes: me.scopes ?? [],
    permissions: entry?.permissions ?? [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    loadMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener("zameenai:unauthorized", onUnauthorized);
    return () => window.removeEventListener("zameenai:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const { data } = await apiClient.post("/api/auth/login", { username, password });
      setTokens(data.access_token, data.refresh_token ?? "");
      const me = await loadMe();
      setUser(me);
      return me;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = (() => {
        try {
          return localStorage.getItem("zameenai.refresh_token") ?? "";
        } catch {
          return "";
        }
      })();
      await apiClient.post("/api/auth/logout", { refresh_token: refresh });
    } catch {
      /* proceed to local clear */
    }
    clearTokens();
    setUser(null);
  }, []);

  const requestOtp = useCallback(async (username: string) => {
    const { data } = await apiClient.post("/api/auth/citizen/request-otp", { username });
    return data as { otp?: string };
  }, []);

  const verifyOtp = useCallback(async (username: string, otp: string) => {
    setError(null);
    try {
      const { data } = await apiClient.post("/api/auth/citizen/verify-otp", { username, otp });
      setTokens(data.access_token, data.refresh_token ?? "");
      const me = await loadMe();
      setUser(me);
      return me;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        "OTP verification failed";
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const refresh = useCallback(async () => {
    const me = await loadMe();
    setUser(me);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.permissions.includes("*")) return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      const want = roles.map((r) => normalizeRole(r));
      return want.includes(user.role);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!user,
      login,
      logout,
      requestOtp,
      verifyOtp,
      refresh,
      hasPermission,
      hasRole,
    }),
    [user, loading, error, login, logout, requestOtp, verifyOtp, refresh, hasPermission, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function usePermissions() {
  const { hasPermission, hasRole, user } = useAuth();
  return { hasPermission, hasRole, permissions: user?.permissions ?? [], role: user?.role ?? null };
}

export { ROLE_HOME };
