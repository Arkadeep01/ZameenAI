import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { forecasts } from "../features/executive/executiveData";

export const Route = createFileRoute("/executive/predictive")({
  component: ExecutivePredictive,
});

function ExecutivePredictive() {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 21 – Predictive Intelligence · GatiShakti ML Subsystem</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Predictive Milestone Slippage &amp; Risk Forecasts</h1>
          <p className="mt-1 text-sm text-slate-500">Automated spatial and legal risk indicators estimating probability of statutory timeline slippages and land acquisition delays.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white"><Sparkles size={13} /> Predictive Indicator</span>
      </div>
      <div className="space-y-4">
        {forecasts.map((f) => (
          <PortalCard key={f.id} className="!p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-bold text-slate-900"><span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-amber-800">{f.id}</span>{f.title}</p>
              <p className="flex flex-wrap gap-1.5 font-mono text-[10px] font-black">
                <span className={`rounded px-1.5 py-0.5 ${f.risk.startsWith("HIGH") ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{f.risk}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{f.delay}</span>
              </p>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2 rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-white sm:grid-cols-3">
              <span><span className="block text-slate-400">Model / Source</span><b>{f.model}</b></span>
              <span><span className="block text-slate-400">Generated At</span><b>{f.gen}</b></span>
              <span><span className="block text-slate-400">Affected Jurisdiction</span><b>{f.jur}</b></span>
            </div>
            <p className="mt-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Relevant Contributing Factors (Model Parameters):</p>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {f.factors.map((x) => (
                <p key={x} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600">◆ {x}</p>
              ))}
            </div>
            <div className="mt-2.5 flex flex-col gap-2 rounded-lg bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-relaxed text-slate-700"><b>Recommended Decision-Maker Escalation:</b> {f.esc}</p>
              <button onClick={() => navigate({ to: "/executive/corridors" })} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white">Inspect Corridor Dossier →</button>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
