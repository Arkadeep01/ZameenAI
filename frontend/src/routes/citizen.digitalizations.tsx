import React, { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import StatusBadge, { type StatusTone } from "../components/common/StatusBadge";
import {
  buttonClass,
  cardHeadingClass,
  eyebrowClass,
  fieldClass,
  surface,
  surfacePadded,
} from "../components/common/portalStyles";
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Upload,
  File,
  CloudUpload,
  Camera,
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
  Map,
  FileCode,
  Info,
  Calendar,
} from "lucide-react";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

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
  pages: number;
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
/* Static / seed data                                                  */
/* ------------------------------------------------------------------ */

// New data structure matching the provided JSON
const EXTRACTED_DATA = {
  record_id: "LR-2026-00001",
  document: {
    document_id: "DOC-001",
    document_type: "LAND_RECORD",
    document_title: "Khatian",
    department: "Land & Land Reforms Department",
    document_date: "2025-06-15",
    map_number: "MAP-123"
  },
  owner: {
    name: "Ramesh Kumar",
    father_husband_name: "Rajesh Kumar",
    co_owner: "Suresh Kumar",
    recorded_tenant: "Ramesh Kumar"
  },
  land: {
    survey_number: "123",
    khasra_number: "789",
    plot_number: "45",
    khata_number: "KH-456",
    area: 2.5,
    area_unit: "ACRE",
    nature_of_land: "AGRICULTURAL",
    land_type: "AGRICULTURAL"
  },
  location: {
    state: "West Bengal",
    district: "Example District",
    block: "Example Block",
    tehsil: "Example Tehsil",
    mouza: "Example Mouza",
    village: "Example Village"
  },
  mutation: {
    mutation_number: "MUT-12345",
    mutation_date: "2025-06-10"
  },
  additional: {
    remarks: "No additional remarks"
  }
};

// Convert to flat fields for display with confidence scores
const EXTRACTED_FIELDS: ExtractedField[] = [
  // Record Info
  { id: "record_id", label: "Record ID", value: EXTRACTED_DATA.record_id, confidence: 99.5 },
  
  // Document Info
  { id: "doc_id", label: "Document ID", value: EXTRACTED_DATA.document.document_id, confidence: 98.7 },
  { id: "doc_type", label: "Document Type", value: EXTRACTED_DATA.document.document_type, confidence: 97.8 },
  { id: "doc_title", label: "Document Title", value: EXTRACTED_DATA.document.document_title, confidence: 96.2 },
  { id: "department", label: "Department", value: EXTRACTED_DATA.document.department, confidence: 95.4 },
  { id: "doc_date", label: "Document Date", value: EXTRACTED_DATA.document.document_date, confidence: 94.1 },
  { id: "map_number", label: "Map Number", value: EXTRACTED_DATA.document.map_number, confidence: 92.3 },
  
  // Owner Info
  { id: "owner_name", label: "Owner Name", value: EXTRACTED_DATA.owner.name, confidence: 97.6 },
  { id: "father_name", label: "Father/Husband Name", value: EXTRACTED_DATA.owner.father_husband_name, confidence: 96.8 },
  { id: "co_owner", label: "Co-owner", value: EXTRACTED_DATA.owner.co_owner, confidence: 91.2 },
  { id: "recorded_tenant", label: "Recorded Tenant", value: EXTRACTED_DATA.owner.recorded_tenant, confidence: 94.5 },
  
  // Land Info
  { id: "survey_number", label: "Survey Number", value: EXTRACTED_DATA.land.survey_number, confidence: 98.9 },
  { id: "khasra_number", label: "Khasra Number", value: EXTRACTED_DATA.land.khasra_number, confidence: 97.3 },
  { id: "plot_number", label: "Plot Number", value: EXTRACTED_DATA.land.plot_number, confidence: 96.1 },
  { id: "khata_number", label: "Khata Number", value: EXTRACTED_DATA.land.khata_number, confidence: 95.8 },
  { id: "area", label: "Area", value: `${EXTRACTED_DATA.land.area}`, confidence: 98.2 },
  { id: "area_unit", label: "Area Unit", value: EXTRACTED_DATA.land.area_unit, confidence: 97.7 },
  { id: "nature_of_land", label: "Nature of Land", value: EXTRACTED_DATA.land.nature_of_land, confidence: 93.6 },
  { id: "land_type", label: "Land Type", value: EXTRACTED_DATA.land.land_type, confidence: 94.2 },
  
  // Location
  { id: "state", label: "State", value: EXTRACTED_DATA.location.state, confidence: 99.1 },
  { id: "district", label: "District", value: EXTRACTED_DATA.location.district, confidence: 98.6 },
  { id: "block", label: "Block", value: EXTRACTED_DATA.location.block, confidence: 97.4 },
  { id: "tehsil", label: "Tehsil", value: EXTRACTED_DATA.location.tehsil, confidence: 96.9 },
  { id: "mouza", label: "Mouza", value: EXTRACTED_DATA.location.mouza, confidence: 95.3 },
  { id: "village", label: "Village", value: EXTRACTED_DATA.location.village, confidence: 98.0 },
  
  // Mutation
  { id: "mutation_number", label: "Mutation Number", value: EXTRACTED_DATA.mutation.mutation_number, confidence: 89.5, issue: "OCR ambiguity" },
  { id: "mutation_date", label: "Mutation Date", value: EXTRACTED_DATA.mutation.mutation_date, confidence: 87.2, issue: "OCR ambiguity" },
  
  // Additional
  { id: "remarks", label: "Remarks", value: EXTRACTED_DATA.additional.remarks, confidence: 99.0 },
];

