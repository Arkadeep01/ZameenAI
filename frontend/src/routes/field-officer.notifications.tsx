import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bell, CircleAlert, ClipboardList, RefreshCw } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { notifications } from "../features/fieldOfficer/fieldOfficerData";

export const Route = createFileRoute("/field-officer/notifications")({
  component: FieldOfficerNotifications,
});

function FieldOfficerNotifications() {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Field Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Alerts, assignments, and clarification directives from the Circle Revenue Office.</p>
        </div>
        <button className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50">Mark All as Read</button>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        {notifications.map((n) => (
          <PortalCard key={n.title} className={`!p-4 ${n.unread ? "!border-emerald-200 !bg-emerald-50/40" : ""}`}>
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-emerald-800">
                {n.icon === "assign" ? <ClipboardList size={17} /> : n.icon === "clarify" ? <CircleAlert size={17} className="text-red-600" /> : n.icon === "sync" ? <RefreshCw size={17} className="text-amber-600" /> : <Bell size={17} className="text-blue-600" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-start justify-between gap-2 text-sm font-bold text-slate-900">{n.title} <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-medium text-slate-400">{n.time} {n.unread && <span className="h-2 w-2 rounded-full bg-emerald-700" />}</span></p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                <button onClick={() => navigate({ to: "/field-officer/assignments" })} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-900">Open Assignment <ArrowRight size={13} /></button>
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
