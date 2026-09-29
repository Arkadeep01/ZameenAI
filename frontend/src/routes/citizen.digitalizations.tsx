import React, { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDigitizationPipeline, type DigitizationPipeline } from "../hooks/useDigitizationPipeline";
import type { BackendError } from "../api/client";
import { FIELD_GROUP_IDS, applyConfidence, extractionToFields } from "../utils/digitizationAdapters";
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Upload,
  File,
  CloudUpload,
  Camera,
  User,
  Shield,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  Check,
  Ban,
  Send,
  Sparkles,
  Cpu,
  Brain,
  Scan,
  FileCheck,
  RefreshCw,
  Landmark,
  MapPin,
  Building,
  Globe,
  BookOpen,
  Layers,
  User as UserIcon,
  Home,
  FileCode,
  Info,
  Calendar,
  Hash,
  Ruler,
  Trees,
} from "lucide-react";

export const Route = createFileRoute("/citizen/digitalizations")({
  component: CitizenDigitalizations,
});

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type WizardStep =
  | "upload"
  | "processing"
  | "extraction"
  | "confidence"
  | "review";

interface FileUpload {
  id: string;
  name: string;
  type: string;
  size: string;
  pages: number | string;
  status: "ready" | "processing" | "completed" | "failed";
  uploadDate: string;
  confidence?: number;
}

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  issue?: string;
}

/* ------------------------------------------------------------------ */
/* Static display configuration (labels/grouping only — no data)      */
/* ------------------------------------------------------------------ */

// Group fields for display (ids resolved from real backend responses;
// see utils/digitizationAdapters FIELD_GROUP_IDS for the mapping)
const FIELD_GROUPS = [
  { title: "Record Information", icon: FileCode, fields: ["record_id"] },
  { title: "Document Details", icon: FileText, fields: ["doc_id", "doc_type", "doc_title", "department", "doc_date", "map_number"] },
  { title: "Owner Information", icon: UserIcon, fields: ["owner_name", "father_name", "co_owner", "recorded_tenant"] },
  { title: "Land Details", icon: Home, fields: ["survey_number", "khasra_number", "plot_number", "khata_number", "area", "area_unit", "nature_of_land", "land_type"] },
  { title: "Location Details", icon: MapPin, fields: ["state", "district", "block", "tehsil", "mouza", "village"] },
  { title: "Mutation Details", icon: Calendar, fields: ["mutation_number", "mutation_date"] },
  { title: "Additional Information", icon: Info, fields: ["remarks", "reg_document_number", "reg_registration_date", "reg_issue_date"] },
];

