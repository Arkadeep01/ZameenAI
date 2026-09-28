import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileCheck, CheckCircle2 } from "lucide-react";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { gisParcels } from "../utils/gisMockData";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/digitized-records")({
  component: DigitizedRecordsPage,
});

function DigitizedRecordsPage() {
  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/digitized-records")}
        title="Digitized Land Records &amp; RoR Archives"
        subtitle="High-resolution OCR verified digital copies with SHA-256 cryptographic provenance"
      />

      <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs sm:p-6">
        <div className="divide-y divide-slate-100">
          {gisParcels.map((parcel) => (
            <div key={parcel.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Record of Rights (Khatauni {parcel.khatauni})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Khasra {parcel.khasraNumber} • {parcel.village}, {parcel.district} • Area: {parcel.area}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={12} />
                  Verified Digital Copy
                </span>
                <Link
                  to="/citizen/land-details"
                  search={{ parcel: parcel.id }}
                  className="rounded-lg bg-[#062B52] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0C396E] transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

export default DigitizedRecordsPage;
