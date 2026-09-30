import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { LAO } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { GovStrip } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/returned")({
  component: DeskValidatorReturned,
});

function DeskValidatorReturned() {
  const navigate = useNavigate();
  const { selectCase } = useDeskValidator();

  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="Survey & Revisions • PIA Resubmission"
        title="Returned Cases & Resubmission Tracking"
        subtitle="Land records returned to Project Implementation Agencies (PIA) due to poor scans, missing schedules, or OCR failures."
      />
      <PortalCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-black text-slate-900">LA-2026-00115</span>
              <span className="rounded border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-xs font-bold text-red-700">Returned: POOR_SCAN_QUALITY</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">NHAI National Highway 34 Expansion · Monoharpur, Hooghly · Khasra 340/1</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">View Dossier</button>
            <button onClick={() => { selectCase("LA-2026-00115"); navigate({ to: "/desk-validator/workspace" }); }} className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Resume Review <ArrowRight size={13} /></button>
          </div>
        </div>
        <div className="mt-4 rounded border border-slate-200 bg-slate-50/70 p-3.5 text-xs leading-relaxed">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <p className="text-slate-600"><span className="font-bold">Returned By:</span> Shri S. K. Mukherjee ({LAO.laoCode})</p>
            <p className="font-mono text-slate-600"><span className="font-sans font-bold">Return Date:</span> 2026-09-25 14:00</p>
            <p className="text-slate-600"><span className="font-bold">Submission Agency:</span> NHAI PIU Kolkata</p>
          </div>
          <p className="mt-3 font-bold text-slate-800">Mandatory Officer Defect Remarks:</p>
          <p className="mt-0.5 text-slate-700">Page 2 schedule of boundaries is illegible due to folded scan and low DPI. High-resolution color scan requested.</p>
          <p className="mt-2.5 text-indigo-900"><span className="font-bold">Required Action from PIA:</span> Re-scan original document at minimum 300 DPI flatbed scanner.</p>
        </div>
      </PortalCard>
    </>
  );
}
