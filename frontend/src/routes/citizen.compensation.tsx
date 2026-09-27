import React, { useState, useEffect } from "react";
import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import StatusBadge from "../components/common/StatusBadge";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import LandParcelSelector from "../components/common/LandParcelSelector";
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Download,
  ChevronRight,
  Info,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useCitizenLand } from "../services/citizen";
import { gisParcels } from "../utils/gisMockData";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";
import type { Parcel } from "../types/gis";

interface CompensationSearch {
  parcel?: string;
}

export const Route = createFileRoute("/citizen/compensation")({
  validateSearch: (search: Record<string, unknown>): CompensationSearch => {
    return {
      parcel: (search.parcel as string) || undefined,
    };
  },
  component: CompensationPage,
});

function CompensationPage() {
  const searchParams = useSearch({ from: "/citizen/compensation" });
  const { data: landSummary, isLoading } = useCitizenLand();
  const availableParcels = landSummary?.parcels || gisParcels;

  // Selected land parcel state
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [bankVerified, setBankVerified] = useState(false);

  // Initialize or synchronize selected parcel
  useEffect(() => {
    if (availableParcels.length > 0) {
      if (searchParams.parcel) {
        const found = availableParcels.find((p) => p.id === searchParams.parcel);
        if (found) {
          setSelectedParcel(found);
          return;
        }
      }

      // Default meaningful parcel: first under acquisition, or first available
      if (!selectedParcel) {
        const defaultAcq =
          availableParcels.find((p) => p.status === "acquisition") ||
          availableParcels[0];
        setSelectedParcel(defaultAcq);
      }
    }
  }, [availableParcels, searchParams.parcel]);

  const isAcquisition = selectedParcel?.status === "acquisition";
  const cleanKhasra = selectedParcel?.khasraNumber.replace(
    /^Khasra No\.\s*/i,
    "",
  ) || "184/2";

  // Dynamic valuation numbers derived from parcel and official statutory assessment
  const isHaripur342 = selectedParcel?.khasraNumber.includes("342/2");
  const valuation = isHaripur342
    ? {
        khasraLabel: "342/2",
        totalAward: "₹1,48,60,000",
        baseRate: "₹62,00,000",
        multiplier: "+ ₹15,50,000",
        solatium: "+ ₹62,00,000",
        interest: "+ ₹9,10,000",
        shareAmount: "₹74,30,000",
      }
    : {
        khasraLabel: "184/2",
        totalAward: "₹1,00,17,000",
        baseRate: "₹37,80,000",
        multiplier: "+ ₹9,45,000",
        solatium: "+ ₹47,25,000",
        interest: "+ ₹5,67,000",
        shareAmount: "₹50,08,500",
      };

  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      {/* Breadcrumb & Header */}
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/compensation")}
        title="Compensation &amp; Award Calculation"
        subtitle="Official valuation breakdown, DBT disbursement status, and PFMS bank verification"
        actions={
          isAcquisition ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <Clock size={14} aria-hidden="true" />
              Stage 4: Valuation Underway
            </span>
          ) : undefined
        }
      />

      {/* ================================================================== */}
      {/* LAND SELECTION CARD (Top of page, below header, above content)     */}
      {/* ================================================================== */}
      <LandParcelSelector
        label="Select Land Parcel"
        helperText="Select a registered land parcel to view compensation details."
        selectedParcelId={selectedParcel?.id || null}
        onSelectParcel={(parcel) => setSelectedParcel(parcel)}
        parcels={availableParcels}
        placeholder="Select land parcel"
      />

      {/* ================================================================== */}
      {/* EMPTY STATE: NO PARCEL SELECTED                                    */}
      {/* ================================================================== */}
      {!selectedParcel && (
        <div className="rounded-xl border border-[#D9E2EC] bg-white p-8 text-center shadow-xs">
          <h3 className="text-base font-bold text-[#062B52]">
            Select a land parcel to view compensation details.
          </h3>
          <p className="mt-1 text-xs text-[#64748B] max-w-md mx-auto">
            Choose a registered land parcel from the dropdown above to display
            its official valuation breakdown, statutory multipliers, and PFMS bank verification.
          </p>
        </div>
      )}

      {/* ================================================================== */}
      {/* PARCEL NOT UNDER ACQUISITION                                       */}
      {/* ================================================================== */}
      {selectedParcel && !isAcquisition && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={24} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#062B52]">
                  No Compensation Award Applicable
                </h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Safe / Not Under Acquisition
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Parcel <strong>Khasra {cleanKhasra}</strong> ({selectedParcel.area}{" "}
                {selectedParcel.areaUnit || "Acre"} in {selectedParcel.village}
                {selectedParcel.district ? `, ${selectedParcel.district}` : ""}) is
                not subject to any government acquisition notification. Compensation
                awards and statutory direct disbursements apply solely to parcels notified
                under the RFCTLARR Act, 2013.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/citizen/my-land"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#062B52] hover:bg-slate-50 transition"
            >
              <span>View in My Land</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ACTIVE COMPENSATION CONTENT                                        */}
      {/* ================================================================== */}
      {selectedParcel && isAcquisition && (
        <>
          {/* Action Required: Bank Verification Banner */}
          <div className="rounded-xl border border-amber-200 bg-[#fffaf2] p-5 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status="Action Required" size="md" />
                    <h2 className="text-base font-bold text-[#062B52]">
                      Verify Aadhaar-Seeded Bank Account for Direct Benefit Transfer (DBT)
                    </h2>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Compensation awards for Khasra {cleanKhasra} will be electronically
                    disbursed directly via PFMS (Public Financial Management System) into
                    your verified bank account with zero intermediaries.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBankVerified((prev) => !prev)}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                  bankVerified
                    ? "bg-emerald-600 text-white"
                    : "bg-[#1261A8] text-white hover:bg-[#1261A8]"
                }`}
              >
                {bankVerified ? (
                  <>
                    <CheckCircle2 size={16} />
                    Bank Account Verified
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Verify Bank Details
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Compensation Calculation Breakdown (Schedule I) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#062B52]">
                      Compensation Award Calculation (Schedule I)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calculated under the RFCTLARR Act 2013 for Parcel Khasra {cleanKhasra} ({selectedParcel.village})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-slate-500">
                      Total Estimated Award
                    </span>
                    <p className="text-lg font-black text-[#1261A8]">
                      {valuation.totalAward}
                    </p>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div className="mt-4 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">
                        1. Base Circle Rate / Market Value
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Notified circle rate for agricultural land (per hectare)
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {valuation.baseRate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">
                        2. Rural Area Multiplier (1.25x)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Statutory distance factor for rural notified zone
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {valuation.multiplier}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">
                        3. Solatium (100% of Base + Multiplier)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Mandatory statutory compensation under Section 30(1)
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {valuation.solatium}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">
                        4. Additional Interest u/s 30(3) (12% p.a.)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Accrued interest from Section 11 publication date
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {valuation.interest}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 bg-slate-50 px-3 rounded-lg font-bold text-slate-900 mt-2">
                    <span className="text-sm text-[#062B52]">
                      Gross Disbursable Compensation
                    </span>
                    <span className="text-base font-black text-[#1261A8]">
                      {valuation.totalAward}
                    </span>
                  </div>
                </div>
              </div>

              {/* Co-Sharers Distribution */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#062B52]">
                  Co-Sharer Entitlement &amp; Share Proportion
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-2.5 px-3 font-semibold">Landowner Name</th>
                        <th className="py-2.5 px-3 font-semibold">Share</th>
                        <th className="py-2.5 px-3 font-semibold">Entitled Amount</th>
                        <th className="py-2.5 px-3 font-semibold">PFMS Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          Ramesh Kumar Sharma (You)
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">50%</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1261A8]">
                          {valuation.shareAmount}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                              bankVerified
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {bankVerified ? "Verified" : "Awaiting Verification"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          Suresh Kumar Sharma
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">50%</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1261A8]">
                          {valuation.shareAmount}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Awaiting Verification
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#062B52]">
                  PFMS Disbursal Protocol
                </h3>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      size={16}
                      className="mt-0.5 text-emerald-600 shrink-0"
                    />
                    <p>
                      Funds are remitted directly from the Ministry Escrow Ledger into
                      your Aadhaar-seeded bank account.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 text-emerald-600 shrink-0"
                    />
                    <p>
                      Zero intermediaries, zero processing fees, and full statutory
                      transparency.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Info size={16} className="mt-0.5 text-sky-600 shrink-0" />
                    <p>
                      You will receive an SMS and email alert from PFMS upon final
                      disbursement approval.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Link
                    to="/citizen/acquisition-status"
                    search={{ parcel: selectedParcel.id }}
                    className="flex items-center justify-between text-xs font-semibold text-[#1261A8] hover:underline"
                  >
                    <span>View Stage 4 Timeline</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-[#062B52]">
                  Certified Extracts
                </h3>
                <p className="text-xs text-slate-500">
                  Download digitally signed valuation sheets and statutory award
                  drafts.
                </p>
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Download size={14} />
                  Download Valuation Schedule (PDF)
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default CompensationPage;
