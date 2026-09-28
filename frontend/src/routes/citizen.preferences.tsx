import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/preferences")({
  component: PreferencesPage,
});

function PreferencesPage() {
  const [lang, setLang] = useState("en");
  const [smsAlerts, setSmsAlerts] = useState(true);

  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/preferences")}
        title="Portal Preferences &amp; Language"
        subtitle="Customize language of notification, SMS alert delivery, and document presentation"
      />

      <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs sm:p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <Globe size={16} className="text-[#1261A8]" />
            Preferred Language for Land Records &amp; Notices
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
          >
            <option value="en">English (Default)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="bn">বাংলা (Bengali)</option>
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <div>
            <p className="text-xs font-bold text-slate-800">Critical SMS &amp; WhatsApp Alerts</p>
            <p className="text-xs text-slate-500">Receive instant notifications for acquisition notices and mutation stages</p>
          </div>
          <input
            type="checkbox"
            checked={smsAlerts}
            onChange={(e) => setSmsAlerts(e.target.checked)}
            className="h-4 w-4 rounded text-[#1261A8] focus:ring-[#1261A8]"
          />
        </div>
      </div>
    </PageContainer>
  );
}

export default PreferencesPage;
