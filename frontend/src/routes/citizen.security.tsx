import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, Key } from "lucide-react";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/security")({
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/security")}
        title="Security &amp; Access Controls"
        subtitle="Government STQC compliant two-factor authentication and session security"
      />

      <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Aadhaar OTP Two-Factor Authentication</h3>
              <p className="text-xs text-slate-500">Required for downloading signed RoRs and viewing compensation awards</p>
            </div>
          </div>
          <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
            Enabled
          </span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-[#1261A8]">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">DigiLocker Integration</h3>
              <p className="text-xs text-slate-500">Consent-based document retrieval from national digital repository</p>
            </div>
          </div>
          <span className="rounded bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
            Linked
          </span>
        </div>
      </div>
    </PageContainer>
  );
}

export default SecurityPage;
