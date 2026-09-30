import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { HealthBadge } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/integrations")({
  component: AdminIntegrations,
});

function AdminIntegrations() {
  const { integrations, setIntegrations, askConfirm, logAudit, showToast } = useAdmin();

  return (
    <>
      <GreetingHeader
        eyebrow="Platform Config • External APIs"
        title="Integrations & External APIs"
        subtitle="Credential health, endpoint latency and enablement. Probes are audit-logged."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((g) => (
          <PortalCard key={g.id} className={!g.enabled ? "opacity-75" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">{g.name}</p>
                <p className="font-mono text-[10px] text-slate-400">
                  {g.type} · {g.provider} · {g.ver}
                </p>
              </div>
              <HealthBadge status={g.enabled ? g.status : "DISABLED"} />
            </div>
            <p className="mt-1.5 truncate font-mono text-[11px] text-slate-500">{g.endpoint}</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 font-mono text-[10px]">
              <span>
                <span className="block font-sans text-slate-400">Latency</span>
                <b className={g.latency > 500 ? "text-amber-700" : "text-slate-800"}>{g.latency}ms</b>
              </span>
              <span>
                <span className="block font-sans text-slate-400">Auth</span>
                <b className={g.auth === "VALID_CREDENTIAL" ? "text-emerald-700" : "text-amber-700"}>
                  {g.auth.replace(/_/g, " ")}
                </b>
              </span>
              <span>
                <span className="block font-sans text-slate-400">Key</span>
                <b className="text-slate-700">{g.key}</b>
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {g.notes} · Last sync {g.sync}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const lat = 40 + Math.floor(Math.random() * 90);
                  const ok = g.status !== "UNAVAILABLE";
                  setIntegrations((prev) =>
                    prev.map((x) => (x.id === g.id ? { ...x, latency: lat, sync: "2026-09-27 11:30 UTC" } : x)),
                  );
                  logAudit(
                    "INTEGRATION_PROBE_DIAGNOSTIC",
                    "Integrations",
                    g.id,
                    "MEDIUM",
                    `Diagnostic ping → HTTP ${ok ? "200 OK" : "503"} in ${lat}ms`,
                  );
                  showToast(ok ? `Probe OK: TLS handshake in ${lat}ms.` : "Probe failed on remote gateway.");
                }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Test Connection
              </button>
              <button
                onClick={() =>
                  askConfirm({
                    title: g.enabled ? "Disable Integration" : "Enable Integration",
                    message: `${g.enabled ? "Disable" : "Enable"} ${g.name} (${g.provider})?`,
                    impactWarning: g.enabled
                      ? "Dependent portal features will degrade to offline mode until re-enabled."
                      : "Traffic will resume against stored credentials after a probe passes.",
                    confirmButtonText: g.enabled ? "Disable" : "Enable",
                    dangerLevel: g.enabled ? "danger" : "warning",
                    requiresReason: true,
                    onConfirm: (reason) => {
                      setIntegrations((prev) => prev.map((x) => (x.id === g.id ? { ...x, enabled: !x.enabled } : x)));
                      logAudit(
                        g.enabled ? "INTEGRATION_DISABLED" : "INTEGRATION_ENABLED",
                        "Integrations",
                        g.id,
                        "HIGH",
                        reason || `${g.name} toggled`,
                      );
                      showToast(`${g.name} ${g.enabled ? "disabled" : "enabled"}.`);
                    },
                  })
                }
                className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                  g.enabled ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {g.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminIntegrations;