// Group fields for display
const FIELD_GROUPS = [
  { title: "Record Information", icon: FileCode, fields: ["record_id"] },
  { title: "Document Details", icon: FileText, fields: ["doc_id", "doc_type", "doc_title", "department", "doc_date", "map_number"] },
  { title: "Owner Information", icon: UserIcon, fields: ["owner_name", "father_name", "co_owner", "recorded_tenant"] },
  { title: "Land Details", icon: Home, fields: ["survey_number", "khasra_number", "plot_number", "khata_number", "area", "area_unit", "nature_of_land", "land_type"] },
  { title: "Location Details", icon: MapPin, fields: ["state", "district", "block", "tehsil", "mouza", "village"] },
  { title: "Mutation Details", icon: Calendar, fields: ["mutation_number", "mutation_date"] },
  { title: "Additional Information", icon: Info, fields: ["remarks"] },
];

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

/**
 * Digitisation-domain status tones.
 *
 * The shared `StatusBadge` resolves tones from the canonical civic/cadastral
 * vocabulary. A few labels here mean something different in this workflow, so
 * the page states the tone explicitly rather than changing global semantics:
 *   - "Review"    = field needs human verification (not "under review")
 *   - "Valid"     = cross-check passed
 *   - "Ready"     = file accepted and queued
 *   - "Extracted" = AI read completed successfully
 */
const DIGITIZATION_TONES: Record<string, StatusTone> = {
  ready: "current",
  extracted: "success",
  valid: "success",
  review: "danger",
  warning: "warning",
};

