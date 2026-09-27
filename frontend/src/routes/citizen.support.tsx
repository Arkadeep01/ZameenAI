import React, { useState, useEffect } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import {
  BookOpen,
  Phone,
  Mail,
  MessageSquareWarning,
  Send,
  CheckCircle2,
  ChevronDown,
  Search,
  Building2,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

interface SupportSearchParams {
  tab?: "overview" | "faqs" | "grievance";
}

export const Route = createFileRoute("/citizen/support")({
  validateSearch: (search: Record<string, unknown>): SupportSearchParams => {
    const tab = search.tab as string | undefined;
    if (tab === "faqs" || tab === "grievance" || tab === "overview") {
      return { tab };
    }
    return { tab: "overview" };
  },
  component: UnifiedSupportPage,
});

/* -------------------------------------------------------------------------- */
/* FAQ DATA                                                                   */
/* -------------------------------------------------------------------------- */
interface FAQItem {
  id: string;
  category: "records" | "acquisition" | "digitization" | "compensation";
  q: string;
  a: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    id: "faq-1",
    category: "records",
    q: "How do I check if my land record is officially verified?",
    a: "Navigate to 'My Land' > 'My Land Overview' or 'Land Details'. Look for the green 'Digitally Verified' badge with the DoLR stamp and digital certificate signature from your Tehsil Revenue Office.",
  },
  {
    id: "faq-2",
    category: "acquisition",
    q: "What should I do if my parcel is under land acquisition?",
    a: "Open 'Land Services' > 'Acquisition Status' to track statutory milestones under the RFCTLARR Act. Ensure your bank account is seeded with Aadhaar in the PFMS portal under 'Compensation' for direct benefit disbursal.",
  },
  {
    id: "faq-3",
    category: "compensation",
    q: "How is compensation calculated for notified land?",
    a: "Compensation is calculated as Market Value × Multiplying Factor (1.0x to 2.0x depending on rural distance) + 100% Solatium + 12% additional interest per annum from Section 11 notice date.",
  },
  {
    id: "faq-4",
    category: "digitization",
    q: "How long does digital document processing take?",
    a: "Our AI-assisted OCR and cadastral boundary alignment system processes land documents in under 2 minutes. You can monitor progress under 'Document Digitization' > 'Processing Status'.",
  },
  {
    id: "faq-5",
    category: "records",
    q: "Can I download certified legal copies of my Record of Rights (RoR)?",
    a: "Yes. Go to 'My Documents' to download digitally signed, tamper-evident PDF extracts admissible in civil revenue courts under the Information Technology Act.",
  },
  {
    id: "faq-6",
    category: "records",
    q: "What is the procedure if there is a spelling mistake in my Khatauni?",
    a: "You can submit an official correction request using the 'File a Grievance' tab below under the category 'Khatauni / RoR Spelling Correction'. Attach your Aadhaar and prior registered deed.",
  },
];

