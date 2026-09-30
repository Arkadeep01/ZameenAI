import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { INITIAL_SERVICES } from "../features/admin/adminData";
import { HealthBadge } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/system-monitor")({
  component: AdminSystemMonitor,
});

function AdminSystemMonitor() {
  return (
    <>
      <GreetingHeader
        eyebrow="Governance & Health • Live Telemetry"
        title="Infrastructure & System Monitor"
        subtitle="Heartbeat, latency, error rate and uptime per service. Degraded services need capacity action."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {INITIAL_SERVICES.map((s) => (
          <PortalCard key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">{s.name}</p>
                <p className="font-mono text-[10px] text-slate-400">{s.endpoint}</p>
              </div>
              <HealthBadge status={s.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Uptime %", `${s.up}%`, "text-emerald-700"],
                  ["Latency", `${s.lat}ms`, s.lat > 500 ? "text-amber-700" : "text-slate-800"],
                  ["Error %", `${s.err}%`, s.err > 1 ? "text-red-600" : "text-slate-800"],
                ] as const
              ).map(([l, v, c]) => (
                <div key={l} className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
                  <p className={`mt-0.5 font-mono text-sm font-black ${c}`}>{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-2.5 border-t border-slate-100 pt-2 font-mono text-[10px] text-slate-400">
              Checked {s.checked} · {s.details}
            </p>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminSystemMonitor;
