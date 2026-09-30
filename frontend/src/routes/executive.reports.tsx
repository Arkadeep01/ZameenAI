import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye, Printer } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { DOSSIER_FIGURES, REPORT_TABS, reports } from "../features/executive/executiveData";
import { useExecutive } from "../features/executive/ExecutiveStore";

export const Route = createFileRoute("/executive/reports")({
  component: ExecutiveReports,
});

function ExecutiveReports() {
  const { reportTab, setReportTab, scope } = useExecutive();
  const visible = reports.filter((r) => reportTab === "All MIS Reports" || r.c === reportTab);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 22 – Official MIS Briefs · Cabinet Secretariat Format</p>
          <h1 className="mt-1 font-serif text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Executive MIS Reports &amp; Statutory Briefs Register</h1>
          <p className="mt-1 text-sm text-slate-500">Read, generate, and export official ministerial briefs across Land Acquisition, Compensation, R&amp;R, and Possession timelines.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-800">Export Permission: AUTHORIZED</span>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
        {REPORT_TABS.map((t) => (
          <button key={t} onClick={() => setReportTab(t)} className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 ${reportTab === t ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <PortalCard className="!p-0">
          <p className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700">
            Available Official Report Definitions ({visible.length})
            <span className="float-right font-mono text-[10px] font-medium normal-case text-slate-400">Scope: {scope} | Format: PDF/XLSX</span>
          </p>
          <div>
            {visible.map((r) => (
              <div key={r.t} className="flex flex-col gap-2 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{r.t} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-black text-slate-600">{r.f}</span></p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{r.d}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">Category: <b className="text-slate-600">{r.c}</b> · Frequency: <b className="text-slate-600">{r.fr}</b> · Updated: <b className="text-slate-600">{r.u}</b></p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Eye size={13} className="text-amber-600" /> View</button>
                  <button className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"><Download size={13} /> Export</button>
                </div>
              </div>
            ))}
          </div>
        </PortalCard>

        <PortalCard>
          <h2 className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700">
            Official Report Dossier Preview
            <button onClick={() => window.print()} className="inline-flex items-center gap-1 text-[11px] text-amber-700"><Printer size={13} /> Print</button>
          </h2>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-900 p-4 text-white">
            <p className="font-mono text-[10px] font-bold tracking-wider text-amber-400">GOVERNMENT OF INDIA — LAND GOVERNANCE DSS</p>
            <p className="mt-1.5 text-sm font-bold leading-snug">National Infrastructure Land Acquisition Performance Dossier</p>
            <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-300">
              <p>Generated Date: <b className="text-white">26 Sep 2026, 06:00 AM</b></p>
              <p>Selected Scope: <b className="text-white">{scope} Jurisdictional Scope</b></p>
              <p>Reporting Window: <b className="text-white">FY 2026-27</b></p>
              <p>Data Source Timestamp: <b className="text-white">26 Sep 2026, 11:34 AM</b></p>
            </div>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Certified Program Figures:</p>
          <div className="mt-1.5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 font-mono text-[11px]">
            {DOSSIER_FIGURES.map(([k, v, c]) => (
              <p key={k} className="flex justify-between gap-2"><span className="font-sans text-slate-500">{k}</span><b className={c}>{v}</b></p>
            ))}
          </div>
          <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600"><Download size={14} /> Download PDF Dossier (2840 KB)</button>
        </PortalCard>
      </div>
    </>
  );
}
