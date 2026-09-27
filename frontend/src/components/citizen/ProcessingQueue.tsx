import { useEffect, useState } from "react";

import Breadcrumbs from "../common/Breadcrumbs";
import { citizenCrumbs } from "../../config/citizenBreadcrumbs";

import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Cog,
  ScanLine,
  FileSearch,
  ShieldCheck,
  Eye,
  Flag,
  ArrowUpRight,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";

// Preserved component from previous digitization dashboard view

/* =========================================================
   STAT DATA
========================================================= */

const stats = [
  {
    label: "Total Documents",
    value: "1,248",
    icon: FileText,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badge: "↑ 12% from last week",
    badgeStyle: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Processing",
    value: "32",
    icon: Loader2,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    badge: "In Progress",
    badgeStyle: "bg-blue-50 text-blue-700",
  },
  {
    label: "Review Required",
    value: "17",
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    badge: "Needs Attention",
    badgeStyle: "bg-amber-50 text-amber-700",
  },
  {
    label: "Validated Records",
    value: "1,199",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badge: "96.1% Success Rate",
    badgeStyle: "bg-emerald-50 text-emerald-700",
  },
];

/* =========================================================
   PIPELINE DATA
========================================================= */

const pipelineSteps = [
  {
    name: "Upload",
    icon: Upload,
    value: "1,248",
  },
  {
    name: "Preprocess",
    icon: Cog,
    value: "1,216",
  },
  {
    name: "Classify",
    icon: FileSearch,
    value: "1,180",
  },
  {
    name: "OCR",
    icon: ScanLine,
    value: "1,140",
  },
  {
    name: "Extract",
    icon: FileText,
    value: "1,105",
  },
  {
    name: "Validate",
    icon: ShieldCheck,
    value: "1,099",
  },
  {
    name: "Review",
    icon: Eye,
    value: "32",
  },
  {
    name: "Complete",
    icon: Flag,
    value: "1,199",
  },
];

/* =========================================================
   RECENT DOCUMENTS
========================================================= */

const recentDocuments = [
  {
    id: "ZAI-LR-001293",
    type: "Khatian",
    village: "Kanke",
    language: "Hindi",
    ocr: "94.7%",
    extraction: "91.8%",
    status: "Validated",
    owner: "LAO",
  },
  {
    id: "ZAI-LR-001294",
    type: "RoR",
    village: "Ranchi",
    language: "Hindi",
    ocr: "91.3%",
    extraction: "68.4%",
    status: "Review",
    owner: "LAO",
  },
  {
    id: "ZAI-LR-001295",
    type: "Mutation",
    village: "Bhurkunda",
    language: "English",
    ocr: "96.2%",
    extraction: "92.3%",
    status: "Processing",
    owner: "DEO",
  },
  {
    id: "ZAI-LR-001296",
    type: "Khatian",
    village: "Nagri",
    language: "Hindi",
    ocr: "89.1%",
    extraction: "87.4%",
    status: "Review",
    owner: "LAO",
  },
  {
    id: "ZAI-LR-001297",
    type: "RoR",
    village: "Mandar",
    language: "Hindi",
    ocr: "93.5%",
    extraction: "90.6%",
    status: "Validated",
    owner: "Circle Officer",
  },
];

const statusStyles: Record<string, string> = {
  Validated: "bg-emerald-50 text-emerald-700",
  Review: "bg-amber-50 text-amber-700",
  Processing: "bg-blue-50 text-blue-700",
};

/* =========================================================
   DASHBOARD
========================================================= */

