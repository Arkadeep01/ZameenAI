import { useMemo } from "react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
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
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import CitizenGISMap from "../components/gis/CitizenGISMap";
import { gisParcels } from "../utils/gisMockData";

import type { Parcel } from "../types/gis";
import type { ReactNode } from "react";

/* ========================================================================= */
/* ROUTE                                                                     */
/* ========================================================================= */

type SearchParams = {
  parcel?: string;
};

export const Route = createFileRoute("/citizen/land-details")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    parcel:
      search.parcel !== undefined && search.parcel !== null
        ? String(search.parcel).replace(/^["']|["']$/g, "")
        : undefined,
  }),

  component: LandDetailsPage,
});

/* ========================================================================= */
/* PAGE                                                                       */
/* ========================================================================= */

function LandDetailsPage() {
  const navigate = useNavigate();

  const search = useSearch({
    from: "/citizen/land-details",
  });

  /* ----------------------------------------------------------------------- */
  /* PARCEL                                                                    */
  /* ----------------------------------------------------------------------- */

  const parcel = useMemo<Parcel | null>(() => {
    const rawTarget = search.parcel
      ? String(search.parcel)
          .replace(/^["']|["']$/g, "")
          .trim()
      : null;
    if (rawTarget) {
      const found = gisParcels.find((item) => String(item.id) === rawTarget);

      if (found) {
        return found;
      }
    }

    return gisParcels[0] ?? null;
  }, [search.parcel]);

  /* ----------------------------------------------------------------------- */
  /* FALLBACK                                                                  */
  /* ----------------------------------------------------------------------- */

  if (!parcel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Info size={26} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-[#173c56]">
            Land Record Not Found
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            We could not find the land parcel you requested. Please return to
            your land records and select a parcel again.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/citizen/my-land",
              })
            }
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#123f5c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d3048]"
          >
            <ArrowLeft size={16} />
            Back to My Land
          </button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------------- */
  /* DERIVED DATA                                                              */
  /* ----------------------------------------------------------------------- */

  const isAcquisition = parcel.status === "acquisition";

  const area = `${Number(parcel.area ?? 0).toFixed(2)} ${
    parcel.areaUnit ?? "Acres"
  }`;

  const surveyNumber = parcel.surveyNumber || `SV-${parcel.id}`;

  const khasraNumber = parcel.khasraNumber || "458";

  const plotNumber = parcel.plotNumber ?? parcel.id;

  const dagNumber = parcel.dagNumber ?? "782";

  const village = parcel.village || "Haripur";

  const tehsil = parcel.tehsil || "Sadar";

  const district = parcel.district || "Hooghly";

  const state = parcel.state || "West Bengal";

  const landType = parcel.landType || "Agricultural Land";

  /* ----------------------------------------------------------------------- */
  /* NAVIGATION                                                                */
  /* ----------------------------------------------------------------------- */

  const goBack = () => {
    navigate({
      to: "/citizen/my-land",
    });
  };

  const openMap = () => {
    navigate({
      to: "/citizen/my-land-map",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  const openParcelDetails = (nextParcel: Parcel) => {
    navigate({
      to: "/citizen/land-details",
      search: {
        parcel: String(nextParcel.id),
      },
    });
  };

  /* ----------------------------------------------------------------------- */
  /* RENDER                                                                    */
  /* ----------------------------------------------------------------------- */

  return (
    <div className="min-h-screen w-full bg-[#f5f8fa] text-slate-800">
      <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        {/* ================================================================= */}
        {/* BREADCRUMB                                                        */}
        {/* ================================================================= */}

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={goBack}
              className="font-medium text-slate-500 transition hover:text-[#123f5c]"
            >
              My Land
            </button>

            <span className="text-slate-300">/</span>

            <span className="font-semibold text-[#123f5c]">Land Details</span>

            <span className="text-slate-300">/</span>

            <span className="rounded-md bg-[#e5f2f8] px-2 py-1 font-semibold text-[#174b69]">
              Parcel {parcel.id}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} />
            Verified Land Record
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN HEADER                                                        */}
        {/* ================================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#123f5c] text-white shadow-sm sm:h-14 sm:w-14">
                  <Landmark size={25} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[#173c56] sm:text-3xl">
                      Land Details
                    </h1>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={13} />
                      Official Record
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm text-slate-500">
                    Complete information for your registered land parcel.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f0f7fa] px-2.5 py-1.5 text-xs font-semibold text-[#174b69]">
                      <MapPin size={13} />
                      {village}, {district}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                      Survey No. {surveyNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#174b69] transition-all hover:-translate-y-0.5 hover:border-[#b9d9e8] hover:bg-[#f5fbfd] hover:shadow-sm"
                >
                  <Download size={16} />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={openMap}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0c3048] hover:shadow-md"
                >
                  <Map size={16} />
                  View on Map
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* STATUS BAR                                                         */}
        {/* ================================================================= */}

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <StatItem
              icon={<Landmark size={18} />}
              label="Registered Area"
              value={area}
            />

            <StatItem
              icon={<FileText size={18} />}
              label="Survey Number"
              value={surveyNumber}
            />

            <StatItem
              icon={<MapPin size={18} />}
              label="Khasra / Dag"
              value={`${khasraNumber} / ${dagNumber}`}
            />

            <StatItem
              icon={
                isAcquisition ? <Gavel size={18} /> : <CheckCircle2 size={18} />
              }
              label="Current Status"
              value={
                isAcquisition
                  ? "Under Acquisition"
                  : parcel.statusLabel || "Verified"
              }
              status={isAcquisition ? "warning" : "success"}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* ACQUISITION ALERT                                                  */}
        {/* ================================================================= */}

        {isAcquisition && (
          <section className="mt-4 rounded-xl border border-amber-200 bg-[#fff9ef] shadow-sm">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Gavel size={19} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-amber-900">
                      Acquisition Process Active
                    </h2>

                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Action may be required
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-5 text-amber-900/70">
                    This parcel is currently included in an official government
                    land acquisition process.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c3048]"
              >
                View Acquisition Status
                <ArrowRight size={14} />
              </button>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* LAND INFORMATION + LOCATION                                       */}
        {/* ================================================================= */}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          {/* =============================================================== */}
          {/* LAND INFORMATION                                                */}
          {/* =============================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<FileText size={19} />}
              title="Land Information"
              subtitle="Official cadastral and revenue information"
              badge="Verified"
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField
                label="Survey Number"
                value={surveyNumber}
                icon={<FileText size={15} />}
              />

              <DetailField
                label="Khasra Number"
                value={khasraNumber}
                icon={<Landmark size={15} />}
              />

              <DetailField
                label="Plot Number"
                value={String(plotNumber)}
                icon={<Map size={15} />}
              />

              <DetailField
                label="Dag Number"
                value={String(dagNumber)}
                icon={<MapPin size={15} />}
              />

              <DetailField
                label="Registered Area"
                value={area}
                icon={<Landmark size={15} />}
              />

              <DetailField
                label="Land Category"
                value={landType}
                icon={<FolderOpen size={15} />}
              />

              <DetailField
                label="Mutation Status"
                value="Verified"
                icon={<CheckCircle2 size={15} />}
                success
              />

              <DetailField
                label="Record Reference"
                value={`LR-${parcel.id}`}
                icon={<ShieldCheck size={15} />}
              />
            </div>

            {/* LAND CLASSIFICATION */}

            <div className="mt-5 rounded-xl border border-[#d9ebf2] bg-[#f5fbfd] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dff0f7] text-[#174b69]">
                  <Info size={17} />
                </div>

                <div>
                  <p className="text-sm font-bold text-[#173c56]">
                    Land Classification
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This parcel is recorded as{" "}
                    <span className="font-semibold text-slate-700">
                      {landType}
                    </span>{" "}
                    in the current revenue record.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =============================================================== */}
          {/* LOCATION + GIS                                                   */}
          {/* =============================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<MapPin size={19} />}
              title="Land Location"
              subtitle="Administrative and geographic location"
              badge="GIS Linked"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <LocationField label="Village" value={village} />

              <LocationField label="Gram Panchayat" value="Haripur North" />

              <LocationField label="Tehsil / Block" value={tehsil} />

              <LocationField label="District" value={district} />
            </div>

            {/* MAP */}

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e7f4f9] text-[#174b69]">
                    <Map size={14} />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#173c56]">
                      Parcel Boundary
                    </p>

                    <p className="text-xs text-slate-400">
                      Interactive cadastral map
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-[#e8f5fa] px-2.5 py-1 text-xs font-semibold text-[#174b69]">
                  Parcel {parcel.id}
                </span>
              </div>

              <div className="relative w-full">
                <CitizenGISMap
                  parcels={gisParcels}
                  selectedParcel={parcel}
                  onSelectParcel={openParcelDetails}
                  className="h-[440px] sm:h-[480px] lg:h-[500px]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={openMap}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#cfe4ed] bg-[#f3fafc] px-4 py-2.5 text-xs font-bold text-[#174b69] transition-all hover:bg-[#e6f5fa] hover:shadow-sm"
            >
              <Map size={15} />
              Open Full Interactive Map
              <ArrowRight size={14} />
            </button>
          </section>
        </div>

        {/* ================================================================= */}
        {/* OWNER + DOCUMENTS                                                 */}
        {/* ================================================================= */}

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          {/* =============================================================== */}
          {/* OWNER INFORMATION                                                */}
          {/* =============================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<Users size={19} />}
              title="Owner Information"
              subtitle="Registered ownership details"
              badge="KYC Verified"
            />

            {/* PRIMARY OWNER */}

            <div className="mt-5 rounded-xl bg-[#f1f8fb] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d9ebf3] text-[#174b69]">
                  <UserRound size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary Owner
                  </p>

                  <h3 className="mt-0.5 truncate text-base font-bold text-[#173c56]">
                    Rajesh Kumar Sharma
                  </h3>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Father's Name</p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    Mohan Kumar Sharma
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Ownership</p>

                  <p className="mt-1 text-xs font-semibold text-[#174b69]">
                    50%
                  </p>
                </div>
              </div>
            </div>

            {/* CO-OWNERS */}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#173c56]">
                  Registered Co-owners
                </p>

                <span className="text-xs font-medium text-slate-400">
                  Inheritance Khata
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <OwnerRow
                  initials="SK"
                  name="Suresh Kumar Sharma"
                  relation="Brother"
                  share="25%"
                />

                <OwnerRow
                  initials="AK"
                  name="Anita Kumar Sharma"
                  relation="Sister"
                  share="25%"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 rounded-lg border border-[#d9ebf2] bg-[#f5fbfd] p-3">
              <Info size={15} className="mt-0.5 shrink-0 text-[#174b69]" />

              <p className="text-xs leading-relaxed text-slate-500">
                Ownership shares shown above are based on the current registered
                revenue record.
              </p>
            </div>
          </section>

          {/* =============================================================== */}
          {/* DOCUMENTS                                                        */}
          {/* =============================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<FolderOpen size={19} />}
              title="Important Documents"
              subtitle="Official documents associated with this parcel"
              badge="3 Documents"
            />

            <div className="mt-5 space-y-3">
              <DocumentCard
                icon={<FileText size={18} />}
                title="Land Record / RoR"
                description="Registered land ownership record"
                meta="PDF · 1.2 MB · 12 Jun 2026"
                verified
              />

              <DocumentCard
                icon={<Gavel size={18} />}
                title="Acquisition Notice"
                description="Government statutory notice"
                meta="PDF · 840 KB · 10 Sep 2026"
                warning
              />

              <DocumentCard
                icon={<FileCheck2 size={18} />}
                title="Field Verification Report"
                description="Latest field survey and verification"
                meta="PDF · 2.1 MB · 08 Sep 2026"
                verified
              />
            </div>

            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-[#174b69] transition hover:bg-[#eef8fb]"
            >
              View All Land Documents
              <ArrowRight size={14} />
            </button>
          </section>
        </div>

        {/* ================================================================= */}
        {/* ACQUISITION TIMELINE                                               */}
        {/* ================================================================= */}

        {isAcquisition && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Gavel size={18} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-[#173c56] sm:text-lg">
                      Acquisition Status
                    </h2>

                    <p className="text-xs text-slate-500">
                      Current stage of the government acquisition process
                    </p>
                  </div>
                </div>
              </div>

              <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                Stage 4 of 6 · In Progress
              </span>
            </div>

            {/* TIMELINE */}

            <div className="mt-7 overflow-x-auto pb-2">
              <div className="flex min-w-[760px] items-start">
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

            <div className="mt-5 rounded-xl bg-[#f4fafc] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <CircleHelp
                    size={18}
                    className="mt-0.5 shrink-0 text-[#174b69]"
                  />

                  <div>
                    <p className="text-sm font-bold text-[#173c56]">
                      What happens next?
                    </p>

                    <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                      The government authority is currently assessing the
                      applicable land valuation. You will receive an official
                      notification when the valuation award is published.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c3048]"
                >
                  View Compensation
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* COMPENSATION / ACTION REQUIRED                                     */}
        {/* ================================================================= */}

        {isAcquisition && (
          <section className="mt-4 rounded-2xl border border-amber-200 bg-[#fffaf2] p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Banknote size={20} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      ACTION REQUIRED
                    </span>

                    <h2 className="text-sm font-bold text-[#173c56] sm:text-base">
                      Verify Bank Details for Compensation
                    </h2>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Verify your bank account and identity documents to avoid
                    delays in direct compensation payment.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#123f5c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0c3048]"
              >
                <Wallet size={15} />
                Submit Bank Details
              </button>
            </div>
          </section>
        )}

        {/* ================================================================= */}
        {/* ACTIONS                                                            */}
        {/* ================================================================= */}

        <section className="mt-7">
          <div>
            <h2 className="text-xl font-bold text-[#173c56]">Land Services</h2>

            <p className="mt-1 text-sm text-slate-500">
              Quickly access services related to this land record.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              icon={<Map size={19} />}
              title="View on Map"
              description="Open the interactive GIS map and view your exact parcel boundary."
              action="Open Map"
              onClick={openMap}
            />

            <ActionCard
              icon={<FileText size={19} />}
              title="Land Documents"
              description="View and download official documents associated with this parcel."
              action="View Documents"
            />

            <ActionCard
              icon={<Wallet size={19} />}
              title="Compensation"
              description="Check compensation information and payment status where applicable."
              action="View Compensation"
            />

            <ActionCard
              icon={<CircleHelp size={19} />}
              title="Report a Problem"
              description="Report incorrect land details, boundaries, ownership, or survey information."
              action="File Grievance"
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* AUDIT INFORMATION                                                  */}
        {/* ================================================================= */}

        <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 sm:px-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f4f8] text-[#174b69]">
                <ShieldCheck size={16} />
              </div>

              <div>
                <p className="text-xs font-bold text-[#173c56]">
                  Official Record &amp; Audit Information
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  Record ID: LR-{parcel.id}
                </p>
              </div>
            </div>

            <ChevronDown size={17} className="shrink-0 text-slate-400" />
          </button>
        </section>

        {/* ================================================================= */}
        {/* HELP                                                               */}
        {/* ================================================================= */}

        <section className="mt-4 rounded-2xl border border-[#d8eaf1] bg-[#f1f9fc] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CircleHelp size={20} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#173c56] sm:text-base">
                  Need help with your land record?
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Contact the citizen helpline or visit your local Tehsil
                  Revenue Office if you need assistance understanding your land
                  details.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#23804a] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1c6a3e]"
              >
                <Phone size={15} />
                1800-112-455
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#173c56] transition hover:bg-slate-50"
              >
                <Landmark size={15} />
                Find Tehsil Office
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* FOOTER                                                             */}
        {/* ================================================================= */}

        <div className="mt-6 border-t border-slate-200 pt-4 text-center">
          <p className="text-xs leading-relaxed text-slate-400">
            GIS boundaries are provided for citizen information and
            transparency. For certified cadastral copies, contact the concerned
            Revenue Office.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ========================================================================= */
/* SECTION HEADER                                                             */
/* ========================================================================= */

function SectionHeader({
  icon,
  title,
  subtitle,
  badge,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f4f8] text-[#174b69]">
          {icon}
        </div>

        <div>
          <h2 className="text-base font-bold text-[#173c56] sm:text-lg">
            {title}
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {badge && (
        <span className="w-fit rounded-full bg-[#edf7fa] px-2.5 py-1 text-xs font-semibold text-[#174b69]">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ========================================================================= */
/* STAT ITEM                                                                  */
/* ========================================================================= */

function StatItem({
  icon,
  label,
  value,
  status,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status?: "success" | "warning";
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          status === "warning"
            ? "bg-amber-100 text-amber-700"
            : status === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-[#e8f4f8] text-[#174b69]",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p
          className={[
            "mt-0.5 truncate text-sm font-bold",
            status === "warning"
              ? "text-amber-800"
              : status === "success"
                ? "text-emerald-700"
                : "text-[#173c56]",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* DETAIL FIELD                                                               */
/* ========================================================================= */

function DetailField({
  label,
  value,
  icon,
  success = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  success?: boolean;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c8e0e9] hover:bg-[#fbfdfe] hover:shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-md",
            success
              ? "bg-emerald-50 text-emerald-600"
              : "bg-[#eef7fa] text-[#174b69]",
          ].join(" ")}
        >
          {icon}
        </span>

        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>

      <p
        className={[
          "mt-3 text-sm font-bold",
          success ? "text-emerald-700" : "text-[#294c63]",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

/* ========================================================================= */
/* LOCATION FIELD                                                             */
/* ========================================================================= */

function LocationField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f5fafc] px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold leading-5 text-[#294c63]">{value}</p>
    </div>
  );
}

/* ========================================================================= */
/* OWNER ROW                                                                  */
/* ========================================================================= */

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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-all hover:border-[#c8e0e9] hover:bg-[#fbfdfe]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e2f0f5] text-xs font-bold text-[#174b69]">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-[#294c63]">{name}</p>

        <p className="mt-0.5 text-xs text-slate-400">{relation}</p>
      </div>

      <span className="shrink-0 rounded-full bg-[#eef7fa] px-2.5 py-1 text-xs font-semibold text-[#174b69]">
        {share}
      </span>
    </div>
  );
}

/* ========================================================================= */
/* DOCUMENT CARD                                                              */
/* ========================================================================= */

function DocumentCard({
  icon,
  title,
  description,
  meta,
  verified = false,
  warning = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
  verified?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c8e0e9] hover:shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            warning
              ? "bg-amber-100 text-amber-700"
              : "bg-[#e8f4f8] text-[#174b69]",
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#294c63]">{title}</p>

            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <Check size={11} />
                Verified
              </span>
            )}

            {warning && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                Important
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-slate-400">{description}</p>

          <p className="mt-1 text-xs text-slate-400">{meta}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#174b69] transition hover:bg-slate-50"
          >
            <ExternalLink size={13} />
            View
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#123f5c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0c3048]"
          >
            <Download size={13} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* TIMELINE STEP                                                              */
/* ========================================================================= */

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
    <div className="flex w-[110px] shrink-0 flex-col items-center text-center">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
          complete
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-amber-600 text-white ring-4 ring-amber-100"
              : "bg-slate-100 text-slate-400",
        ].join(" ")}
      >
        {complete ? <Check size={16} /> : number}
      </div>

      <p
        className={[
          "mt-2 text-xs font-bold",
          complete
            ? "text-emerald-700"
            : active
              ? "text-amber-700"
              : "text-slate-500",
        ].join(" ")}
      >
        {title}
      </p>

      <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

/* ========================================================================= */
/* TIMELINE LINE                                                              */
/* ========================================================================= */

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
        "mt-[18px] h-0.5 min-w-[35px] flex-1",
        complete ? "bg-emerald-500" : active ? "bg-amber-400" : "bg-slate-200",
      ].join(" ")}
    />
  );
}

/* ========================================================================= */
/* ACTION CARD                                                                */
/* ========================================================================= */

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
      className="group flex min-h-[165px] flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#c5dfe9] hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e8f4f8] text-[#174b69] transition-all duration-200 group-hover:bg-[#123f5c] group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-bold text-[#173c56]">{title}</h3>

      <p className="mt-2 flex-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#123f5c] transition-all group-hover:gap-2.5">
        {action}
        <ArrowRight size={13} />
      </span>
    </button>
  );
}
