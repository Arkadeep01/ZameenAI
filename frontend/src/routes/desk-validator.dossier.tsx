import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { DOSSIER_TABS, PARCEL_SUMMARY, TITLE_SUMMARY } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { GovStrip } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/dossier")({
  component: DeskValidatorDossier,
});

function DeskValidatorDossier() {
  const navigate = useNavigate();
  const { selectedCase, selectCase, dossierTab, setDossierTab } = useDeskValidator();

  return (
    <>
      <GovStrip />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate({ to: "/desk-validator/assigned" })} className="inline-flex items-center gap-1 font-semibold hover:text-slate-800"><ArrowLeft size={15} /> Assigned Cases</button>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-900">{selectedCase === "LA-2026-00132" ? "LA-2026-00109" : selectedCase}</span>
        </p>
        <button onClick={() => { selectCase(selectedCase); navigate({ to: "/desk-validator/workspace" }); }} className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white">
          <ShieldCheck size={15} /> Open Validation Workspace
        </button>
      </div>

      <PortalCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xl font-black text-slate-900">LA-2026-00109</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Desk Validated</span>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold tracking-wider text-slate-600">MEDIUM</span>
            </p>
            <p className="mt-1.5 text-xs text-slate-500"><span className="font-bold text-slate-600">Project:</span> Eastern Dedicated Freight Corridor Phase-II <span className="mx-1">·</span> <span className="font-bold text-slate-600">Mouza:</span> Rishra JL 18, Hooghly</p>
          </div>
          <div className="text-sm">
            <p className="text-slate-500">Overall AI Extraction Confidence</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-200"><span className="block h-full w-[94%] rounded-full bg-emerald-600" /></span>
              <span className="font-mono font-bold text-slate-800">94%</span>
              <span className="text-xs text-slate-400">(High)</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-100 text-xs font-semibold">
          {DOSSIER_TABS.map((t) => (
            <button key={t} onClick={() => setDossierTab(t)} className={`whitespace-nowrap px-3.5 py-2.5 ${dossierTab === t ? "border-b-2 border-slate-900 bg-slate-50 text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>{t}</button>
          ))}
        </div>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PortalCard>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-800">Land Parcel Summary</h3>
          <dl className="divide-y divide-slate-50 text-sm">
            {PARCEL_SUMMARY.map(([k, v, b]) => (
              <div key={k} className="grid grid-cols-2 gap-2 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className={b ? "font-mono font-bold text-slate-900" : "text-slate-700"}>{v}</dd>
              </div>
            ))}
          </dl>
        </PortalCard>
        <PortalCard>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-800">Ownership &amp; Title Summary</h3>
          <dl className="divide-y divide-slate-50 text-sm">
            {TITLE_SUMMARY.map(([k, v, b]) => (
              <div key={k} className="grid grid-cols-2 gap-2 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className={b ? "font-bold text-slate-900" : "text-slate-700"}>{v}</dd>
              </div>
            ))}
          </dl>
        </PortalCard>
      </div>
    </>
  );
}
