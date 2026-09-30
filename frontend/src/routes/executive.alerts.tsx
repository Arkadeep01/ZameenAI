import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { alerts } from "../features/executive/executiveData";

export const Route = createFileRoute("/executive/alerts")({
  component: ExecutiveAlerts,
});

function ExecutiveAlerts() {
  const navigate = useNavigate();

  return (
    <>
      <GreetingHeader
        eyebrow="Section 24 – High-Level Escalation Radar"
        title="High-Level Executive Alerts &amp; Statutory Obstructions"
        subtitle="Filtered exclusively for high-level programmatic risks (delays, stay concentrations, compensation backlogs). Low-level system logs filtered out."
      />
      <div className="space-y-3">
        {alerts.map((a) => (
          <PortalCard key={a.t} className={`!p-4 ${a.sev === "CRITICAL" ? "!border-red-200 !bg-red-50/40" : a.sev === "WARNING" ? "!border-amber-200 !bg-amber-50/40" : ""}`}>
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-2.5">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.sev === "CRITICAL" ? "bg-red-100 text-red-700" : a.sev === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                  {a.sev === "INFO" ? <CircleCheck size={15} /> : <TriangleAlert size={15} />}
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                    {a.t}
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${a.sev === "CRITICAL" ? "bg-red-700 text-white" : a.sev === "WARNING" ? "bg-amber-500 text-white" : "bg-blue-600 text-white"}`}>{a.sev}</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.d}</p>
                  <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-slate-400">{a.meta}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="text-[11px] font-semibold text-slate-400 hover:text-slate-700">Mark Read</button>
                <button onClick={() => navigate({ to: "/executive/corridors" })} className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-amber-400">Inspect Corridor →</button>
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
