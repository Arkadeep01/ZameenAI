import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import StatusBadge from "../components/common/StatusBadge";

import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { useCitizenProfile } from "../services/citizen";
import { citizenInfo } from "../utils/gisMockData";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useCitizenProfile();
  const citizenName = profile?.name || citizenInfo.name;
  const village = profile?.village || citizenInfo.village;

  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/profile")}
        title="Citizen Identity &amp; Landowner Profile"
        subtitle="Aadhaar-authenticated digital identity linked with state land revenue registers"
      />

      <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs sm:p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#062B52] text-xl font-bold text-white">
            RK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#062B52]">{citizenName}</h2>
              <StatusBadge status="e-KYC Verified" size="md" />
            </div>
            <p className="text-xs text-slate-500">
              Primary Landholder • Aadhaar Linked: XXXX-XXXX-4819
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-3.5 space-y-1">
            <span className="text-slate-500 font-medium">Permanent Village</span>
            <p className="font-bold text-slate-800">{village}, Sadar Tehsil</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3.5 space-y-1">
            <span className="text-slate-500 font-medium">District &amp; State</span>
            <p className="font-bold text-slate-800">Varanasi, Uttar Pradesh</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3.5 space-y-1">
            <span className="text-slate-500 font-medium">Registered Mobile</span>
            <p className="font-bold text-slate-800">+91 98765 43210 (OTP Enabled)</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3.5 space-y-1">
            <span className="text-slate-500 font-medium">Total Registered Parcels</span>
            <p className="font-bold text-slate-800">3 Holdings (4.50 Hectares)</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default ProfilePage;
