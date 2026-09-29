import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Globe, CheckCircle2, ShieldCheck, Key, Smartphone } from "lucide-react";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [lang, setLang] = useState("en");
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [digilocker, setDigilocker] = useState(true);

  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/settings")}
        title="Portal Settings & Security"
        subtitle="Configure language, notification preferences, and authentication methods"
      />

      <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs sm:p-6 space-y-6">
        {/* Language & Region */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <Globe size={16} className="text-[#1261A8]" />
            Preferred Language for Land Records & Notices
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
          >
            <option value="en">English (Default)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="mr">मराठी (Marathi)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
          </select>
        </div>

        <div className="border-t border-slate-100 pt-5" />

        {/* Notification Preferences */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <Bell size={16} className="text-[#1261A8]" />
            Notification Delivery Channels
          </h3>
          <p className="text-xs text-slate-500">
            Choose how you receive critical updates about your land holdings
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-[#1261A8] focus:ring-[#1261A8]"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Critical SMS & WhatsApp Alerts</p>
                  <p className="text-xs text-slate-500">
                    Receive instant notifications for acquisition notices and mutation stages
                  </p>
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-[#1261A8] focus:ring-[#1261A8]"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Email Notifications</p>
                  <p className="text-xs text-slate-500">
                    Weekly digest of land record updates and official gazettes
                  </p>
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={pushAlerts}
                  onChange={(e) => setPushAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-[#1261A8] focus:ring-[#1261A8]"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Push Notifications</p>
                  <p className="text-xs text-slate-500">
                    Real-time alerts via the ZameenAI mobile app
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5" />

        {/* Security & Authentication */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#1261A8]" />
            Security & Authentication
          </h3>
          <p className="text-xs text-slate-500">
            Government STQC compliant two-factor authentication and session security
          </p>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Aadhaar OTP Two-Factor Authentication</h4>
                  <p className="text-xs text-slate-500">
                    Required for downloading signed RoRs and viewing compensation awards
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1261A8]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-[#1261A8]">
                  <Key size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">DigiLocker Integration</h4>
                  <p className="text-xs text-slate-500">
                    Consent-based document retrieval from national digital repository
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={digilocker}
                  onChange={(e) => setDigilocker(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1261A8]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Session Timeout</h4>
                  <p className="text-xs text-slate-500">Auto-logout after 30 minutes of inactivity (mandatory)</p>
                </div>
              </div>
              <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                Enforced
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default SettingsPage;