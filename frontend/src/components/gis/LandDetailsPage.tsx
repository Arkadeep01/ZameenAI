import { useMemo, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderOpen,
  Gavel,
  Info,
  Landmark,
  Map,
  MapPin,
  Phone,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";

import CitizenGISMap from "../../components/gis/CitizenGISMap";

import { gisParcels } from "../../utils/gisMockData";

import type { Parcel } from "../../types/gis";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type SearchParams = {
  parcel?: string;
};

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function LandDetailsPage() {
  const navigate = useNavigate();

  const search = useSearch({
    from: "/citizen/land-details",
  }) as SearchParams;

  /* ======================================================================== */
  /* SELECT PARCEL                                                            */
  /* ======================================================================== */

  const selectedParcel = useMemo<Parcel | null>(() => {
    const parcelId = search?.parcel;

    if (parcelId) {
      const found = gisParcels.find(
        (parcel) => String(parcel.id) === String(parcelId),
      );

      if (found) {
        return found;
      }
    }

    return gisParcels[1] ?? gisParcels[0] ?? null;
  }, [search?.parcel]);

  /* ======================================================================== */
  /* FALLBACK                                                                 */
  /* ======================================================================== */

  if (!selectedParcel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-4 py-10 text-[#17324d]">
        <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Info className="mx-auto h-10 w-10 text-slate-400" />

          <h1 className="mt-4 text-xl font-extrabold text-[#153550]">
            Land Record Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The requested parcel could not be found in the registered land
            records.
          </p>

          <button
            type="button"
            onClick={() => navigate({ to: "/citizen/my-land" })}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#123f5c] px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b3048] hover:shadow-lg"
          >
            <ArrowLeft size={16} />
            Back to My Land
          </button>
        </div>
      </div>
    );
  }

  /* ======================================================================== */
  /* DATA                                                                     */
  /* ======================================================================== */

  const parcel = selectedParcel;

  const isAcquisition = parcel.status === "acquisition";

  const landArea = `${Number(parcel.area ?? 0).toFixed(2)} ${
    parcel.areaUnit ?? "Acres"
  }`;

  const surveyNumber = parcel.surveyNumber || `SV-${parcel.id}`;

  const khasraNumber = parcel.khasraNumber || "458";

  const plotNumber = parcel.plotNumber || String(parcel.id);

  const dagNumber = parcel.dagNumber || "782";

  const village = parcel.village || "Haripur";

  const tehsil = parcel.tehsil || "Sadar";

  const district = parcel.district || "Hooghly";

  const state = parcel.state || "West Bengal";

  const landType = parcel.landType || "Agricultural (Fasli)";

  /* ======================================================================== */
  /* NAVIGATION                                                               */
  /* ======================================================================== */

  const goBackToMap = () => {
    navigate({
      to: "/citizen/my-land-map",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  const goBackToMyLand = () => {
    navigate({
      to: "/citizen/my-land",
    });
  };

  /* ======================================================================== */
  /* RENDER                                                                   */
  /* ======================================================================== */

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f8fb] text-[#17324d]">
      <main className="mx-auto w-full max-w-[1500px] px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        {/* ================================================================== */}
        {/* BREADCRUMB                                                         */}
        {/* ================================================================== */}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold text-slate-500 sm:text-[10px]">
            <button
              type="button"
              onClick={goBackToMyLand}
              className="transition-colors hover:text-[#123f5c]"
            >
              My Land
            </button>

            <span className="text-slate-300">›</span>

            <span className="text-[#123f5c]">Land Details</span>

            <span className="text-slate-300">›</span>

            <span className="rounded bg-[#dff0f8] px-1.5 py-0.5 text-[#123f5c]">
              Parcel {parcel.id}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 text-[8px] font-semibold text-emerald-700 sm:text-[9px]">
            <CheckCircle2 size={10} />
            Verified against Land Registry Ledger
          </div>
        </div>

        {/* ================================================================== */}
        {/* PAGE HEADER                                                         */}
        {/* ================================================================== */}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-[#123a57] sm:text-2xl lg:text-3xl">
                  Land Details
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full bg-[#123f5c] px-2 py-1 text-[7px] font-extrabold tracking-wider text-white sm:text-[8px]">
                  <ShieldCheck size={10} />
                  OFFICIAL STATE RECORD
                </span>
              </div>

              <p className="mt-1 max-w-2xl text-[9px] leading-4 text-slate-500 sm:text-[10px]">
                View the complete registered information, survey metrics,
                co-ownership, and acquisition status for your land parcel.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-sky-100 bg-[#e7f5fc] px-3 py-2.5 text-[9px] font-bold text-[#174b69] transition-all hover:-translate-y-0.5 hover:bg-[#d9effa] hover:shadow-md sm:flex-none"
              >
                <Download size={14} />
                Download Land Details (PDF)
              </button>

              <button
                type="button"
                onClick={goBackToMap}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-3 py-2.5 text-[9px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b3048] hover:shadow-lg sm:flex-none"
              >
                <Map size={14} />
                Back to Map
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* CADASTRAL IDENTIFICATION                                           */}
        {/* ================================================================== */}

        <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="bg-[#e4f4fb] px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#123f5c] text-white">
                  <Landmark size={18} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[7px] font-extrabold tracking-widest text-slate-500">
                      CADASTRAL IDENTIFICATION
                    </span>

                    <span className="rounded bg-white px-1.5 py-0.5 text-[7px] font-bold text-[#174b69]">
                      Government Certified
                    </span>
                  </div>

                  <h2 className="text-lg font-extrabold text-[#123a57]">
                    Parcel {parcel.id}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>
                  <Landmark size={11} />
                  {landType}
                </Badge>

                <Badge>
                  <MapPin size={11} />
                  {village}, {district}, {state}
                </Badge>
              </div>
            </div>
          </div>

          {/* Identification cards */}

          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 lg:p-4">
            <MetricBox
              label="REGISTERED LAND AREA"
              value={landArea}
              description="Registered cadastral area"
            />

            <MetricBox
              label="SURVEY NUMBER"
              value={surveyNumber}
              description="Cadastral survey reference"
            />

            <MetricBox
              label="DAG / KHASRA NO."
              value={`DG-${dagNumber} / KH-${khasraNumber}`}
              description="Revenue ledger reference"
            />

            <MetricBox
              label="CURRENT PARCEL STATUS"
              value={
                isAcquisition
                  ? "Under Acquisition"
                  : parcel.statusLabel || "Safe / Verified"
              }
              description={
                isAcquisition
                  ? "Active government acquisition notice"
                  : "No active acquisition notice"
              }
              status={isAcquisition ? "warning" : "safe"}
            />
          </div>

          {/* Acquisition notice */}

          {isAcquisition && (
            <div className="mx-3 mb-3 rounded-lg border border-amber-200 bg-[#fff3e3] p-3 sm:mx-4 sm:mb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    <Gavel size={17} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-amber-900 sm:text-[11px]">
                      Government Statutory Notice in Effect
                    </p>

                    <p className="mt-0.5 text-[9px] leading-4 text-amber-900/80 sm:text-[10px]">
                      Your land is currently included in an official government
                      acquisition process.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#123f5c] px-3 py-2 text-[8px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b3048] hover:shadow-md"
                >
                  View Acquisition Status
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* LAND INFORMATION + LAND LOCATION                                  */}
        {/* ================================================================== */}

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.95fr)]">
          {/* ================================================================= */}
          {/* LAND INFORMATION                                                 */}
          {/* ================================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <SectionHeader
              icon={<FileText size={17} />}
              title="Land Information"
              right="Updated: 10 Sept 2026"
            />

            <p className="mt-3 text-[9px] leading-4 text-slate-500 sm:text-[10px]">
              Official records registered with the Directorate of Land Records
              &amp; Surveys, {state}.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <InformationBox
                label="Survey Number"
                value={surveyNumber}
                description="Cadastral survey reference"
              />

              <InformationBox
                label="Khasra Number"
                value={`KH-${khasraNumber}`}
                description="Primary revenue division"
              />

              <InformationBox
                label="Plot Number"
                value={`PL-${plotNumber}`}
                description="Cadastral vector identification"
              />

              <InformationBox
                label="Dag Number"
                value={`DG-${dagNumber}`}
                description="Sub-plot partition reference"
              />

              <InformationBox
                label="Registered Area"
                value={landArea}
                description="Registered parcel area"
              />

              <InformationBox
                label="Land Category"
                value={landType}
                description="Recorded land classification"
              />

              <InformationBox
                label="Mutation Status"
                value="Certified Clear Title"
                description="Latest mutation record"
                icon={<CheckCircle2 size={13} />}
                positive
              />

              <InformationBox
                label="Official Record ID"
                value={`LR-2026-${parcel.id}`}
                description="Digital land record reference"
              />
            </div>
          </section>

          {/* ================================================================= */}
          {/* LAND LOCATION                                                    */}
          {/* ================================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <SectionHeader
              icon={<MapPin size={17} />}
              title="Land Location"
              right="GIS Cadastral View"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <InformationBox label="Village" value={village} compact />

              <InformationBox
                label="Gram Panchayat"
                value="Haripur North"
                compact
              />

              <InformationBox
                label="Tehsil / Block"
                value={`${tehsil} / Sadar`}
                compact
              />

              <InformationBox
                label="District & State"
                value={`${district}, ${state}`}
                compact
              />
            </div>

            {/* ============================================================= */}
            {/* REAL CITIZEN GIS MAP                                          */}
            {/* ============================================================= */}

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-col gap-1 border-b border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[8px] font-bold text-[#294c63]">
                  Cadastral GIS Map
                </span>

                <span
                  className={[
                    "w-fit rounded px-1.5 py-1 text-[7px] font-bold",
                    isAcquisition
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-700",
                  ].join(" ")}
                >
                  {isAcquisition ? "Acquisition Zone" : "Registered Parcel"}
                </span>
              </div>

              {/* IMPORTANT:
                  This is the actual CitizenGISMap component.
                  No fake CSS map is used here.
              */}

              <div className="relative w-full">
                <CitizenGISMap
                  parcels={gisParcels}
                  selectedParcel={parcel}
                  onSelectParcel={() => {}}
                  className="h-[440px] sm:h-[480px] lg:h-[500px]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={goBackToMap}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#123f5c] px-3 py-2.5 text-[8px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b3048] hover:shadow-md"
            >
              <Map size={13} />
              View on Fullscreen Interactive Map
            </button>
          </section>
        </div>

        {/* ================================================================== */}
        {/* DOCUMENTS + OWNER                                                  */}
        {/* ================================================================== */}

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.95fr)]">
          {/* ================================================================= */}
          {/* DOCUMENTS                                                         */}
          {/* ================================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <SectionHeader
              icon={<FolderOpen size={17} />}
              title="Important Documents"
              right="3 Active Files"
            />

            <p className="mt-3 text-[9px] leading-4 text-slate-500 sm:text-[10px]">
              These documents are digitally signed and legally admissible in
              revenue departments.
            </p>

            <div className="mt-3 space-y-2">
              <DocumentRow
                icon={<FileText size={17} />}
                title="Land Record (RoR / Khatian)"
                date="Issued: 12 June 2026"
                type="PDF · 1.2 MB"
                verified
              />

              <DocumentRow
                icon={<Gavel size={17} />}
                title="Acquisition Notice"
                date="Issued: 10 September 2026"
                type="PDF · 840 KB"
                warning
              />

              <DocumentRow
                icon={<FileCheck2 size={17} />}
                title="Field Verification Report"
                date="Surveyed: 08 September 2026"
                type="PDF · 2.1 MB"
                verified
              />
            </div>

            <div className="mt-3 flex flex-col gap-2 text-[8px] sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-500">Need historical deeds?</span>

              <button
                type="button"
                className="inline-flex items-center gap-1 font-bold text-[#123f5c] transition-colors hover:text-sky-600"
              >
                View All Documents
                <ArrowRight size={11} />
              </button>
            </div>
          </section>

          {/* ================================================================= */}
          {/* OWNER INFORMATION                                                 */}
          {/* ================================================================= */}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <SectionHeader
              icon={<Users size={17} />}
              title="Owner Information"
              right="Aadhaar e-KYC Verified"
              rightPositive
            />

            <div className="mt-3 rounded-lg bg-[#e6f5fb] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[7px] font-bold tracking-wide text-slate-500">
                    PRIMARY RECORD HOLDER
                  </span>

                  <h3 className="mt-1 text-base font-extrabold text-[#173c56]">
                    Rajesh Kumar Sharma
                  </h3>
                </div>

                <span className="rounded bg-[#123f5c] px-2 py-1 text-[7px] font-bold text-white">
                  50% Ownership Share
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 text-[8px] sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Father's Name</span>

                  <strong className="mt-0.5 block text-slate-700">
                    Mohan Kumar Sharma
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500">Resident Status</span>

                  <strong className="mt-0.5 block text-slate-700">
                    Rural Resident
                  </strong>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[7px] font-extrabold tracking-wide text-slate-500">
              REGISTERED CO-OWNERS
            </p>

            <div className="mt-2 space-y-2">
              <OwnerRow
                initials="SK"
                name="Suresh Kumar Sharma"
                relation="Brother · Co-Share"
                share="25% Share"
              />

              <OwnerRow
                initials="AK"
                name="Anita Kumar Sharma"
                relation="Sister · Co-Share"
                share="25% Share"
              />
            </div>

            <div className="mt-3 flex gap-2 rounded-lg bg-[#e1f1f8] p-3 text-[8px] leading-4 text-slate-600">
              <Info size={13} className="mt-0.5 shrink-0 text-[#174b69]" />

              <span>
                All co-sharers will receive compensation amounts proportional to
                their registered shares.
              </span>
            </div>
          </section>
        </div>

        {/* ================================================================== */}
        {/* ACQUISITION TIMELINE                                               */}
        {/* ================================================================== */}

        {isAcquisition && (
          <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bell size={17} className="text-amber-700" />

                  <h2 className="text-base font-extrabold text-[#173c56] sm:text-lg">
                    Current Acquisition Status &amp; Statutory Timeline
                  </h2>
                </div>

                <p className="mt-1 max-w-3xl text-[8px] leading-4 text-slate-500 sm:text-[9px]">
                  Your land is currently part of an acquisition process under
                  the applicable land acquisition procedure.
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#ffe1bd] px-2.5 py-2 text-[7px] font-extrabold text-amber-900">
                <Bell size={11} />
                Stage 4 of 6: In Progress
              </span>
            </div>

            {/* Timeline */}

            <div className="mt-6 overflow-x-auto pb-2">
              <div className="flex min-w-[700px] items-start justify-between">
                <TimelineStep
                  number="1"
                  title="Land Identified"
                  subtitle="Completed"
                  complete
                />

                <TimelineLine complete />

                <TimelineStep
                  number="2"
                  title="Verification"
                  subtitle="Completed"
                  complete
                />

                <TimelineLine complete />

                <TimelineStep
                  number="3"
                  title="Notice Issued"
                  subtitle="10 Sept 2026"
                  complete
                />

                <TimelineLine active />

                <TimelineStep
                  number="4"
                  title="Valuation"
                  subtitle="In Progress"
                  active
                />

                <TimelineLine />

                <TimelineStep
                  number="5"
                  title="Award Approval"
                  subtitle="Upcoming"
                />

                <TimelineLine />

                <TimelineStep
                  number="6"
                  title="Final Payment"
                  subtitle="Upcoming"
                />
              </div>
            </div>

            {/* Explanation */}

            <div className="mt-4 rounded-lg bg-[#e5f5fb] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 gap-2">
                  <CircleHelp
                    size={15}
                    className="mt-0.5 shrink-0 text-[#174b69]"
                  />

                  <div>
                    <p className="text-[9px] font-extrabold text-[#123f5c] sm:text-[10px]">
                      What does "Valuation In Progress" mean for you?
                    </p>

                    <p className="mt-1 text-[8px] leading-4 text-slate-600 sm:text-[9px]">
                      Government revenue authorities are currently assessing the
                      value of the land parcel. You will receive an official
                      notification when the valuation award is published.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#123f5c] px-3 py-2 text-[8px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b3048] hover:shadow-md"
                >
                  View Compensation Details
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* BANK DETAILS                                                        */}
        {/* ================================================================== */}

        {isAcquisition && (
          <section className="mt-3 rounded-xl border border-amber-200 bg-gradient-to-r from-[#fff3df] to-white p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5b3607] text-white">
                  <Wallet size={19} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#5b3607] px-2 py-1 text-[7px] font-extrabold tracking-wider text-white">
                      ACTION REQUIRED
                    </span>

                    <h2 className="text-sm font-extrabold text-[#243f52] sm:text-base">
                      Submit Bank Details for Direct Benefit Transfer
                    </h2>
                  </div>

                  <p className="mt-1 max-w-3xl text-[8px] leading-4 text-slate-600 sm:text-[9px]">
                    Verify your Aadhaar-linked bank account details to prevent
                    delays in compensation payment.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#123f5c] px-4 py-2.5 text-[8px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b3048] hover:shadow-lg"
              >
                <Wallet size={13} />
                Upload Bank Passbook &amp; ID
              </button>
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* ACTION CARDS                                                        */}
        {/* ================================================================== */}

        <section className="mt-5">
          <h2 className="text-lg font-extrabold text-[#123f5c]">
            What would you like to do?
          </h2>

          <p className="mt-0.5 text-[8px] text-slate-500 sm:text-[9px]">
            Instant actions related to your land record.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              icon={<Map size={18} />}
              title="View on Map"
              description="See the exact spatial boundaries, road connectivity, and neighbouring parcels."
              action="View Map"
              onClick={goBackToMap}
            />

            <ActionCard
              icon={<FileText size={18} />}
              title="View Documents"
              description="Download official digitally signed land records, mutation certificates, and notices."
              action="View Documents"
            />

            <ActionCard
              icon={<Wallet size={18} />}
              title="Check Compensation"
              description="View estimated valuation calculations, compensation additions, and payout schedules."
              action="Check Compensation"
            />

            <ActionCard
              icon={<TriangleAlert size={18} />}
              title="Report a Problem"
              description="Report incorrect survey numbers, spelling mistakes, area mismatch, or boundary discrepancies."
              action="File Grievance"
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* AUDIT BAR                                                           */}
        {/* ================================================================== */}

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
        >
          <span className="inline-flex items-center gap-2 text-[8px] font-extrabold text-[#173c56] sm:text-[9px]">
            <ShieldCheck size={13} className="text-[#174b69]" />
            Official Ledger Reference &amp; Audit Integrity Details
          </span>

          <span className="inline-flex items-center gap-1 text-[7px] font-bold text-slate-500">
            Click to expand
            <ChevronDown size={12} />
          </span>
        </button>

        {/* ================================================================== */}
        {/* HELP CARD                                                           */}
        {/* ================================================================== */}

        <section className="mt-3 rounded-xl border border-sky-100 bg-[#e1f4fc] p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CircleHelp size={20} />
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-[#173c56] sm:text-base">
                  Need help understanding your land details or rights?
                </h2>

                <p className="mt-1 max-w-2xl text-[8px] leading-4 text-slate-600 sm:text-[9px]">
                  If any detail on this page is confusing or you want assistance
                  with your land record, compensation, or legal papers, contact
                  the citizen helpline or local revenue office.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#23804a] px-4 py-2.5 text-[8px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1c6a3e] hover:shadow-md lg:flex-none"
              >
                <Phone size={13} />
                Call Toll-Free
              </button>

              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[8px] font-bold text-[#173c56] transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md lg:flex-none"
              >
                <Landmark size={13} />
                Find Tehsil Office
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* FOOTER                                                              */}
        {/* ================================================================== */}

        <p className="mx-auto mt-4 max-w-5xl text-center text-[7px] leading-3 text-slate-400">
          Records displayed are synchronized with the Revenue Registry. GIS
          boundaries are provided for citizen information and transparency. For
          certified cadastral copies, please contact your Tehsil Revenue Office.
        </p>
      </main>
    </div>
  );
}

/* ========================================================================== */
/* BADGE                                                                      */
/* ========================================================================== */

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[7px] font-bold text-[#294c63] shadow-sm">
      {children}
    </span>
  );
}

/* ========================================================================== */
/* METRIC BOX                                                                 */
/* ========================================================================== */

function MetricBox({
  label,
  value,
  description,
  status,
}: {
  label: string;
  value: string;
  description: string;
  status?: "safe" | "warning";
}) {
  return (
    <div
      className={[
        "min-w-0 rounded-lg border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        status === "warning"
          ? "border-amber-100 bg-[#fff7ec]"
          : "border-transparent bg-[#eef8fc]",
      ].join(" ")}
    >
      <p
        className={[
          "text-[7px] font-extrabold tracking-wide",
          status === "warning" ? "text-amber-800" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </p>

      <p
        className={[
          "mt-1 break-words text-base font-extrabold leading-tight sm:text-lg",
          status === "warning" ? "text-amber-900" : "text-[#294c63]",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-[7px] leading-3 text-slate-500">{description}</p>
    </div>
  );
}

/* ========================================================================== */
/* SECTION HEADER                                                             */
/* ========================================================================== */

function SectionHeader({
  icon,
  title,
  right,
  rightPositive = false,
}: {
  icon: ReactNode;
  title: string;
  right?: string;
  rightPositive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-[#123f5c]">{icon}</span>

        <h2 className="text-sm font-extrabold text-[#173c56] sm:text-base">
          {title}
        </h2>
      </div>

      {right && (
        <span
          className={[
            "w-fit rounded px-1.5 py-1 text-[7px] font-bold",
            rightPositive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#e5f3f9] text-[#174b69]",
          ].join(" ")}
        >
          {right}
        </span>
      )}
    </div>
  );
}

/* ========================================================================== */
/* INFORMATION BOX                                                            */
/* ========================================================================== */

function InformationBox({
  label,
  value,
  description,
  icon,
  positive = false,
  compact = false,
}: {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  positive?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "min-w-0 rounded-md bg-[#eaf6fb] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e1f2f9] hover:shadow-sm",
        compact ? "p-2.5" : "p-3",
      ].join(" ")}
    >
      <p className="text-[7px] font-bold text-slate-500">{label}</p>

      <div
        className={[
          "mt-1 flex items-center gap-1 text-[9px] font-extrabold sm:text-[10px]",
          positive ? "text-emerald-700" : "text-[#294c63]",
        ].join(" ")}
      >
        {icon}

        <span className="min-w-0 break-words">{value}</span>
      </div>

      {description && (
        <p className="mt-0.5 text-[7px] leading-3 text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

/* ========================================================================== */
/* DOCUMENT ROW                                                              */
/* ========================================================================== */

function DocumentRow({
  icon,
  title,
  date,
  type,
  verified = false,
  warning = false,
}: {
  icon: ReactNode;
  title: string;
  date: string;
  type: string;
  verified?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="group flex flex-col gap-3 rounded-md bg-[#e6f5fb] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#dceff7] hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            warning
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-[#174b69]",
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9px] font-extrabold text-[#294c63] sm:text-[10px]">
            {title}
          </p>

          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[7px] text-slate-500">
            <span>{date}</span>

            <span>•</span>

            <span>{type}</span>

            {verified && (
              <>
                <span>•</span>

                <span className="font-bold text-emerald-600">✓ Verified</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[7px] font-bold text-[#174b69] transition-all hover:bg-slate-50 hover:shadow-sm"
        >
          <ExternalLink size={10} />
          View
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 rounded-md bg-[#123f5c] px-2.5 py-2 text-[7px] font-bold text-white transition-all hover:bg-[#0b3048] hover:shadow-sm"
        >
          <Download size={10} />
          Download
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* OWNER ROW                                                                  */
/* ========================================================================== */

function OwnerRow({
  initials,
  name,
  relation,
  share,
}: {
  initials: string;
  name: string;
  relation: string;
  share: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-[#e6f5fb] p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#dceff7] hover:shadow-sm">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d5eaf4] text-[7px] font-extrabold text-[#174b69]">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[8px] font-extrabold text-[#294c63]">
          {name}
        </p>

        <p className="text-[7px] text-slate-500">{relation}</p>
      </div>

      <span className="shrink-0 rounded bg-white px-1.5 py-1 text-[7px] font-bold text-[#294c63]">
        {share}
      </span>
    </div>
  );
}

/* ========================================================================== */
/* TIMELINE STEP                                                              */
/* ========================================================================== */

function TimelineStep({
  number,
  title,
  subtitle,
  complete = false,
  active = false,
}: {
  number: string;
  title: string;
  subtitle: string;
  complete?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex w-[100px] shrink-0 flex-col items-center text-center">
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-lg text-[9px] font-extrabold transition-all",
          complete
            ? "bg-[#25804c] text-white"
            : active
              ? "bg-[#754707] text-white ring-2 ring-amber-200"
              : "bg-[#eaf5fb] text-slate-400",
        ].join(" ")}
      >
        {complete ? <Check size={14} /> : number}
      </div>

      <p
        className={[
          "mt-2 text-[7px] font-extrabold leading-3",
          active
            ? "text-amber-700"
            : complete
              ? "text-emerald-700"
              : "text-slate-500",
        ].join(" ")}
      >
        {number}. {title}
      </p>

      <p className="mt-0.5 text-[7px] text-slate-400">{subtitle}</p>
    </div>
  );
}

/* ========================================================================== */
/* TIMELINE LINE                                                              */
/* ========================================================================== */

function TimelineLine({
  complete = false,
  active = false,
}: {
  complete?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "mt-4 h-0.5 min-w-[35px] flex-1",
        complete ? "bg-emerald-500" : active ? "bg-amber-400" : "bg-slate-200",
      ].join(" ")}
    />
  );
}

/* ========================================================================== */
/* ACTION CARD                                                                */
/* ========================================================================== */

function ActionCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[175px] flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e4f3fa] text-[#174b69] transition-all duration-200 group-hover:bg-[#123f5c] group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-extrabold text-[#173c56]">{title}</h3>

      <p className="mt-2 flex-1 text-[8px] leading-4 text-slate-500 sm:text-[9px]">
        {description}
      </p>

      <span className="mt-3 inline-flex items-center gap-1 text-[8px] font-extrabold text-[#123f5c] transition-all group-hover:gap-2">
        {action}
        <ArrowRight size={11} />
      </span>
    </button>
  );
}
