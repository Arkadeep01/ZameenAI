import React, { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  Map,
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
  pages: number;
  status: "ready" | "processing" | "completed" | "failed";
  uploadDate: string;
  confidence?: number;
}

interface ExtractedField {
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
                disabled={files.length === 0}
                onClick={onStartProcessing}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
              >
                <Sparkles className="h-4 w-4" />
                Start AI Processing
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
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Document ID: DOC-001</p>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
            {Math.round(ocrProgress)}% Complete
          </span>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-gray-800">AI Processing in Progress</h2>
        <p className="text-sm text-gray-500">Our AI is analyzing and extracting data from your document</p>

        <div className="my-8 flex justify-center">
          <div className="relative">
            <div className={`absolute inset-[-20px] rounded-full border-4 border-blue-200 opacity-50 transition-all duration-1000 ${pulse ? 'scale-110' : 'scale-100'}`} />
            <div className={`absolute inset-[-40px] rounded-full border-4 border-blue-300 opacity-30 transition-all duration-1000 ${pulse ? 'scale-125' : 'scale-100'}`} style={{ animationDelay: '0.3s' }} />
            
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
          {PROCESS_STAGES.map((stage, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex && !isComplete;
            const Icon = stage.icon;
            return (
              <div key={stage.label} className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-500 ${
                active ? 'bg-blue-50' : done ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`font-medium ${done ? 'text-gray-700' : active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
                <span className={`text-xs ${done ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-gray-400'}`}>
                  {done ? '✓ Complete' : active ? 'Processing...' : 'Pending'}
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

const DocumentPreview: React.FC = () => {
  const [zoom, setZoom] = useState(100);
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
          <p className="text-xs text-gray-500">Scanned Khatian record</p>
          <p className="text-xs text-gray-400">Page 1 of 2</p>
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      {/* Record ID Header */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <FileCode className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Record ID</p>
            <p className="font-mono text-sm font-semibold text-gray-800">{EXTRACTED_DATA.record_id}</p>
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
          <DocumentPreview />
        </div>
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="font-medium text-gray-800">Extracted Information</h3>
              <p className="text-sm text-gray-500">
                {EXTRACTED_DATA.document.document_title} - {EXTRACTED_DATA.document.document_type}
              </p>
            </div>
            
            {/* Grouped fields display */}
            <div className="divide-y divide-gray-100">
              {FIELD_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const groupFields = EXTRACTED_FIELDS.filter(f => group.fields.includes(f.id));
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

const ConfidenceAnalysisStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const high = EXTRACTED_FIELDS.filter((f) => f.confidence >= 90).length;
  const medium = EXTRACTED_FIELDS.filter((f) => f.confidence >= 70 && f.confidence < 90).length;
  const low = EXTRACTED_FIELDS.filter((f) => f.confidence > 0 && f.confidence < 70).length;
  const warnings = EXTRACTED_FIELDS.filter((f) => f.issue).length;

  // Calculate average confidence
  const avgConfidence = Math.round(EXTRACTED_FIELDS.reduce((sum, f) => sum + f.confidence, 0) / EXTRACTED_FIELDS.length);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Overall Extraction Confidence</p>
        <p className="mt-1 text-4xl font-semibold text-emerald-600">{avgConfidence}%</p>

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
          <div className="bg-emerald-500 transition-all" style={{ width: `${(high / EXTRACTED_FIELDS.length) * 100}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${(medium / EXTRACTED_FIELDS.length) * 100}%` }} />
          <div className="bg-rose-500 transition-all" style={{ width: `${(low / EXTRACTED_FIELDS.length) * 100}%` }} />
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
            {EXTRACTED_FIELDS.map((f) => {
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-xs text-gray-400">Record ID: {EXTRACTED_DATA.record_id}</span>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">AI Confidence: 68.4%</span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          {reviewFields.length} Fields Need Review
        </span>
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">Priority: High</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <DocumentPreview />

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
            <button className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-blue-700">
              <CheckCircle className="h-3.5 w-3.5" />
              Save
            </button>
            <button className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-rose-700">
              <Ban className="h-3.5 w-3.5" />
              Incorrect
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Field
          </button>
          <button
            disabled={index === reviewFields.length - 1}
            onClick={() => setIndex((i) => Math.min(reviewFields.length - 1, i + 1))}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next Field
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToUpload}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <Send className="h-4 w-4" />
            Send Back
          </button>
          <button
            onClick={onApprove}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-emerald-700 hover:to-emerald-800"
          >
            <Shield className="h-4 w-4" />
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

  return (
    <div className="min-h-screen w-full bg-white text-gray-800">
      <div className="flex flex-col">
        <TopBar title={titles[step].title} subtitle={titles[step].subtitle} />
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
      </div>
    </div>
  );
}

export default CitizenDigitalizations;