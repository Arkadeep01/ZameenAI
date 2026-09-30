import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bell, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { notifCounts, notifGroups, notifItems } from "../features/pia/piaData";
import { usePia } from "../features/pia/PiaStore";

export const Route = createFileRoute("/pia/notifications")({
  component: PiaNotifications,
});

function PiaNotifications() {
  const navigate = useNavigate();
  const { notifTab, setNotifTab } = usePia();

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl"><Bell size={24} className="text-emerald-600" /> PIA Notification &amp; Action Center</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time updates on statutory filings, LAO return notices, and milestone deadlines</p>
        </div>
        <button className="w-fit rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Mark all as read</button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
        {notifGroups.map((g) => (
          <button key={g} onClick={() => setNotifTab(g)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 ${notifTab === g ? "border-b-2 border-emerald-600 bg-emerald-50/60 text-emerald-800" : "text-slate-500 hover:text-slate-800"}`}>
            {g} <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${notifTab === g ? "bg-emerald-600 text-white" : g === "Action Required" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>{notifCounts[g]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {notifItems.map((n) => (
          <PortalCard key={n.title} className={n.urgent ? "!border-red-200 !bg-red-50/40" : ""}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-2.5">
                {n.icon === "alert" ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-red-500" /> : n.icon === "check" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <Clock3 size={18} className="mt-0.5 shrink-0 text-sky-600" />}
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">{n.title} <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-slate-400">{n.meta}</p>
                </div>
              </div>
              <button onClick={() => navigate({ to: "/pia/cases" })} className="inline-flex w-fit shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white">Action <ArrowRight size={12} /></button>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