function CitizenProcessingQueue() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= pipelineSteps.length - 1) {
          return 0;
        }
        return current + 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-full space-y-5 p-4 sm:p-6">
      <Breadcrumbs
        items={citizenCrumbs("/citizen/processing-status")}
        className="mb-4"
      />

      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#062B52] sm:text-3xl">
            AI Digitization Processing Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time pipeline status and validation workflow of ingested land records
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm font-medium text-slate-700">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-[#062B52]">
                    {stat.value}
                  </p>
                </div>

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}
                >
                  <Icon size={21} className={stat.iconColor} />
                </div>
              </div>

              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${stat.badgeStyle}`}
                >
                  {stat.badge}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#062B52]">
              AI Processing Overview
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Real-time pipeline status of document processing
            </p>
          </div>

          <div className="mt-14 w-full">
            <div className="flex w-full items-start">
              {pipelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;
                const isPassed = index < activeStep;
                const isComplete = index === pipelineSteps.length - 1;

                return (
                  <div
                    key={step.name}
                    className="flex min-w-0 flex-1 items-start"
                  >
                    <div
                      className={`flex min-w-0 flex-1 flex-col items-center ${
                        isComplete ? "-translate-x-5" : ""
                      }`}
                    >
                      <div
                        className={`
                          relative z-10
                          flex h-9 w-9 shrink-0
                          items-center justify-center
                          rounded-full
                          transition-all duration-300
                          ${
                            isActive
                              ? isComplete
                                ? "bg-green-500 text-white ring-4 ring-green-100"
                                : "bg-green-500 text-white ring-4 ring-green-100"
                              : isPassed
                                ? "bg-blue-600 text-white"
                                : "bg-blue-600 text-white"
                          }
                        `}
                      >
                        {isActive && (
                          <span className="absolute inset-[-5px] rounded-full border-2 border-green-300 opacity-70" />
                        )}
                        {isComplete && isActive && (
                          <span className="absolute inset-[-8px] rounded-full border-2 border-green-200 opacity-50" />
                        )}
                        <Icon
                          size={16}
                          strokeWidth={2}
                          className="relative z-10"
                        />
                      </div>

                      <p
                        className={`
                          mt-2 whitespace-nowrap text-center text-[10px] font-semibold
                          transition-colors duration-300
                          ${isActive ? "text-green-600" : "text-slate-700"}
                        `}
                      >
                        {step.name}
                      </p>

                      <p
                        className={`
                          mt-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium
                          transition-all duration-300
                          ${
                            isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-50 text-slate-500"
                          }
                        `}
                      >
                        {step.value}
                      </p>
                    </div>

                    {!isComplete && (
                      <div className="relative mt-[17px] h-0.5 min-w-1 flex-1 overflow-hidden bg-blue-200">
                        {index < activeStep && (
                          <div className="absolute inset-0 bg-green-500 transition-all duration-500" />
                        )}
                        {index === activeStep && (
                          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-green-400 to-green-500 transition-all duration-500" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#062B52]">
                Extraction Confidence
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Average AI extraction confidence
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-4xl font-bold text-emerald-600">91.6%</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <TrendingUp size={12} aria-hidden="true" />
              ↑ 2.4% from last week
            </span>
          </div>

          <div className="mt-5 h-24 w-full">
            <svg
              viewBox="0 0 500 100"
              className="h-full w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="confidenceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="
                  M0 75
                  L65 68
                  L125 70
                  L190 58
                  L250 60
                  L315 45
                  L375 48
                  L435 30
                  L500 22
                  L500 100
                  L0 100
                  Z
                "
                fill="url(#confidenceArea)"
              />

              <polyline
                points="
                  0,75
                  65,68
                  125,70
                  190,58
                  250,60
                  315,45
                  375,48
                  435,30
                  500,22
                "
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>May 5</span>
            <span>May 6</span>
            <span>May 7</span>
            <span>May 8</span>
            <span>May 9</span>
            <span>May 10</span>
            <span>May 11</span>
            <span>May 12</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#062B52]">
              Recent Documents
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Latest uploaded and processed documents
            </p>
          </div>

          <button
            type="button"
            className="hidden items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 sm:flex"
          >
            View All Documents
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Document ID
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Village
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Language
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  OCR Conf.
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Extraction
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Owner
                </th>
              </tr>
            </thead>

            <tbody>
              {recentDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {doc.id}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                    {doc.type}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {doc.village}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {doc.language}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                    {doc.ocr}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-700">
                    {doc.extraction}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[doc.status]}`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                    {doc.owner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default CitizenProcessingQueue;