/** Confidence text colour only. Tinted surfaces/badges are set per component. */
function confidenceTone(conf: number) {
  if (conf >= 90) return { text: "text-emerald-700" };
  if (conf >= 70) return { text: "text-amber-700" };
  return { text: "text-rose-700" };
}

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
    <nav aria-label="Digitization progress" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => {
          const isDone = i < idx;
          const isCurrent = i === idx;
          return (
            <li key={s.key} className="flex min-w-0 items-center gap-1.5">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : isCurrent
                      ? "border-[#1261A8]/30 bg-[#EAF3FC] text-[#1261A8]"
                      : "border-[#D9E2EC] bg-white text-[#607089]"
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                ) : isCurrent ? (
                  <span className="shrink-0">{s.icon}</span>
                ) : (
                  <span className="font-mono">{i + 1}</span>
                )}
                {s.label}
              </span>

              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-px w-4 shrink-0 sm:w-6 ${isDone ? "bg-emerald-300" : "bg-[#D9E2EC]"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/* Step 1 — Upload                                                     */
/* ------------------------------------------------------------------ */

const UploadStep: React.FC<{
  files: FileUpload[];
  onAddFile: (f: FileUpload) => void;
  onStartProcessing: () => void;
}> = ({ files, onAddFile, onStartProcessing }) => {
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

  const addSampleFile = () => {
    onAddFile({
      id: crypto.randomUUID(),
      name: "Khatian_123_4.pdf",
      type: "Khatian",
      size: "2.4 MB",
      pages: 2,
      status: "ready",
      uploadDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addSampleFile();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addSampleFile();
  };

  const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: string[]; icon?: React.ReactNode }> = ({
    label,
    value,
    onChange,
    options,
    icon,
  }) => (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#607089]">
        {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed bg-white p-6 text-center transition-colors duration-150 sm:p-10 ${
              isDragging
                ? "border-[#1261A8] bg-[#EAF3FC]"
                : "border-[#D9E2EC] hover:border-[#1261A8]/60 hover:bg-[#F6F8FB]"
            }`}
          >
            <div>
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-150 ${
                  isDragging ? "bg-[#1261A8]/10 text-[#1261A8]" : "bg-[#EAF3FC] text-[#1261A8]"
                }`}
              >
                <CloudUpload className="h-8 w-8" />
              </div>
              <h3 className={`${cardHeadingClass} text-center`}>Upload Land Records</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
                Drag &amp; drop your scanned land records here, or click to browse
              </p>
              <p className="mb-5 mt-1 text-xs text-[#607089]">
                AI will automatically preprocess, classify, OCR and extract structured information
              </p>
              <div className="flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonClass("primary", "lg")}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Browse Files
                </button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className={buttonClass("secondary", "lg")}>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Open Camera
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-[#607089]">
                {["PDF", "JPG", "PNG"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1">
                    <File className="h-3 w-3" aria-hidden="true" />
                    {t}
                  </span>
                ))}
                <span aria-hidden="true" className="h-3 w-px bg-[#D9E2EC]" />
                <span>Max 50MB</span>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className={`${surface} mt-5 overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#062B52]">Uploaded Files</h4>
                  <p className="text-xs text-[#607089]">{files.length} file(s) ready for processing</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {files.length} files
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-[#607089]">
                      <th scope="col" className="px-5 py-3 font-semibold">File Name</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Type</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Size</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Pages</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {files.map((f) => (
                      <tr key={f.id} className="transition-colors hover:bg-[#F6F8FB]">
                        <td className="px-5 py-3 font-medium text-[#062B52]">
                          <span className="flex items-center gap-2">
                            <File className="h-4 w-4 shrink-0 text-[#1261A8]" aria-hidden="true" />
                            <span className="truncate">{f.name}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{f.type}</td>
                        <td className="px-5 py-3 text-slate-600">{f.size}</td>
                        <td className="px-5 py-3 text-slate-600">{f.pages}</td>
                        <td className="px-5 py-3">
                          <StatusBadge
                            status={f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                            tone={DIGITIZATION_TONES[f.status.toLowerCase()]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className={buttonClass("secondary", "md")}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              View Template
            </button>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              <button type="button" className={buttonClass("secondary", "md")}>
                Save as Draft
              </button>
              <button type="button" disabled={files.length === 0} onClick={onStartProcessing} className={buttonClass("primary", "md")}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Start AI Processing
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className={surfacePadded}>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC]">
                <Layers className="h-4 w-4 text-[#1261A8]" aria-hidden="true" />
              </div>
              <h3 className={cardHeadingClass}>Document Metadata</h3>
            </div>

            <div className="space-y-4">
              <Field 
                label="Document Type" 
                value={docType} 
                onChange={setDocType} 
                options={["Khatian / Record of Rights", "Mutation", "Jamabandi", "Property Tax Record"]}
                icon={<FileText className="h-3.5 w-3.5" />}
              />
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

const ProcessingStep: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [ocrProgress, setOcrProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setOcrProgress(0);
    setStageIndex(0);
    let stageInterval: ReturnType<typeof setInterval>;
    
    const progressInterval = setInterval(() => {
      setOcrProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          clearInterval(stageInterval);
          setStageIndex(PROCESS_STAGES.length);
          return 100;
        }
        return p + 2;
      });
    }, 70);

    stageInterval = setInterval(() => {
      setStageIndex((idx) => {
        const newIdx = Math.min(Math.floor(ocrProgress / 14), PROCESS_STAGES.length - 1);
        return Math.min(newIdx + 1, PROCESS_STAGES.length);
      });
    }, 500);

    const pulseInterval = setInterval(() => {
      setPulse((p) => !p);
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      clearInterval(pulseInterval);
    };
  }, []);

  const isComplete = ocrProgress >= 100;

  return (
    <div className="mx-auto w-full max-w-2xl min-w-0">
      <div className={`${surface} w-full min-w-0 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#607089]">Document ID: DOC-001</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1261A8]/30 bg-[#EAF3FC] px-2.5 py-1 text-xs font-semibold text-[#1261A8]">
            {isComplete ? <Check className="h-3 w-3" aria-hidden="true" /> : <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            {Math.round(ocrProgress)}% Complete
          </span>
        </div>
        <h2 className={`${cardHeadingClass} mt-2`}>AI Processing in Progress</h2>
        <p className="mt-1 text-sm text-[#607089]">Our AI is analyzing and extracting data from your document</p>

        <div className="my-7 flex justify-center">
          <div className="relative">
            <div
              aria-hidden="true"
              className={`absolute inset-[-18px] rounded-full border-2 border-[#1261A8]/25 transition-transform duration-1000 ${
                pulse ? "scale-110" : "scale-100"
              }`}
            />
            <div
              aria-hidden="true"
              className={`absolute inset-[-36px] rounded-full border-2 border-[#1261A8]/15 transition-transform duration-1000 ${
                pulse ? "scale-125" : "scale-100"
              }`}
            />

            <div className="pulse-ring relative flex h-28 w-28 items-center justify-center rounded-full bg-[#1261A8] shadow-xs sm:h-32 sm:w-32">
              <Brain className="relative z-10 h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {PROCESS_STAGES.map((stage, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex && !isComplete;
            const Icon = stage.icon;
            return (
              <div
                key={stage.label}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-300 ${
                  active
                    ? "border-[#1261A8]/30 bg-[#EAF3FC]"
                    : done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-[#D9E2EC] bg-[#F6F8FB]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                    done ? "bg-emerald-600 text-white" : active ? "bg-[#1261A8] text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`truncate text-sm font-semibold ${done ? "text-[#062B52]" : active ? "text-[#062B52]" : "text-[#607089]"}`}>
                    {stage.label}
                  </span>
                </div>
                <span className={`shrink-0 text-xs font-medium ${done ? "text-emerald-700" : active ? "text-[#1261A8]" : "text-[#607089]"}`}>
                  {done ? "Complete" : active ? "Processing..." : "Pending"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div
            role="progressbar"
            aria-valuenow={Math.round(ocrProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="OCR processing progress"
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-[#1261A8] transition-[width] duration-300"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-[#607089]">{Math.round(ocrProgress)}%</p>
        </div>

        {isComplete && (
          <button type="button" onClick={onDone} className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
            View Extraction Results
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 3 — AI extraction results (Grouped by category)              */
/* ------------------------------------------------------------------ */

const DocumentPreview: React.FC = () => {
  const [zoom, setZoom] = useState(100);
  return (
    <div className={surfacePadded}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#062B52]">Source Document</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9E2EC] bg-white text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="w-11 text-center text-xs tabular-nums text-[#607089]">{zoom}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9E2EC] bg-white text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-[#D9E2EC] bg-[#F6F8FB]"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
      >
        <div className="p-6 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="text-xs font-medium text-[#062B52]">Scanned Khatian record</p>
          <p className="text-xs text-[#607089]">Page 1 of 2</p>
        </div>
      </div>
    </div>
  );
};

const ExtractionResultsStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  // Calculate overall stats
  const totalFields = EXTRACTED_FIELDS.length;
  const highConfidence = EXTRACTED_FIELDS.filter(f => f.confidence >= 90).length;
  const mediumConfidence = EXTRACTED_FIELDS.filter(f => f.confidence >= 70 && f.confidence < 90).length;
  const lowConfidence = EXTRACTED_FIELDS.filter(f => f.confidence < 70).length;
  const issues = EXTRACTED_FIELDS.filter(f => f.issue).length;

  return (
    <div className="min-w-0">
      {/* Record ID Header */}
      <div className={`${surface} mb-5 flex flex-wrap items-center justify-between gap-3 p-4`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC]">
            <FileCode className="h-5 w-5 text-[#1261A8]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className={eyebrowClass}>Record ID</p>
            <p className="truncate font-mono text-sm font-bold text-[#062B52]">{EXTRACTED_DATA.record_id}</p>
          </div>
        </div>
        <StatusBadge status="Extracted" size="md" tone={DIGITIZATION_TONES.extracted} />
      </div>

      {/* Stats Summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Fields", value: totalFields, cls: "border-[#D9E2EC] bg-white text-[#062B52]" },
          { label: "High Confidence", value: highConfidence, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
          { label: "Medium Confidence", value: mediumConfidence, cls: "border-amber-200 bg-amber-50 text-amber-700" },
          { label: "Low Confidence", value: lowConfidence, cls: "border-rose-200 bg-rose-50 text-rose-700" },
        ].map((t) => (
          <div key={t.label} className={`rounded-xl border p-3 text-center shadow-xs ${t.cls}`}>
            <p className="text-2xl font-bold tabular-nums">{t.value}</p>
            <p className="text-xs font-medium opacity-80">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <DocumentPreview />
        </div>
        <div className="lg:col-span-3">
          <div className={`${surface} overflow-hidden`}>
            <div className="border-b border-slate-100 bg-[#F6F8FB] px-5 py-4">
              <h3 className={cardHeadingClass}>Extracted Information</h3>
              <p className="mt-0.5 text-xs text-[#607089]">
                {EXTRACTED_DATA.document.document_title} - {EXTRACTED_DATA.document.document_type}
              </p>
            </div>
            
            {/* Grouped fields display */}
            <div className="divide-y divide-slate-100">
              {FIELD_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const groupFields = EXTRACTED_FIELDS.filter(f => group.fields.includes(f.id));
                if (groupFields.length === 0) return null;
                
                return (
                  <div key={group.title}>
                    <div className="flex items-center gap-2 bg-[#F6F8FB] px-5 py-2">
                      <GroupIcon className="h-3.5 w-3.5 shrink-0 text-[#1261A8]" aria-hidden="true" />
                      <span className={eyebrowClass}>{group.title}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                      {groupFields.map((field) => {
                        const tone = confidenceTone(field.confidence);
                        return (
                          <div
                            key={field.id}
                            className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 px-5 py-2.5 transition-colors hover:bg-[#F6F8FB] sm:border-r sm:last:border-r-0"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-[#607089]">{field.label}</p>
                              <p className="truncate text-sm font-semibold text-[#062B52]">{field.value}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {field.issue && (
                                <AlertTriangle className="h-3 w-3 text-amber-600" aria-label={`Needs review: ${field.issue}`} />
                              )}
                              <span className={`text-xs font-semibold tabular-nums ${tone.text}`}>{field.confidence}%</span>
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
              <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{issues} field(s) have issues that may need review</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" className={buttonClass("secondary", "md")}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reprocess
            </button>
            <button type="button" onClick={onNext} className={buttonClass("primary", "md")}>
              Next: Confidence Analysis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

const ConfidenceAnalysisStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const high = EXTRACTED_FIELDS.filter((f) => f.confidence >= 90).length;
  const medium = EXTRACTED_FIELDS.filter((f) => f.confidence >= 70 && f.confidence < 90).length;
  const low = EXTRACTED_FIELDS.filter((f) => f.confidence > 0 && f.confidence < 70).length;
  const warnings = EXTRACTED_FIELDS.filter((f) => f.issue).length;

  // Calculate average confidence
  const avgConfidence = Math.round(EXTRACTED_FIELDS.reduce((sum, f) => sum + f.confidence, 0) / EXTRACTED_FIELDS.length);

  return (
    <div className="min-w-0">
      <div className={surfacePadded}>
        <p className="text-sm text-[#607089]">Overall Extraction Confidence</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-700">{avgConfidence}%</p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "High (≥90%)", value: high, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
            { label: "Medium (70-90%)", value: medium, cls: "border-amber-200 bg-amber-50 text-amber-700" },
            { label: "Low (&lt;70%)", value: low, cls: "border-rose-200 bg-rose-50 text-rose-700" },
            { label: "Warnings", value: warnings, cls: "border-[#D9E2EC] bg-[#F6F8FB] text-[#062B52]" },
          ].map((t) => (
            <div key={t.label} className={`rounded-lg border p-3.5 ${t.cls}`}>
              <p className="text-xs font-medium opacity-80">{t.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{t.value}</p>
            </div>
          ))}
        </div>

        <p className="mb-2 mt-5 text-sm font-semibold text-[#062B52]">Confidence Distribution</p>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="bg-emerald-500 transition-[width]" style={{ width: `${(high / EXTRACTED_FIELDS.length) * 100}%` }} />
          <div className="bg-amber-500 transition-[width]" style={{ width: `${(medium / EXTRACTED_FIELDS.length) * 100}%` }} />
          <div className="bg-rose-500 transition-[width]" style={{ width: `${(low / EXTRACTED_FIELDS.length) * 100}%` }} />
        </div>
      </div>

      <div className={`${surface} mt-5 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-[#607089]">
                <th scope="col" className="px-5 py-3 font-semibold">Field</th>
                <th scope="col" className="px-5 py-3 font-semibold">Value</th>
                <th scope="col" className="px-5 py-3 font-semibold">AI Confidence</th>
                <th scope="col" className="px-5 py-3 font-semibold">Validation</th>
                <th scope="col" className="px-5 py-3 font-semibold">Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {EXTRACTED_FIELDS.map((f) => {
                const tone = confidenceTone(f.confidence);
                const validation = f.issue ? (f.confidence < 70 ? "Review" : "Warning") : "Valid";
                return (
                  <tr key={f.id} className="transition-colors hover:bg-[#F6F8FB]">
                    <td className="px-5 py-3 text-[#607089]">{f.label}</td>
                    <td className="px-5 py-3 font-medium text-[#062B52]">{f.value}</td>
                    <td className={`px-5 py-3 font-semibold tabular-nums ${f.confidence ? tone.text : "text-[#607089]"}`}>
                      {f.confidence ? `${f.confidence}%` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={validation}
                        tone={DIGITIZATION_TONES[validation.toLowerCase()]}
                        withIcon={validation !== "Valid"}
                      />
                    </td>
                    <td className="px-5 py-3 text-[#607089]">{f.issue ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {warnings > 0 && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Human verification required for {warnings} field{warnings > 1 ? "s" : ""}.
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onNext} className={buttonClass("primary", "md")}>
          Proceed to Review
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 5 — Human review                                                */
/* ------------------------------------------------------------------ */

const HumanReviewStep: React.FC<{ onApprove: () => void; onBackToUpload: () => void }> = ({
  onApprove,
  onBackToUpload,
}) => {
  const reviewFields = EXTRACTED_FIELDS.filter((f) => f.issue || f.confidence < 90);
  const [index, setIndex] = useState(0);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("Read clearly from source");

  const field = reviewFields[index] ?? EXTRACTED_FIELDS[EXTRACTED_FIELDS.length - 1];
  const correctionValue = corrections[field.id] ?? field.value;

  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#607089]">Record ID: {EXTRACTED_DATA.record_id}</span>
        <span className="inline-flex items-center rounded-full border border-[#1261A8]/30 bg-[#EAF3FC] px-2.5 py-1 text-xs font-semibold text-[#1261A8]">
          AI Confidence: 68.4%
        </span>
        <StatusBadge status={`${reviewFields.length} Fields Need Review`} tone="action" />
        <StatusBadge status="Priority: High" tone="danger" />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <DocumentPreview />

        <div className={`${surface} p-5`}>
          <p className={eyebrowClass}>AI Extracted Value</p>
          <p className="mb-1.5 mt-2 text-sm font-semibold text-[#062B52]">{field.label}</p>
          <input readOnly value={field.value} className={`${fieldClass} cursor-default bg-[#F6F8FB] text-slate-500`} />
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#607089]">Confidence</span>
            <span className={`font-semibold tabular-nums ${confidenceTone(field.confidence).text}`}>{field.confidence || 0}%</span>
          </div>
          {field.issue && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Issue: {field.issue}
            </div>
          )}
        </div>

        <div className={`${surface} p-5`}>
          <p className={eyebrowClass}>Reviewer Correction</p>
          <p className="mb-1.5 mt-2 text-sm font-semibold text-[#062B52]">{field.label}</p>
          <input
            value={correctionValue}
            onChange={(e) => setCorrections((c) => ({ ...c, [field.id]: e.target.value }))}
            className={fieldClass}
          />
          <p className="mb-1.5 mt-4 text-sm font-semibold text-[#062B52]">Reason</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={`${fieldClass} min-h-[84px] resize-none`}
          />

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" className={`${buttonClass("success", "sm")} w-full px-2`}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Accept
            </button>
            <button type="button" className={`${buttonClass("primary", "sm")} w-full px-2`}>
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Save
            </button>
            <button type="button" className={`${buttonClass("danger", "sm")} w-full px-2`}>
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              Incorrect
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className={buttonClass("secondary", "sm")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous Field
          </button>
          <button
            type="button"
            disabled={index === reviewFields.length - 1}
            onClick={() => setIndex((i) => Math.min(reviewFields.length - 1, i + 1))}
            className={buttonClass("secondary", "sm")}
          >
            Next Field
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={onBackToUpload} className={buttonClass("secondary", "md")}>
            <Send className="h-4 w-4" aria-hidden="true" />
            Send Back
          </button>
          <button type="button" onClick={onApprove} className={buttonClass("success", "md")}>
            <Shield className="h-4 w-4" aria-hidden="true" />
            Approve Record
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Root component                                                       */
/* ------------------------------------------------------------------ */

function CitizenDigitalizations() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [files, setFiles] = useState<FileUpload[]>([]);

  const titles: Record<WizardStep, { title: string; subtitle: string }> = {
    upload: { title: "Land Record Digitization", subtitle: "Upload and convert legacy land records into verified digital data" },
    processing: { title: "AI Processing", subtitle: "Our AI is analyzing and extracting data from your document" },
    extraction: { title: "AI Extraction Results", subtitle: "Review the structured data extracted from the document" },
    confidence: { title: "Confidence Analysis", subtitle: "Field-level confidence scoring and validation checks" },
    review: { title: "Human Review", subtitle: "Correct low-confidence fields before approving the record" },
  };

  const handleReset = () => {
    setFiles([]);
    setStep("upload");
  };

  const { title, subtitle } = titles[step];

  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      <PageHeader
        breadcrumbs={citizenCrumbs("/citizen/digitalizations")}
        title={title}
        subtitle={subtitle}
      />

      <StepRail step={step} />

      {step === "upload" && (
        <UploadStep
          files={files}
          onAddFile={(f) => setFiles((prev) => [...prev, f])}
          onStartProcessing={() => setStep("processing")}
        />
      )}
      {step === "processing" && <ProcessingStep onDone={() => setStep("extraction")} />}
      {step === "extraction" && <ExtractionResultsStep onNext={() => setStep("confidence")} />}
      {step === "confidence" && <ConfidenceAnalysisStep onNext={() => setStep("review")} />}
      {step === "review" && (
        <HumanReviewStep
          onApprove={handleReset}
          onBackToUpload={() => setStep("upload")}
        />
      )}
    </PageContainer>
  );
}

export default CitizenDigitalizations;