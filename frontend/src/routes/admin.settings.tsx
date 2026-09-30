import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Save } from "lucide-react";

import { PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { SETTING_FIELDS } from "../features/admin/adminData";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { settings, setSettings, settingsSaved, setSettingsSaved, askConfirm, logAudit, showToast } = useAdmin();

  const sections = Array.from(new Set(SETTING_FIELDS.map((f) => f.section)));

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Platform Settings & Governance</h1>
          <p className="mt-1 text-sm text-slate-500">Every save is a HIGH-severity audit event with the stated reason.</p>
        </div>
        <div className="flex items-center gap-2">
          {settingsSaved && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
          <button
            onClick={() =>
              askConfirm({
                title: "Commit Platform Settings",
                message: "Persist all platform setting changes to production?",
                impactWarning: "Security, SSO and maintenance flags take effect on next request cycle.",
                confirmButtonText: "Save Settings",
                dangerLevel: "warning",
                requiresReason: true,
                onConfirm: (reason) => {
                  setSettingsSaved(true);
                  logAudit("SYSTEM_SETTINGS_UPDATE", "System Settings", "CORE_SETTINGS_V1", "HIGH", reason || "Updated platform settings");
                  showToast("Platform settings saved.");
                },
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Save size={14} /> Save Settings
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((sec) => (
          <PortalCard key={sec} className="!p-4">
            <h2 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-[#0B1F44]">
              {sec}
            </h2>
            <div className="mt-3 space-y-3">
              {SETTING_FIELDS.filter((f) => f.section === sec).map((f) => (
                <div key={f.key}>
                  {f.type === "checkbox" ? (
                    <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                      {f.label}
                      <button
                        type="button"
                        onClick={() => {
                          setSettings((p) => ({ ...p, [f.key]: !p[f.key] }));
                          setSettingsSaved(false);
                        }}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                          settings[f.key] ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                            settings[f.key] ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  ) : (
                    <>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">{f.label}</label>
                      {f.type === "select" ? (
                        <select
                          value={String(settings[f.key])}
                          onChange={(e) => {
                            setSettings((p) => ({ ...p, [f.key]: e.target.value }));
                            setSettingsSaved(false);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs outline-none focus:border-emerald-600"
                        >
                          {f.options!.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type}
                          value={settings[f.key] as string | number}
                          onChange={(e) => {
                            setSettings((p) => ({
                              ...p,
                              [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                            }));
                            setSettingsSaved(false);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs outline-none focus:border-emerald-600"
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}

export default AdminSettings;
