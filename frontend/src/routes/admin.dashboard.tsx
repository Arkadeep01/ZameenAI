import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { INITIAL_SERVICES, ROLES } from "../features/admin/adminData";
import { HealthBadge, SevBadge, TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { users, departments, projects, integrations, auditLogs, notifs } = useAdmin();

  const go = (to: string) => () => navigate({ to });

  const kpis = [
    { label: "Total Users", value: String(users.length), sub: "Directory catalog", to: "/admin/users" },
    { label: "Active Users", value: String(users.filter((u) => u.status === "ACTIVE").length), sub: "Active status", to: "/admin/users" },
    { label: "Suspended", value: String(users.filter((u) => u.status === "SUSPENDED").length), sub: "Access revoked", to: "/admin/users" },
    { label: "Roles", value: String(ROLES.length), sub: "Configured RBAC", to: "/admin/roles" },
    { label: "Departments", value: String(departments.length), sub: "State & Central", to: "/admin/departments" },
    { label: "Active Projects", value: String(projects.length), sub: "Configured pipelines", to: "/admin/projects" },
    { label: "Integrations", value: `${integrations.filter((i) => i.enabled).length}/${integrations.length}`, sub: "Live connectors", to: "/admin/integrations" },
    { label: "System Alerts", value: String(notifs.filter((n) => !n.read && n.sev !== "INFO").length), sub: "Action required", to: "/admin/notifications" },
  ];

  return (
    <>
      <GreetingHeader
        eyebrow="Platform Control Mode • NIC / MeitY"
        title="System Administration Console"
        subtitle="Global governance of authentication, roles, workflows, integrations, and infrastructure telemetry."
        actions={
          <>
            <button onClick={go("/admin/system-monitor")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              Live Telemetry
            </button>
            <button onClick={go("/admin/users-new")} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">
              + Provision Official
            </button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={go(k.to)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-1 font-mono text-2xl font-black text-[#0B1F44]">{k.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{k.sub}</p>
          </button>
        ))}
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <PortalCard className="!p-0">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0B1F44]">Platform Infrastructure &amp; Service Health</h2>
              <p className="text-[11px] text-slate-500">Continuous heartbeat status of core microservices</p>
            </div>
            <button onClick={go("/admin/system-monitor")} className="w-fit text-xs font-bold text-emerald-700">
              Full Diagnostics →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            {INITIAL_SERVICES.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-3.5 hover:border-slate-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                    <p className="truncate font-mono text-[10px] text-slate-400">{s.endpoint}</p>
                  </div>
                  <HealthBadge status={s.status} />
                </div>
                <div className="mt-2.5 flex justify-between border-t border-slate-100 pt-2 font-mono text-[10px] text-slate-500">
                  <span>Latency: <b className="text-slate-700">{s.lat}ms</b></span>
                  <span>Uptime: <b className="text-emerald-700">{s.up}%</b></span>
                  <span>Errors: <b className="text-slate-700">{s.err}%</b></span>
                </div>
              </div>
            ))}
          </div>
        </PortalCard>

        <PortalCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0B1F44]">Active Security &amp; Platform Alerts</h2>
            <span className="font-mono text-[10px] text-slate-400">Live Guard</span>
          </div>
          <div className="space-y-2.5">
            {notifs.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border p-3 ${
                  n.sev === "CRITICAL" || n.sev === "ERROR"
                    ? "border-red-200 bg-red-50/50"
                    : n.sev === "WARNING"
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-slate-200"
                }`}
              >
                <p className="flex items-center justify-between gap-2">
                  <SevBadge sev={n.sev} />
                  <span className="font-mono text-[10px] text-slate-400">{n.ts.split(" ")[0]}</span>
                </p>
                <p className="mt-1.5 text-xs font-bold text-slate-800">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{n.desc}</p>
              </div>
            ))}
          </div>
        </PortalCard>
      </div>

      <PortalCard className="mt-5 !p-0">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0B1F44]">Recent Administrative Governance Activity</h2>
            <p className="text-[11px] text-slate-500">Tamper-evident log of platform and policy modifications</p>
          </div>
          <button onClick={go("/admin/audit-logs")} className="w-fit text-xs font-bold text-emerald-700">
            Open Audit Trail →
          </button>
        </div>
        <TableShell minWidth="min-w-[900px]">
          <thead>
            <tr>
              <Th>Timestamp (UTC)</Th>
              <Th>Administrator</Th>
              <Th>Action</Th>
              <Th>Module</Th>
              <Th>Target Entity</Th>
              <Th>Result</Th>
              <Th>Reason / Details</Th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.slice(0, 5).map((l) => (
              <tr key={l.id} className="hover:bg-emerald-50/40">
                <Td className="whitespace-nowrap font-mono text-slate-500">{l.ts}</Td>
                <Td className="whitespace-nowrap font-semibold text-slate-800">{l.user}</Td>
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{l.action}</Td>
                <Td className="text-slate-500">{l.module}</Td>
                <Td className="font-mono text-slate-600">{l.entity}</Td>
                <Td>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${l.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {l.result}
                  </span>
                </Td>
                <Td className="max-w-[240px] truncate text-slate-500">{l.reason}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}

export default AdminDashboard;