/* -------------------------------------------------------------------------- */
/* MAIN UNIFIED SUPPORT COMPONENT                                             */
/* -------------------------------------------------------------------------- */
function UnifiedSupportPage() {
  const searchParams = useSearch({ from: "/citizen/support" });
  const [activeTab, setActiveTab] = useState<"overview" | "faqs" | "grievance">(
    searchParams.tab || "overview",
  );

  // Sync state if query param changes
  useEffect(() => {
    if (searchParams.tab) {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams.tab]);

  // FAQ Accordion & Search State
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq-1");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Grievance Form State
  const [grievanceCategory, setGrievanceCategory] = useState(
    "Land Acquisition & Compensation Discrepancy",
  );
  const [khasraNumber, setKhasraNumber] = useState("Khasra 184/2");
  const [grievanceSubject, setGrievanceSubject] = useState("");
  const [grievanceDescription, setGrievanceDescription] = useState("");
  const [submittedGrievance, setSubmittedGrievance] = useState<{
    referenceId: string;
    submittedAt: string;
    category: string;
  } | null>(null);

  // Filter FAQs
  const filteredFaqs = FAQ_LIST.filter((faq) => {
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.a.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleGrievanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refId = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedGrievance({
      referenceId: refId,
      submittedAt: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      category: grievanceCategory,
    });
  };

  return (
    <PageContainer className="space-y-5 text-[#062B52] sm:space-y-6">
      {/* ================================================================== */}
      {/* 1. BREADCRUMB & PAGE HEADER                                        */}
      {/* ================================================================== */}
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/support")}
        title="Citizen Support &amp; Grievance Redressal"
        subtitle="Official single-window portal for guidance, inquiries, frequently asked questions, and dispute redressal."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={14} aria-hidden="true" />
            DoLR Citizen SLA Active
          </span>
        }
      />

      {/* ================================================================== */}
      {/* 2. TAB NAVIGATION                                                  */}
      {/* ================================================================== */}
      <div className="flex gap-10 border-b border-[#D9E2EC] bg-white rounded-t-xl px-4 pt-2 shadow-2xs">
        {" "}
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 -mb-[1px] min-h-[44px] ${
            activeTab === "overview"
              ? "border-[#1261A8] text-[#1261A8]"
              : "border-transparent text-slate-600 hover:text-[#062B52]"
          }`}
        >
          <BookOpen size={16} />
          <span>Overview &amp; Help Desk</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 -mb-[1px] min-h-[44px] ${
            activeTab === "faqs"
              ? "border-[#1261A8] text-[#1261A8]"
              : "border-transparent text-slate-600 hover:text-[#062B52]"
          }`}
        >
          <HelpCircle size={16} />
          <span>FAQs ({FAQ_LIST.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grievance")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 -mb-[1px] min-h-[44px] ${
            activeTab === "grievance"
              ? "border-[#1261A8] text-[#1261A8]"
              : "border-transparent text-slate-600 hover:text-[#062B52]"
          }`}
        >
          <MessageSquareWarning size={16} />
          <span>File a Grievance</span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* 3. TAB CONTENT                                                     */}
      {/* ================================================================== */}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: OVERVIEW & HELP DESK                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Contact & Helplines Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Toll-Free Hotline */}
            <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#16855B]">
                <Phone size={20} />
              </div>
              <h3 className="text-base font-bold text-[#062B52]">
                Toll-Free Revenue Helpline
              </h3>
              <p className="text-sm font-bold text-[#1261A8]">1800-180-1551</p>
              <p className="text-xs text-[#607089] leading-relaxed">
                Monday to Saturday, 9:00 AM to 6:00 PM IST. Free government
                assistance for landholders.
              </p>
            </div>

            {/* Help Desk Email */}
            <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#1261A8]">
                <Mail size={20} />
              </div>
              <h3 className="text-base font-bold text-[#062B52]">
                Digital Helpdesk
              </h3>
              <p className="text-sm font-bold text-[#1261A8]">
                support@zameenai.gov.in
              </p>
              <p className="text-xs text-[#607089] leading-relaxed">
                Official inquiries regarding cadastral surveys, digital
                extracts, and technical questions.
              </p>
            </div>

            {/* Tehsil Directory */}
            <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                <Building2 size={20} />
              </div>
              <h3 className="text-base font-bold text-[#062B52]">
                Tehsil Revenue Office
              </h3>
              <p className="text-sm font-bold text-[#062B52]">
                Sadar Tehsil, Varanasi
              </p>
              <p className="text-xs text-[#607089] leading-relaxed">
                Room 104, Sub-Divisional Magistrate &amp; Tehsildar Complex.
                Timings: 10:00 AM – 4:00 PM.
              </p>
            </div>
          </div>

          {/* Comprehensive Citizen Guidance Cards */}
          <div className="rounded-xl border border-[#D9E2EC] bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-[#062B52]">
                Landholder Service Guidelines &amp; Statutory Timelines
              </h2>
              <p className="text-xs text-[#607089] mt-0.5">
                Standard operating procedures under State Land Revenue Acts
                &amp; DoLR Citizen Charter
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-100 bg-[#F6F8FB] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16855B]" />
                  <h4 className="text-sm font-bold text-[#062B52]">
                    Mutation &amp; Ownership Transfer
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Undisputed mutations are statutory mandated for completion
                  within 30 days of registration. Track filing numbers under
                  'Activity' or with your local Tehsil office.
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-[#F6F8FB] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16855B]" />
                  <h4 className="text-sm font-bold text-[#062B52]">
                    Acquisition &amp; Direct DBT Disbursal
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  RFCTLARR 2013 guarantees 100% solatium and direct PFMS
                  electronic credit. Ensure your bank records are verified
                  before final award declaration.
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-[#F6F8FB] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16855B]" />
                  <h4 className="text-sm font-bold text-[#062B52]">
                    Cadastral Boundary Demarcation
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  High-precision DGPS rover survey maps are digitally accessible
                  via 'My Land Map'. For physical boundary stones, file a
                  demarcation request at your tehsil.
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-[#F6F8FB] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16855B]" />
                  <h4 className="text-sm font-bold text-[#062B52]">
                    Grievance Resolution Escalation
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Statutory grievances receive an SMS confirmation within 24
                  hours. Tehsildar inquiry reports are completed within 15
                  working days.
                </p>
              </div>
            </div>

            {/* Action Banner to File Grievance */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-amber-200 bg-[#FFFDF8] p-4 gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Need Immediate Resolution?
                </span>
                <p className="text-xs text-slate-700 font-medium">
                  Have an unresolved dispute regarding circle rates, survey
                  numbers, or mutation?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("grievance")}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#062B52] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1261A8] transition shrink-0"
              >
                <MessageSquareWarning size={14} className="mr-1.5" />
                <span>File a Grievance Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: FREQUENTLY ASKED QUESTIONS                                  */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "faqs" && (
        <div className="space-y-5">
          {/* Search and Category Filter */}
          <div className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-xs space-y-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search questions by keyword (e.g. Khatauni, acquisition, compensation, RoR)..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-[#1261A8] focus:ring-1 focus:ring-[#1261A8] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-500 font-medium mr-1">Filter:</span>
              {[
                { id: "all", label: "All Questions" },
                { id: "records", label: "Land Records & RoR" },
                { id: "acquisition", label: "Land Acquisition" },
                { id: "compensation", label: "Compensation & PFMS" },
                { id: "digitization", label: "Document Digitization" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    selectedCategory === cat.id
                      ? "bg-[#1261A8] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <HelpCircle className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  No matching questions found
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching with different terms or file a grievance for
                  personalized assistance.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-xl border border-[#D9E2EC] bg-white shadow-xs overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="flex w-full items-center justify-between p-4 sm:p-5 text-left font-bold text-sm text-[#062B52] hover:bg-slate-50 transition"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <ChevronDown
                        size={18}
                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#1261A8]" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 sm:px-5 pt-1 text-xs sm:text-sm leading-relaxed text-slate-600 border-t border-slate-100 bg-[#FBFDFE]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: FILE A GRIEVANCE                                            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "grievance" && (
        <div className="rounded-xl border border-[#D9E2EC] bg-white p-6 sm:p-7 shadow-xs space-y-6">
          {submittedGrievance ? (
            <div className="py-10 text-center space-y-4 max-w-lg mx-auto">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-[#16855B]">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#062B52]">
                  Grievance Registered Successfully
                </h3>
                <p className="text-xs text-slate-500">
                  Your complaint has been assigned to the District Land
                  Acquisition Officer and Sadar Tehsildar.
                </p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference Number:</span>
                  <strong className="text-[#062B52]">
                    {submittedGrievance.referenceId}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Filing Date:</span>
                  <strong className="text-[#062B52]">
                    {submittedGrievance.submittedAt}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <strong className="text-[#062B52]">
                    {submittedGrievance.category}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Resolution:</span>
                  <strong className="text-[#16855B]">
                    Within 7 working days
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                An official SMS confirmation has been dispatched to your
                Aadhaar-linked mobile phone.
              </p>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedGrievance(null);
                    setGrievanceSubject("");
                    setGrievanceDescription("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-white px-4 py-2 text-xs font-semibold text-[#062B52] shadow-xs hover:bg-slate-50 transition"
                >
                  <span>Submit Another Grievance</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#062B52] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1261A8] transition"
                >
                  <span>Back to Support Overview</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <MessageSquareWarning size={20} className="text-amber-700" />
                  <h2 className="text-lg font-bold text-[#062B52]">
                    File Statutory Revenue Dispute or Grievance
                  </h2>
                </div>
                <p className="text-xs text-[#607089] mt-0.5">
                  Official statutory dispute redressal monitored under
                  Department of Land Resources (DoLR) SLA.
                </p>
              </div>

              <form onSubmit={handleGrievanceSubmit} className="space-y-4.5">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Grievance Category *
                  </label>
                  <select
                    value={grievanceCategory}
                    onChange={(e) => setGrievanceCategory(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2.5 text-xs sm:text-sm text-slate-800 bg-white focus:border-[#1261A8] focus:ring-1 focus:ring-[#1261A8] outline-none"
                  >
                    <option>
                      Land Acquisition &amp; Compensation Discrepancy
                    </option>
                    <option>Khatauni / RoR Spelling Correction</option>
                    <option>Cadastral Boundary Demarcation Objection</option>
                    <option>Delayed Mutation Order</option>
                    <option>PFMS Bank Seeding Issue</option>
                    <option>Missing Document / Certified Extract Issue</option>
                  </select>
                </div>

                {/* Parcel / Khasra Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Parcel / Khasra Number *
                  </label>
                  <input
                    type="text"
                    value={khasraNumber}
                    onChange={(e) => setKhasraNumber(e.target.value)}
                    placeholder="e.g. Khasra 184/2, 342/1..."
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1261A8] focus:ring-1 focus:ring-[#1261A8] outline-none"
                  />
                </div>

                {/* Grievance Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Subject / Brief Title *
                  </label>
                  <input
                    type="text"
                    value={grievanceSubject}
                    onChange={(e) => setGrievanceSubject(e.target.value)}
                    placeholder="e.g. Discrepancy in tree valuation on acquired parcel 184/2..."
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1261A8] focus:ring-1 focus:ring-[#1261A8] outline-none"
                  />
                </div>

                {/* Grievance Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={5}
                    value={grievanceDescription}
                    onChange={(e) => setGrievanceDescription(e.target.value)}
                    placeholder="Provide specific details including dates, reference numbers, village revenue records, and nature of relief sought..."
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:border-[#1261A8] focus:ring-1 focus:ring-[#1261A8] outline-none leading-relaxed"
                  />
                </div>

                {/* Legal Notice */}
                <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <ShieldCheck
                    size={16}
                    className="text-[#1261A8] shrink-0 mt-0.5"
                  />
                  <p className="leading-relaxed">
                    All grievances submitted are legally tracked under the
                    Public Grievance Redressal and Monitoring System (CPGRAMS)
                    guidelines.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#062B52] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1261A8] focus-visible:outline-2 focus-visible:outline-[#062B52]"
                  >
                    <Send size={15} />
                    <span>Submit Official Grievance</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. FOOTER NOTATION                                                 */}
      {/* ================================================================== */}
      <div className="text-center text-xs text-slate-400 pt-4 pb-8">
        <p>
          Department of Land Resources (DoLR), Ministry of Rural Development •
          Government of India.
        </p>
      </div>
    </PageContainer>
  );
}

export default UnifiedSupportPage;
