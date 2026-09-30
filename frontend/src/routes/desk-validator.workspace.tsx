import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CircleCheck,
  FileText,
  Pencil,
  Save,
  ShieldCheck,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { FLAGGED_FIELDS, FLAGGED_SUMMARY } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { GovStrip } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/workspace")({
  component: DeskValidatorWorkspace,
});

/**
 * Side-by-side AI/OCR scrutiny workspace (PRD journey step 3).
 *
 * `ValidatorStore` supplies the selected case and the officer's corrections for
 * the two low-confidence fields; the scan viewer stays read-only.
 */
function DeskValidatorWorkspace() {
  const navigate = useNavigate();
  const { selectedCase, validatorValues, setValidatorValues } = useDeskValidator();

  return (
    <>
      <GovStrip />

      <div className="mb-3 flex flex-col gap-2 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate({ to: "/desk-validator/queue" })} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800"><ArrowLeft size={14} /> Back to Validation Queue</button>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-900">{selectedCase}</span>
          <span className="text-slate-400">· Eastern Dedicated Freight Corridor Phase-II</span>
        </p>
        <p className="flex items-center gap-2 font-mono"><span>Record Version: v1</span><span className="text-slate-300">|</span><span className="inline-flex items-center gap-1 font-sans font-bold text-indigo-700"><FileText size={14} /> Full Case Dossier</span></p>
      </div>

      <PortalCard className="!p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-black text-slate-900">{selectedCase}</span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">● Pending Validation</span>
              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-black tracking-wider text-red-700">CRITICAL</span>
              <span className="font-mono text-xs text-slate-500">Doc: DOC-2026-00895</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              <span className="font-bold">Project:</span> Eastern Dedicated Freight Corridor Phase-II <span className="mx-1">·</span> <span className="font-bold">Location:</span> Singur, Singur, Hooghly <span className="mx-1">·</span> <span className="font-bold">Parcel:</span> Khasra 192/B (Khata 588)<br />
              <span className="font-bold">Type:</span> Registered Sale Deed (Kabala) - Chandannagore Registry
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              Overall AI Extraction Confidence:
              <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-200"><span className="block h-full w-[65%] rounded-full bg-red-500" /></span>
              <span className="font-mono font-bold text-red-600">65%</span> (Low)
              <span className="ml-1">Flagged Low-Confidence:</span>
              <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono font-bold text-red-700">2 unresolved</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Save size={14} /> Save Draft</button>
            <button className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Accept All AI</button>
            <button className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"><Undo2 size={14} /> Return</button>
            <button className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"><Ban size={14} /> Reject</button>
            <button className="inline-flex items-center gap-1.5 rounded bg-slate-300 px-4 py-2 text-xs font-bold text-white"><ShieldCheck size={14} /> Validate Record</button>
          </div>
        </div>
      </PortalCard>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
        {/* Document viewer */}
        <PortalCard className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-900 px-3 py-2 text-xs text-white">
            <span className="font-semibold">‹ Page <span className="font-black">1</span> of 3 ›</span>
            <span className="ml-2 hidden sm:inline">🔍 100% ⊕ ⟳ 0°</span>
            <span className="rounded bg-indigo-600 px-2 py-1 font-bold">◉ OCR Boxes</span>
            <span className="rounded border border-slate-600 px-2 py-1 text-slate-300">Normal Color ▾</span>
          </div>
          <div className="max-h-[560px] space-y-4 overflow-y-auto bg-slate-100 p-4 text-sm sm:p-5">
            <div className="rounded border border-slate-300 bg-white">
              <table className="w-full text-left text-xs">
                <tbody>
                  <tr className="border-b"><td className="w-1/3 bg-slate-50 p-2.5 font-semibold text-slate-600">Name of Rayat / Owner:</td><td className="p-2.5 font-bold">Abhijit Kumar Mondal <span className="font-normal">(অভিজিৎ কুমার মণ্ডল)</span></td></tr>
                  <tr className="border-b"><td className="bg-slate-50 p-2.5 font-semibold text-slate-600">Father / Husband Name:</td><td className="p-2.5">Late Bimal Chandra Mondal (স্বর্গীয় বিমল চন্দ্র মণ্ডল)</td></tr>
                  <tr className="border-b"><td className="bg-slate-50 p-2.5 font-semibold text-slate-600">Address &amp; Residence:</td><td className="p-2.5">Vill: Baidyabati, P.O. Sheoraphuli, P.S. Serampore, Dist: Hooghly</td></tr>
                  <tr><td className="bg-slate-50 p-2.5 font-semibold text-slate-600">Ownership Share (অংশ):</td><td className="p-2.5 font-mono font-bold">16 Anna (1.000 / 100% Sole Ownership)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="rounded border border-slate-300 bg-white">
              <p className="border-b bg-slate-200/70 p-2 text-center text-xs font-bold">2. LAND PARCEL SCHEDULE &amp; REVENUE ASSESSMENT (জমির দাগ ও পরিমাণের বিবরণ)</p>
              <table className="w-full text-center text-xs">
                <thead><tr className="border-b bg-slate-50 font-bold text-slate-600">
                  <td className="border-r p-2">Dag No.<br />(দাগ নং)</td><td className="border-r p-2">Khasra / Plot No.</td><td className="border-r p-2">Classification<br />(শ্রেণী)</td><td className="border-r p-2">Share Area<br />(একর)</td><td className="border-r p-2">Annual Rent<br />(খাজনা)</td><td className="p-2">Remarks / Mutation</td>
                </tr></thead>
                <tbody><tr>
                  <td className="border-r p-2.5 font-bold">904</td><td className="border-r p-2.5 font-bold">184/2<br /><span className="text-[10px] font-normal text-slate-500">(Subdivided)</span></td><td className="border-r p-2.5">Shali (Paddy Land)</td><td className="border-r p-2.5 font-mono font-bold">0.45 Acre</td><td className="border-r p-2.5 font-mono">₹ 142.50</td><td className="p-2.5 text-left text-[11px]">Mutated vide Case MUT-2024-9102</td>
                </tr></tbody>
              </table>
            </div>
            <div className="rounded border border-dashed border-slate-400 bg-white p-3 text-xs leading-relaxed">
              <span className="font-bold">Statutory Acquisition Endorsement:</span> Land Parcel Khasra 184/2 included in Ministry of Railways Notification S.O. 4182(E) dt. 12/03/2026 under Section 20A for Eastern Dedicated Freight Corridor Project.
            </div>
            <div className="flex items-end justify-between pt-2 text-xs">
              <p className="text-slate-500">Certified True Extract from Master Ledger<br /><span className="font-mono">PORCHA HASH: SHA-256: 7f81a0e91c49b</span></p>
              <p className="text-right font-bold">Sd/- S. Sen<br />Revenue Officer &amp; Addl. Tehsildar<br /><span className="font-normal text-slate-500">Serampore, Hooghly Collectorate</span></p>
            </div>
          </div>
        </PortalCard>

        {/* Scrutiny column */}
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed">
            <p className="flex items-start gap-2 font-bold text-red-900"><TriangleAlert size={15} className="mt-0.5 shrink-0" /> Field Verification Mismatch Flagged by Revenue Surveyor</p>
            <p className="mt-1.5 text-slate-700">Field Officer measured 0.56 acre on ground. Deed shows 0.62 acre. Discrepancy of 0.06 acre must be reconciled.</p>
            <p className="mt-1.5 font-mono font-bold text-red-700">Ground Measured: 0.56 Acre · Document: 0.62 Acre</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-800"><span className="inline-flex items-center gap-1.5"><TriangleAlert size={15} className="text-amber-600" /> Priority Action: 2 Flagged Low-Confidence Fields</span><span className="text-xs font-medium text-amber-700">Must be reviewed before validation</span></p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {FLAGGED_SUMMARY.map(([l, v]) => (
                <span key={l} className="inline-flex items-center gap-2 rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">◉ {l} <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-red-500" style={{ width: v }} /></span> <span className="font-mono font-bold text-red-600">{v}</span></span>
              ))}
            </div>
          </div>

          {FLAGGED_FIELDS.map((f) => (
            <PortalCard key={f.key} className="!p-4 border-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                  {f.title}
                  <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">⚠ {f.note}</span>
                  <span className="rounded border border-amber-800/30 bg-amber-100/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">{f.note}</span>
                </p>
                <p className="flex items-center gap-2 text-xs"><span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-red-500" style={{ width: f.conf }} /></span><span className="font-mono font-bold text-red-600">{f.conf}</span><span className="text-slate-400">(Low)</span><span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">◉ Page 1</span></p>
              </div>
              <p className="mt-2.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">ⓘ <span className="font-bold">{f.diag.split(":")[0]}:</span>{f.diag.split(":")[1]}</p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="rounded border border-slate-200 bg-slate-50/60 p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI / OCR Extraction</span>
                  <p className="mt-0.5 font-mono text-sm text-slate-700">{f.ai}</p>
                </label>
                <label className="rounded border border-slate-200 bg-white p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Validator Value</span>
                  <input value={validatorValues[f.key]} onChange={(e) => setValidatorValues((v) => ({ ...v, [f.key]: e.target.value }))} className="mt-0.5 w-full bg-transparent font-mono text-sm font-bold text-slate-900 outline-none" />
                </label>
              </div>
              <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                <button className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><CircleCheck size={13} /> Accept AI</button>
                <button className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"><Pencil size={13} /> Edit / Correct</button>
                <button className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"><BadgeCheck size={13} /> Mark Verified</button>
              </div>
            </PortalCard>
          ))}
        </div>
      </div>
    </>
  );
}
