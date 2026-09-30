import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { WIZARD_PLACEHOLDERS, WIZARD_STEPS } from "../features/pia/piaData";
import { usePia } from "../features/pia/PiaStore";

export const Route = createFileRoute("/pia/proposal")({
  component: PiaProposal,
});

function PiaProposal() {
  const navigate = useNavigate();
  const { wizardStep, setWizardStep } = usePia();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <button onClick={() => navigate({ to: "/pia/cases" })} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"><ArrowLeft size={16} /></button>
          <span>
            <span className="block text-sm font-black text-[#0B1F44]">New Land Acquisition Proposal Wizard</span>
            <span className="block text-[11px] text-slate-500">Initiate formal statutory land requisition docket under RFCTLARR 2013 / NH Act 1956</span>
          </span>
        </p>
        <p className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Last saved: 26 Sep 2026, 12:42 PM</span>
          <button className="rounded border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600">Save Draft</button>
          <button className="font-semibold hover:text-slate-800">Discard</button>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {WIZARD_STEPS.map((s, i) => (
          <button key={s.title} onClick={() => setWizardStep(i + 1)} className={`rounded-xl border p-2.5 text-left ${wizardStep === i + 1 ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            <p className="text-[10px] font-bold text-slate-400">Step {i + 1}</p>
            <p className={`text-[11px] font-bold leading-tight ${wizardStep === i + 1 ? "text-emerald-900" : "text-slate-600"}`}>{s.title}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{s.sub}</p>
          </button>
        ))}
      </div>

      <PortalCard className="mt-4">
        <h2 className="text-sm font-bold text-[#0B1F44]">Step {wizardStep} — {WIZARD_STEPS[wizardStep - 1].title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">Select the authorized infrastructure project for which land acquisition is being requisitioned.</p>

        {wizardStep === 1 && (
          <div className="mt-4 space-y-3">
            <label className="block text-xs">
              <span className="font-bold text-slate-700">Select Sponsoring Project *</span>
              <span className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium">PRJ-NH-048 — NH-19 6-Laning Varanasi Bypass Corridor (Highway) <ChevronDown size={15} className="text-slate-400" /></span>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-emerald-800">Project Scope &amp; Statutory Summary</p>
                <p className="font-mono text-[10px] text-slate-400">NH-19-WNS-PKG2</p>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Sponsoring Ministry:</p><p className="font-semibold">Ministry of Road Transport and Highways (MoRTH)</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Executing Agency:</p><p className="font-semibold">NHIDCL RO-IV Varanasi</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Target Districts:</p><p className="font-semibold">Varanasi, Chandauli</p></div>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-500"><span className="font-bold">Description:</span> Greenfield 6-lane bypass corridor spanning 42.6 km connecting Mohan Sarai to Mughal Sarai to de-congest national highway traffic.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[["State", "Uttar Pradesh"], ["District *", "Varanasi"], ["Target Block / Tehsil *", "Kashi Vidyapeeth"]].map(([l, v]) => (
                <label key={l} className="block text-xs"><span className="font-semibold text-slate-500">{l}</span><span className="mt-1 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium">{v} {l.includes("*") && <ChevronDown size={14} className="text-slate-400" />}</span></label>
              ))}
            </div>
            <label className="block text-xs"><span className="font-semibold text-slate-500">Target Alignment / Area Description</span><span className="mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium">Trapezoidal parcel cluster bordering the eastern alignment boundary.</span></label>
          </div>
        )}

        {wizardStep > 1 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
            <p className="font-bold text-slate-700">Step {wizardStep} form section</p>
            <p className="mt-1">Continue the wizard — fields for {WIZARD_PLACEHOLDERS[wizardStep]} appear here, following the same light-theme pattern as Step 1.</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button disabled={wizardStep === 1} onClick={() => setWizardStep((s) => Math.max(1, s - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-500 disabled:opacity-40"><ArrowLeft size={13} /> Previous Step</button>
          <button onClick={() => setWizardStep((s) => Math.min(6, s + 1))} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">{wizardStep === 6 ? "Submit Proposal →" : `Continue to Step ${wizardStep + 1} →`}</button>
        </div>
      </PortalCard>
    </>
  );
}
