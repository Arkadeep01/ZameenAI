import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Bell } from "lucide-react";

import { PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { SevBadge } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  const navigate = useNavigate();
  const { notifs, setNotifs, unread, showToast } = useAdmin();

  const markAllRead = () => {
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
    showToast("All notifications marked as read.");
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">System Alerts & Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Security, integration, workflow and maintenance signals. {unread} unread.
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="w-fit rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Mark All as Read
        </button>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        {notifs.map((n) => (
          <PortalCard key={n.id} className={`!p-4 ${!n.read ? "!border-emerald-200 !bg-emerald-50/40" : ""}`}>
            <div className="flex gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  n.sev === "ERROR" || n.sev === "CRITICAL"
                    ? "bg-red-100 text-red-600"
                    : n.sev === "WARNING"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {n.sev === "INFO" ? <Bell size={16} /> : <AlertTriangle size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-start justify-between gap-2 text-sm font-bold text-slate-900">
                  {n.title}
                  <span className="flex shrink-0 items-center gap-2">
                    <SevBadge sev={n.sev} />
                    <span className="font-mono text-[10px] font-medium text-slate-400">{n.ts}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">Category: {n.cat}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      navigate({ to: n.to });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                  >
                    Investigate <ArrowRight size={12} />
                  </button>
                  {!n.read && (
                    <button
                      onClick={() => setNotifs((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminNotifications;
