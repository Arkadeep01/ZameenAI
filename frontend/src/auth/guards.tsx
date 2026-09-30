import React from "react";
import { useAuth } from "./AuthProvider";
import { normalizeRole } from "./permissions";

function Denied({ message }: { message: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-bold text-red-800">Access denied</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      <a href="/" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
        Return home
      </a>
    </div>
  );
}

function Checking() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
      Verifying access…
    </div>
  );
}

/** Requires a signed-in user (real /auth/me). Renders sign-in prompt otherwise. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <Checking />;
  if (!isAuthenticated || !user) {
    return <Denied message="Sign in with your official credentials or citizen OTP to continue." />;
  }
  return <>{children}</>;
}

/** Requires one of the given canonical roles (frontend aliases accepted). */
export function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  if (loading) return <Checking />;
  if (!isAuthenticated || !user) {
    return <Denied message="Sign in to continue." />;
  }
  if (!hasRole(...roles)) {
    return <Denied message={`This section requires role: ${roles.map((r) => normalizeRole(r)).join(", ")}.`} />;
  }
  return <>{children}</>;
}

/** Requires a canonical MODULE.ACTION permission (UX layer; backend enforces). */
export function PermissionGuard({
  permission,
  children,
  fallback,
}: {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, user, loading } = useAuth();
  if (loading) return <Checking />;
  if (!user) return <Denied message="Sign in to continue." />;
  const perms = Array.isArray(permission) ? permission : [permission];
  const ok = perms.some((p) => hasPermission(p));
  if (!ok) {
    return <>{fallback ?? <Denied message={`Missing permission: ${perms.join(" / ")}.`} />}</>;
  }
  return <>{children}</>;
}

/** Convenience: portal wrapper = auth + role gate. */
export function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard roles={roles}>{children}</RoleGuard>
    </ProtectedRoute>
  );
}
