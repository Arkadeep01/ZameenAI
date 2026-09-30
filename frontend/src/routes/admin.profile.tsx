import { createFileRoute } from "@tanstack/react-router";
import { LogOut, Printer, ShieldCheck } from "lucide-react";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { ADMIN } from "../features/admin/adminData";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfile,
});

function AdminProfile() {
  const { askConfirm, showToast } = useAdmin();

  return (
    <>
      <GreetingHeader
        eyebrow="Platform Control • Zero-Trust Session"
        title="System Administrator Profile"
        subtitle="Session identity, credential posture and delegation boundaries."
        actions={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Printer size={14} /> Print Profile
          </button>
        }
      />
      <div className="mx-auto w-full max-w-3xl">
        <PortalCard>
          <div className="flex items-start gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-base font-black text-white">
              RS
            </span>
            <div>
              <p className="text-lg font-black text-slate-900">{ADMIN.name}, ITS</p>
              <p className="mt-0.5 text-xs text-slate-500">{ADMIN.designation}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700">
                  ROLE: SYSTEM_ADMIN
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-slate-600">
                  <ShieldCheck size={12} /> {ADMIN.badge}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Official Email</p>
              <p className="mt-0.5 break-all font-mono font-bold text-slate-800">{ADMIN.email}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Jurisdiction</p>
              <p className="mt-0.5 font-bold text-slate-800">{ADMIN.jurisdiction}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">MFA Posture</p>
              <p className="mt-0.5 font-bold text-emerald-700">Hardware key + Jan Parichay OTP enforced</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Session</p>
              <p className="mt-0.5 font-mono font-bold text-slate-800">GovNIC VPN · 20 min idle timeout</p>
            </div>
          </div>
        </PortalCard>
        <PortalCard className="mt-4 border-red-200">
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-900">
            <LogOut size={15} /> Session Controls
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Terminating the session revokes tokens in Jan Parichay and records termination in the audit log.
          </p>
          <button
            onClick={() =>
              askConfirm({
                title: "Terminate Administrative Session",
                message: "End your secure platform administrator session?",
                impactWarning:
                  "Active authentication tokens will be revoked in Jan Parichay and audit logs will record session termination.",
                confirmButtonText: "Confirm Sign Out",
                dangerLevel: "warning",
                onConfirm: () => showToast("Signed out. Session token cleared from memory."),
              })
            }
            className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            Secure Logout
          </button>
        </PortalCard>
      </div>
    </>
  );
}

export default AdminProfile;
