import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";

export const Route = createFileRoute("/admin/workflows")({
  component: AdminWorkflows,
});

function AdminWorkflows() {
  const { workflows, setWorkflows, logAudit, showToast } = useAdmin();

  return (
    <>
      <GreetingHeader
        eyebrow="Platform Config • SLA-Gated Pipelines"
        title="Workflow Configuration"
        subtitle="Stage toggles and SLA bounds. Disabling a stage reroutes cases to manual review."
      />
      <div className="space-y-4">
        {workflows.map((w) => (
          <PortalCard key={w.id}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-[#0B1F44]">
                  {w.name} <span className="ml-1 font-mono text-[10px] font-medium text-slate-400">{w.version}</span>
                </h2>
                <p className="font-mono text-[10px] text-slate-400">
                  {w.category} · Updated {w.updated}
                </p>
              </div>
              <span className="w-fit rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {w.status}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {w.stages.map((s) => (
                <div
                  key={s.id}
                  className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center ${
                    s.enabled ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-70"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-black ${
                      s.enabled ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">{s.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">
                      {s.role} · SLA {s.sla}h
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setWorkflows((prev) =>
                        prev.map((x) =>
                          x.id === w.id
                            ? { ...x, stages: x.stages.map((t) => (t.id === s.id ? { ...t, enabled: !t.enabled } : t)) }
                            : x,
                        ),
                      );
                      logAudit(
                        "WORKFLOW_STAGE_TOGGLED",
                        "Workflow Config",
                        s.id,
                        "HIGH",
                        `Stage ${s.name} → ${s.enabled ? "DISABLED" : "ENABLED"} in ${w.name}`,
                      );
                      showToast(`${s.name} ${s.enabled ? "disabled" : "enabled"}.`);
                    }}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                      s.enabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        s.enabled ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminWorkflows;