/** Render a backend failure honestly (never replaced by demo content). */
const BackendErrorBanner: React.FC<{ error: BackendError; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
    <p className="font-medium">Backend processing failed{error.error_code ? `: ${error.error_code}` : ""}</p>
    <p className="mt-0.5 text-rose-600">{error.message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry with backend
      </button>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

function confidenceTone(conf: number) {
  if (conf >= 90) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" };
  if (conf >= 70) return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" };
  return { text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" };
}

const TopBar: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <header className="border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 px-8 py-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
          <Landmark className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm">
          <User className="h-3.5 w-3.5 text-gray-400" />
          <span>Citizen</span>
          <ChevronRight className="h-3 w-3 rotate-90 text-gray-400" />
        </div>
      </div>
    </div>
  </header>
);

const StepRail: React.FC<{ step: WizardStep }> = ({ step }) => {
  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: "upload", label: "Upload", icon: <Upload className="h-3 w-3" /> },
    { key: "processing", label: "Processing", icon: <Cpu className="h-3 w-3" /> },
    { key: "extraction", label: "Extraction", icon: <FileText className="h-3 w-3" /> },
    { key: "confidence", label: "Confidence", icon: <Brain className="h-3 w-3" /> },
    { key: "review", label: "Review", icon: <FileCheck className="h-3 w-3" /> },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  if (idx === -1) return null;
  return (
    <div className="flex items-center gap-2 px-8 pt-5 text-xs">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-300 ${
              i < idx
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : i === idx
                ? "border-blue-400 bg-blue-50 text-blue-600 shadow-sm"
                : "border-gray-200 text-gray-400"
            }`}
          >
            {i < idx ? <Check className="h-3 w-3" /> : i === idx ? s.icon : <span className="font-mono">{i + 1}</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && <div className={`h-px w-6 ${i < idx ? "bg-emerald-300" : "bg-gray-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 1 — Upload                                                     */
/* ------------------------------------------------------------------ */

const UploadStep: React.FC<{
  files: FileUpload[];
  onAddFiles: (f: File[]) => void;
  onStartProcessing: () => void;
  starting: boolean;
  startError?: BackendError;
}> = ({ files, onAddFiles, onStartProcessing, starting, startError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState("Khatian / Record of Rights");
  const [state, setState] = useState("Jharkhand");
  const [district, setDistrict] = useState("Ranchi");
  const [tehsil, setTehsil] = useState("Kanke");
  const [village, setVillage] = useState("Bhurkunda");
  const [language, setLanguage] = useState("Hindi");
  const [department, setDepartment] = useState("Revenue Department");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onAddFiles(Array.from(e.target.files));
    e.target.value = "";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) onAddFiles(Array.from(e.dataTransfer.files));
  };

  const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[]; icon?: React.ReactNode }> = ({
    label,
    value,
    onChange,
    options,
    icon,
  }) => (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 hover:border-gray-300"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
              isDragging 
                ? "border-blue-400 bg-blue-50 shadow-lg shadow-blue-100/50" 
                : "border-gray-300 bg-white hover:border-blue-300 hover:shadow-md"
            }`}
          >
            <div className="absolute inset-0 opacity-5">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-400" />
            </div>
            
            <div className="relative">
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
                isDragging ? "bg-blue-100 text-blue-600 scale-110" : "bg-gray-100 text-gray-400"
              }`}>
                <CloudUpload className={`h-10 w-10 ${isDragging ? "text-blue-600" : "text-gray-400"}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Upload Land Records</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                Drag &amp; drop your scanned land records here, or click to browse
              </p>
              <p className="mb-6 text-xs text-gray-400">
                AI will automatically preprocess, classify, OCR and extract structured information
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800"
                >
                  <Upload className="h-4 w-4" />
                  Browse Files
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
                >
                  <Camera className="h-4 w-4" />
                  Open Camera
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <File className="h-3 w-3" /> PDF
                </span>
                <span className="h-3 w-px bg-gray-300" />
                <span className="flex items-center gap-1">
                  <File className="h-3 w-3" /> JPG
                </span>
                <span className="h-3 w-px bg-gray-300" />
                <span className="flex items-center gap-1">
                  <File className="h-3 w-3" /> PNG
                </span>
                <span className="h-3 w-px bg-gray-300" />
                <span>Max 50MB</span>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h4 className="font-medium text-gray-800">Uploaded Files</h4>
                  <p className="text-xs text-gray-400">{files.length} file(s) ready for processing</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                  {files.length} files
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3 font-medium">File Name</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Size</th>
                    <th className="px-6 py-3 font-medium">Pages</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {files.map((f) => (
                    <tr key={f.id} className="transition hover:bg-gray-50">
                      <td className="flex items-center gap-2 px-6 py-3 text-gray-700">
                        <File className="h-4 w-4 text-blue-500" />
                        {f.name}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{f.type}</td>
                      <td className="px-6 py-3 text-gray-500">{f.size}</td>
                      <td className="px-6 py-3 text-gray-500">{f.pages}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {startError && (
            <div className="mt-6">
              <BackendErrorBanner error={startError} />
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
              <BookOpen className="h-4 w-4" />
              View Template
            </button>
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
                Save as Draft
              </button>
              <button
                disabled={files.length === 0 || starting}
                onClick={onStartProcessing}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                {starting ? "Uploading to backend…" : "Start AI Processing"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-medium text-gray-800">Document Metadata</h3>
            </div>
            
            <div className="space-y-4">
              <Field 
                label="Document Type" 
                value={docType} 
                onChange={setDocType} 
                options={["Khatian / Record of Rights", "Mutation", "Jamabandi", "Property Tax Record"]}
                icon={<FileText className="h-3.5 w-3.5" />}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Field 
                  label="State" 
                  value={state} 
                  onChange={setState} 
                  options={["Jharkhand", "Bihar", "West Bengal"]}
                  icon={<Globe className="h-3.5 w-3.5" />}
                />
                <Field 
                  label="District" 
                  value={district} 
                  onChange={setDistrict} 
                  options={["Ranchi", "Dhanbad", "Bokaro"]}
                  icon={<MapPin className="h-3.5 w-3.5" />}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field 
                  label="Tehsil" 
                  value={tehsil} 
                  onChange={setTehsil} 
                  options={["Kanke", "Namkum", "Ratu"]}
                  icon={<Building className="h-3.5 w-3.5" />}
                />
                <Field 
                  label="Village" 
                  value={village} 
                  onChange={setVillage} 
                  options={["Bhurkunda", "Kanke", "Nagri"]}
                  icon={<Landmark className="h-3.5 w-3.5" />}
                />
              </div>
              
              <Field 
                label="Language" 
                value={language} 
                onChange={setLanguage} 
                options={["Hindi", "English", "Bengali"]}
                icon={<Globe className="h-3.5 w-3.5" />}
              />
              
              <Field 
                label="Source Department" 
                value={department} 
                onChange={setDepartment} 
                options={["Revenue Department", "Land Records Office", "Municipal Corporation"]}
                icon={<Building className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 2 — Processing animation                                      */
/* ------------------------------------------------------------------ */

const PROCESS_STAGES = [
  { label: "Upload", icon: Upload, color: "blue" },
  { label: "Preprocessing", icon: Scan, color: "indigo" },
  { label: "Classification", icon: Brain, color: "purple" },
  { label: "OCR", icon: FileText, color: "pink" },
  { label: "Extraction", icon: Sparkles, color: "amber" },
  { label: "Validation", icon: CheckCircle, color: "emerald" },
  { label: "Review", icon: FileCheck, color: "teal" },
];

type UiStageState = "done" | "active" | "pending" | "error";

const ProcessingStep: React.FC<{
  pipeline: DigitizationPipeline;
  onDone: () => void;
  onRetry: () => void;
}> = ({ pipeline, onDone, onRetry }) => {
  const { stages, ids } = pipeline;

  const combine = (keys: Array<keyof typeof stages>): UiStageState => {
    const list = keys.map((k) => stages[k].status);
    if (list.some((s) => s === "error")) return "error";
    if (list.every((s) => s === "done")) return "done";
    if (list.some((s) => s === "running" || s === "done")) return "active";
    return "pending";
  };

  const uiStages: Array<{ label: string; icon: typeof Upload; color: string; state: UiStageState }> = [
    { ...PROCESS_STAGES[0], state: stages.ingest.status === "done" ? "done" : stages.ingest.status === "error" ? "error" : stages.ingest.status === "running" ? "active" : "pending" },
    { ...PROCESS_STAGES[1], state: combine(["quality", "preprocess"]) },
    { ...PROCESS_STAGES[2], state: stages.classify.status === "done" ? "done" : stages.classify.status === "error" ? "error" : stages.classify.status === "running" ? "active" : "pending" },
    { ...PROCESS_STAGES[3], state: combine(["language", "ocrConfig", "ocr"]) },
    { ...PROCESS_STAGES[4], state: stages.extract.status === "done" ? "done" : stages.extract.status === "error" ? "error" : stages.extract.status === "running" ? "active" : "pending" },
    { ...PROCESS_STAGES[5], state: combine(["confidence", "validation", "anomaly"]) },
    { ...PROCESS_STAGES[6], state: stages.hitl.status === "done" ? "done" : stages.hitl.status === "error" ? "error" : stages.hitl.status === "running" ? "active" : "pending" },
  ];

  const allKeys = Object.keys(stages) as Array<keyof typeof stages>;
  const doneCount = allKeys.filter((k) => stages[k].status === "done").length;
  const ocrProgress = Math.round((doneCount / allKeys.length) * 100);
  const firstError = allKeys.map((k) => stages[k]).find((s) => s.status === "error")?.error;
  const chainDone = stages.extract.status === "done" && stages.anomaly.status === "done";
  const isComplete = chainDone;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Document ID: {ids?.document_id ?? "—"}</p>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
            {Math.round(ocrProgress)}% Complete
          </span>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-gray-800">AI Processing in Progress</h2>
        <p className="text-sm text-gray-500">Our AI is analyzing and extracting data from your document</p>

        <div className="my-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-[-20px] rounded-full border-4 border-blue-200 opacity-50" />
            <div className="absolute inset-[-40px] rounded-full border-4 border-blue-300 opacity-30" />
            
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-75" 
                   style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
              <div className="absolute inset-0 rounded-full bg-white/20" 
                   style={{ animation: 'spin-slow 8s linear infinite' }} />
              <Brain className="relative z-10 h-14 w-14 text-white" />
              <div className="absolute -right-2 -top-2">
                <span className="flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-blue-500" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {uiStages.map((stage) => {
            const done = stage.state === "done";
            const active = stage.state === "active";
            const error = stage.state === "error";
            const Icon = stage.icon;
            return (
              <div key={stage.label} className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-500 ${
                active ? 'bg-blue-50' : done ? 'bg-green-50' : error ? 'bg-rose-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-500 text-white' : error ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : error ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`font-medium ${done ? 'text-gray-700' : active ? 'text-gray-900' : error ? 'text-rose-700' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
                <span className={`text-xs ${done ? 'text-emerald-600' : active ? 'text-blue-600' : error ? 'text-rose-600' : 'text-gray-400'}`}>
                  {done ? '✓ Complete' : active ? 'Processing...' : error ? 'Failed' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-400">{Math.round(ocrProgress)}%</p>
        </div>

        {firstError && (
          <div className="mt-6">
            <BackendErrorBanner error={firstError} onRetry={onRetry} />
          </div>
        )}

        {isComplete && (
          <button
            onClick={onDone}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800"
          >
            View Extraction Results
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        <style>{`
          @keyframes pulse-ring {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 3 — AI extraction results (Grouped by category)              */
/* ------------------------------------------------------------------ */

const DocumentPreview: React.FC<{ ocr?: DigitizationPipeline["ocr"]; pages?: number | string }> = ({ ocr, pages }) => {
  const [zoom, setZoom] = useState(100);
  const pageCount = ocr?.pages?.length ?? pages ?? "—";
  const wordCount = ocr?.pages?.reduce((n, p) => n + (p.word_count ?? p.words?.length ?? 0), 0) ?? null;
  const excerpt = (ocr?.full_text ?? "").slice(0, 220);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Source Document</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-xs text-gray-400">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
      >
        <div className="p-6 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          {excerpt ? (
            <p className="line-clamp-6 text-left text-xs leading-relaxed text-gray-600">{excerpt}{excerpt.length >= 220 ? "…" : ""}</p>
          ) : (
            <p className="text-xs text-gray-500">Scanned document preview unavailable</p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            {typeof pageCount === "number" ? `Page 1 of ${pageCount}` : "Pages —"}
            {wordCount !== null ? ` · ${wordCount} words` : ""}
            {ocr?.engine ? ` · ${ocr.engine}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

const ExtractionResultsStep: React.FC<{ pipeline: DigitizationPipeline; onNext: () => void }> = ({ pipeline, onNext }) => {
  const fields = pipeline.extract ? extractionToFields(pipeline.extract) : [];
  const recordId = pipeline.ids?.record_id ?? pipeline.extract?.record_id ?? "—";
  const docTitle = pipeline.extract?.document_type ?? pipeline.classify?.predicted_document_type ?? "—";
  const extractError = pipeline.stages.extract.status === "error" ? pipeline.stages.extract.error : undefined;
  // Calculate overall stats
  const totalFields = fields.length;
  const highConfidence = fields.filter(f => f.confidence >= 90).length;
  const mediumConfidence = fields.filter(f => f.confidence >= 70 && f.confidence < 90).length;
  const lowConfidence = fields.filter(f => f.confidence < 70).length;
  const issues = fields.filter(f => f.issue).length;

  if (extractError) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
        <BackendErrorBanner error={extractError} />
      </div>
    );
  }
  if (!pipeline.extract) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
          No extraction result yet — complete backend processing first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      {/* Record ID Header */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <FileCode className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Record ID</p>
            <p className="font-mono text-sm font-semibold text-gray-800">{recordId}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Status:</span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle className="mr-1 h-3 w-3" />
              Extracted
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-800">{totalFields}</p>
          <p className="text-xs text-gray-400">Total Fields</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{highConfidence}</p>
          <p className="text-xs text-emerald-600">High Confidence</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{mediumConfidence}</p>
          <p className="text-xs text-amber-600">Medium Confidence</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-rose-600">{lowConfidence}</p>
          <p className="text-xs text-rose-600">Low Confidence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <DocumentPreview ocr={pipeline.ocr ?? undefined} />
            </div>
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="font-medium text-gray-800">Extracted Information</h3>
              <p className="text-sm text-gray-500">
                {docTitle} - {pipeline.extract?.status ?? ""}
              </p>
            </div>
            
            {/* Grouped fields display */}
            <div className="divide-y divide-gray-100">
              {FIELD_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const groupFields = fields.filter(f => group.fields.includes(f.id) || (group.title === "Additional Information" && f.id.startsWith("extra_")));
                if (groupFields.length === 0) return null;
                
                return (
                  <div key={group.title}>
                    <div className="flex items-center gap-2 bg-gray-50 px-6 py-2">
                      <GroupIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        {group.title}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                      {groupFields.map((field) => {
                        const tone = confidenceTone(field.confidence);
                        return (
                          <div key={field.id} className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5 hover:bg-gray-50 sm:border-r sm:border-b-0">
                            <div>
                              <p className="text-xs text-gray-400">{field.label}</p>
                              <p className="text-sm font-medium text-gray-800">{field.value}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {field.issue && (
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                              )}
                              <span className={`text-xs font-medium ${tone.text}`}>
                                {field.confidence}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Issues summary */}
            {issues > 0 && (
              <div className="border-t border-amber-200 bg-amber-50 px-6 py-3">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{issues} field(s) have issues that may need review</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Reprocess
            </button>
            <button
              onClick={onNext}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800"
            >
              Next: Confidence Analysis
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 4 — Confidence analysis                                         */
/* ------------------------------------------------------------------ */

const ConfidenceAnalysisStep: React.FC<{ pipeline: DigitizationPipeline; onNext: () => void }> = ({ pipeline, onNext }) => {
  const base = pipeline.extract ? extractionToFields(pipeline.extract) : [];
  const fields = pipeline.confidence ? applyConfidence(base, pipeline.confidence) : base;
  const overall = pipeline.confidence?.confidence?.overall;
  const avgConfidence = overall !== undefined && overall !== null ? Math.round(overall * 1000) / 10 : null;
  const high = fields.filter((f) => f.confidence >= 90).length;
  const medium = fields.filter((f) => f.confidence >= 70 && f.confidence < 90).length;
  const low = fields.filter((f) => f.confidence > 0 && f.confidence < 70).length;
  const warnings = fields.filter((f) => f.issue).length;
  const confError = pipeline.stages.confidence.status === "error" ? pipeline.stages.confidence.error : undefined;

  if (confError) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
        <BackendErrorBanner error={confError} />
      </div>
    );
  }
  if (!pipeline.confidence) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
          No confidence assessment yet — complete backend processing first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Overall Extraction Confidence</p>
        <p className="mt-1 text-4xl font-semibold text-emerald-600">{avgConfidence !== null ? `${avgConfidence}%` : "—"}</p>
        {pipeline.confidence?.completeness && (
          <p className="mt-1 text-xs text-gray-500">
            Completeness {Math.round(pipeline.confidence.completeness.score * 1000) / 10}% ·{" "}
            {pipeline.confidence.completeness.present_fields ?? 0}/
            {pipeline.confidence.completeness.applicable_fields ?? 0} fields present
            {pipeline.validation?.decision ? ` · Validation: ${pipeline.validation.decision}` : ""}
            {pipeline.anomaly?.workflow_state ? ` · Workflow: ${pipeline.anomaly.workflow_state}` : ""}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-gray-500">High (&ge;90%)</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{high}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-gray-500">Medium (70-90%)</p>
            <p className="mt-1 text-xl font-semibold text-amber-600">{medium}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs text-gray-500">Low (&lt;70%)</p>
            <p className="mt-1 text-xl font-semibold text-rose-600">{low}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Warnings</p>
            <p className="mt-1 text-xl font-semibold text-gray-700">{warnings}</p>
          </div>
        </div>

        <p className="mb-2 mt-6 text-sm font-medium text-gray-700">Confidence Distribution</p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="bg-emerald-500 transition-all" style={{ width: `${fields.length ? (high / fields.length) * 100 : 0}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${fields.length ? (medium / fields.length) * 100 : 0}%` }} />
          <div className="bg-rose-500 transition-all" style={{ width: `${fields.length ? (low / fields.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3 font-medium">Field</th>
              <th className="px-6 py-3 font-medium">Value</th>
              <th className="px-6 py-3 font-medium">AI Confidence</th>
              <th className="px-6 py-3 font-medium">Validation</th>
              <th className="px-6 py-3 font-medium">Issue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fields.map((f) => {
              const tone = confidenceTone(f.confidence);
              const validation = f.issue ? (f.confidence < 70 ? "Review" : "Warning") : "Valid";
              return (
                <tr key={f.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500">{f.label}</td>
                  <td className="px-6 py-3 text-gray-700">{f.value}</td>
                  <td className={`px-6 py-3 font-medium ${f.confidence ? tone.text : "text-gray-400"}`}>
                    {f.confidence ? `${f.confidence}%` : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        validation === "Valid"
                          ? "bg-emerald-100 text-emerald-700"
                          : validation === "Warning"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {validation === "Warning" && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {validation === "Review" && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {validation}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400">{f.issue ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {warnings > 0 && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Human verification required for {warnings} field{warnings > 1 ? "s" : ""}.
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800"
        >
          Proceed to Review
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 5 — Human review                                                */
/* ------------------------------------------------------------------ */

const CorrectionPanel: React.FC<{ pipeline: DigitizationPipeline; reviewer: string }> = ({ pipeline, reviewer }) => {
  const { correction, runCorrectionCycle } = pipeline;
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      await runCorrectionCycle({ reviewer: reviewer || "citizen-uploader", notes, files });
    } finally {
      setBusy(false);
    }
  };

  const remediationId = String(
    (correction.remediation as Record<string, unknown> | undefined)?.remediation_id ?? "",
  );
  const submissionId = String(
    (correction.submission as Record<string, unknown> | undefined)?.submission_id ?? "",
  );
  const run = (correction.run ?? {}) as Record<string, unknown>;
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-medium text-amber-800">Correction required — resubmit evidence</p>
      <p className="mt-0.5 text-xs text-amber-700">
        Upload corrected scans. The backend runs remediation → resubmission → reprocessing (phases 02–08) on real services.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.bmp,.webp"
          multiple
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Resolution notes (optional)"
          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700"
        />
      </div>
      <button
        disabled={busy || files.length === 0}
        onClick={start}
        className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Running backend correction…" : "Submit evidence & reprocess"}
      </button>
      {(correction.phase !== "idle" || correction.error) && (
        <div className="mt-3 space-y-1 text-xs text-amber-800">
          <p>Stage: {correction.phase}</p>
          {remediationId !== "" && <p>Remediation: {remediationId}</p>}
          {submissionId !== "" && <p>Submission: {submissionId}</p>}
          {typeof run.decision === "string" && <p>Reprocessing decision: {run.decision}</p>}
          {correction.error && <BackendErrorBanner error={correction.error} />}
        </div>
      )}
    </div>
  );
};

const HumanReviewStep: React.FC<{ pipeline: DigitizationPipeline; onNewRecord: () => void }> = ({
  pipeline,
  onNewRecord,
}) => {
  const { hitl, openHitl, reviewField, submitDecision } = pipeline;
  const base = pipeline.extract ? extractionToFields(pipeline.extract) : [];
  const fields = pipeline.confidence ? applyConfidence(base, pipeline.confidence) : base;
  const [index, setIndex] = useState(0);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<BackendError | undefined>(undefined);
  const [opening, setOpening] = useState(false);

  const flagged: string[] = (hitl?.flagged_fields as string[] | undefined) ?? [];
  const byId = new Map(fields.map((f) => [f.id, f]));
  // Map backend canonical flagged names onto UI rows via the slot table.
  const canonicalToUi = new Map<string, string>();
  for (const g of FIELD_GROUPS) for (const id of g.fields) canonicalToUi.set(id, id);
  const reviewFields = flagged.length
    ? flagged
        .map((c) => {
          const direct = byId.get(c);
          if (direct) return direct;
          const suffix = c.includes(".") ? c.split(".").slice(1).join("_") : c;
          return byId.get(suffix) ?? fields.find((f) => f.label.toLowerCase() === c.toLowerCase());
        })
        .filter((f): f is ExtractedField => Boolean(f))
    : fields.filter((f) => f.issue || f.confidence < 90);
  const safeIndex = Math.min(index, Math.max(0, reviewFields.length - 1));
  const field = reviewFields[safeIndex] ?? fields[fields.length - 1];
  const correctionValue = field ? corrections[field.id] ?? field.value : "";
  const reviews = (hitl?.field_reviews ?? {}) as Record<string, { action?: string }>;
  const avg = pipeline.confidence?.confidence?.overall;
  const terminal = hitl && ["VERIFIED", "CORRECTION_REQUIRED", "REJECTED"].includes(hitl.status);

  const doOpen = async () => {
    setOpening(true);
    setActionError(undefined);
    try {
      await openHitl(reviewer || "citizen-reviewer");
    } finally {
      setOpening(false);
    }
  };

  const doReview = async (action: "VERIFY" | "CORRECT" | "UNRESOLVED") => {
    if (!field) return;
    setBusy(true);
    setActionError(undefined);
    try {
      const res = await reviewField({
        field: field.id,
        action,
        value: action === "CORRECT" ? correctionValue : undefined,
        note: reason || undefined,
        reviewer: reviewer || "citizen-reviewer",
      });
      if (res && (res as { error_code?: string }).error_code) {
        setActionError({
          status: 400,
          error_code: (res as { error_code?: string }).error_code,
          message: (res as { error_message?: string }).error_message ?? "Field review failed",
          raw: res,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const doSubmit = async (decision: "VERIFIED" | "CORRECTION_REQUIRED" | "REJECTED") => {
    setBusy(true);
    setActionError(undefined);
    try {
      const res = await submitDecision({ decision, reviewer: reviewer || "citizen-reviewer", notes: reason || undefined });
      if (res && (res as { error_code?: string }).error_code) {
        setActionError({
          status: 400,
          error_code: (res as { error_code?: string }).error_code,
          message: (res as { error_message?: string }).error_message ?? "Submit failed",
          raw: res,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!hitl) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-medium text-gray-800">Open human review session</h3>
          <p className="mt-1 text-sm text-gray-500">
            Reviewer identity is required by the backend — every decision is attributed.
          </p>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Reviewer name or ID"
            className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {pipeline.stages.hitl.status === "error" && pipeline.stages.hitl.error && (
            <div className="mt-3">
              <BackendErrorBanner error={pipeline.stages.hitl.error} />
            </div>
          )}
          <button
            disabled={opening || !reviewer.trim()}
            onClick={doOpen}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shield className="h-4 w-4" />
            {opening ? "Opening session…" : "Open Review Session"}
          </button>
        </div>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
          No reviewable fields in this session.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-400">Record ID: {pipeline.ids?.record_id ?? "—"}</span>
        <span className="text-xs text-gray-400">Session: {hitl.hitl1_id}</span>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
          AI Confidence: {avg !== undefined && avg !== null ? `${Math.round(avg * 1000) / 10}%` : "—"}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          {reviewFields.length} Fields Need Review
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          Status: {hitl.status}
        </span>
        {hitl.status === "VERIFIED" && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Verified</span>
        )}
        {hitl.status === "REJECTED" && (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">Rejected</span>
        )}
      </div>

      <div className="mb-5 flex max-w-xl items-center gap-2">
        <input
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="Reviewer name or ID (required)"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {actionError && (
        <div className="mb-5">
          <BackendErrorBanner error={actionError} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <DocumentPreview ocr={pipeline.ocr ?? undefined} />

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-wide text-gray-400">AI Extracted Value</p>
          <p className="mb-1 text-sm font-medium text-gray-700">{field.label}</p>
          <input
            readOnly
            value={field.value}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
          />
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Confidence</span>
            <span className={confidenceTone(field.confidence).text}>{field.confidence || 0}%</span>
          </div>
          {reviews[field.id]?.action && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Reviewed: {reviews[field.id].action}
            </div>
          )}
          {field.issue && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Issue: {field.issue}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-wide text-gray-400">Reviewer Correction</p>
          <p className="mb-1 text-sm font-medium text-gray-700">{field.label}</p>
          <input
            value={correctionValue}
            onChange={(e) => setCorrections((c) => ({ ...c, [field.id]: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="mb-1 mt-4 text-sm font-medium text-gray-700">Reason</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              disabled={busy || terminal === true}
              onClick={() => doReview("VERIFY")}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
            <button
              disabled={busy || terminal === true}
              onClick={() => doReview("CORRECT")}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              disabled={busy || terminal === true}
              onClick={() => doReview("UNRESOLVED")}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ban className="h-3.5 w-3.5" />
              Incorrect
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            disabled={safeIndex === 0}
            onClick={() => setIndex(Math.max(0, safeIndex - 1))}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Field
          </button>
          <button
            disabled={safeIndex === reviewFields.length - 1}
            onClick={() => setIndex(Math.min(reviewFields.length - 1, safeIndex + 1))}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next Field
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={busy || terminal === true}
            onClick={() => doSubmit("CORRECTION_REQUIRED")}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Send Back
          </button>
          <button
            disabled={busy || terminal === true}
            onClick={() => doSubmit("VERIFIED")}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-emerald-700 hover:to-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shield className="h-4 w-4" />
            Approve Record
          </button>
        </div>
      </div>

      {hitl.status === "CORRECTION_REQUIRED" && (
        <CorrectionPanel pipeline={pipeline} reviewer={reviewer} />
      )}

      {(hitl.status === "VERIFIED" || hitl.status === "REJECTED") && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">
            Session {hitl.status === "VERIFIED" ? "verified" : "rejected"} — reviewer decision recorded on record {pipeline.ids?.record_id ?? ""}.
          </p>
          <button
            onClick={onNewRecord}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Start new record
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Root component                                                       */

/* ------------------------------------------------------------------ */
/* Root component                                                       */
/* ------------------------------------------------------------------ */

function CitizenDigitalizations() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<BackendError | undefined>(undefined);
  const pipeline = useDigitizationPipeline();

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const handleAddFiles = (incoming: File[]) => {
    setRawFiles((prev) => [...prev, ...incoming]);
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type || "Document",
        size: formatSize(f.size),
        pages: "—" as const,
        status: "ready" as const,
        uploadDate: new Date().toISOString().slice(0, 10),
      })),
    ]);
  };

  const handleStartProcessing = async () => {
    const target = rawFiles[0];
    if (!target || starting) return;
    setStarting(true);
    setStartError(undefined);
    setFiles((prev) => prev.map((f, i) => (i === 0 ? { ...f, status: "processing" as const } : f)));
    setStep("processing");
    const ok = await pipeline.runPipeline(target);
    setStarting(false);
    setFiles((prev) => prev.map((f, i) => (i === 0 ? { ...f, status: ok ? ("completed" as const) : ("failed" as const) } : f)));
    if (!ok) {
      const err = pipeline.stages.ingest.status === "error" ? pipeline.stages.ingest.error : undefined;
      setStartError(err);
      setStep("upload");
    }
  };

  const handleReset = () => {
    pipeline.reset();
    setFiles([]);
    setRawFiles([]);
    setStartError(undefined);
    setStep("upload");
  };

  const titles: Record<WizardStep, { title: string; subtitle: string }> = {
    upload: { title: "Land Record Digitization", subtitle: "Upload and convert legacy land records into verified digital data" },
    processing: { title: "AI Processing", subtitle: "Our AI is analyzing and extracting data from your document" },
    extraction: { title: "AI Extraction Results", subtitle: "Review the structured data extracted from the document" },
    confidence: { title: "Confidence Analysis", subtitle: "Field-level confidence scoring and validation checks" },
    review: { title: "Human Review", subtitle: "Correct low-confidence fields before approving the record" },
  };

  return (
    <div className="min-h-screen w-full bg-white text-gray-800">
      <div className="flex flex-col">
        <TopBar title={titles[step].title} subtitle={titles[step].subtitle} />
        <StepRail step={step} />

        {step === "upload" && (
          <UploadStep
            files={files}
            onAddFiles={handleAddFiles}
            onStartProcessing={handleStartProcessing}
            starting={starting}
            startError={startError}
          />
        )}
        {step === "processing" && (
          <ProcessingStep
            pipeline={pipeline}
            onDone={() => setStep("extraction")}
            onRetry={() => {
              const target = rawFiles[0];
              if (target) {
                setStep("upload");
                handleStartProcessing();
              }
            }}
          />
        )}
        {step === "extraction" && (
          <ExtractionResultsStep pipeline={pipeline} onNext={() => setStep("confidence")} />
        )}
        {step === "confidence" && (
          <ConfidenceAnalysisStep pipeline={pipeline} onNext={() => setStep("review")} />
        )}
        {step === "review" && (
          <HumanReviewStep pipeline={pipeline} onNewRecord={handleReset} />
        )}
      </div>
    </div>
  );
}

export default CitizenDigitalizations;