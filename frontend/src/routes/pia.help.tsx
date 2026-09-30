import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Clock3, MapPin, TriangleAlert, Upload } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";

export const Route = createFileRoute("/pia/help")({
  component: PiaHelp,
});

function PiaHelp() {
  return (
    <>
      <GreetingHeader
        eyebrow="Institutional • Statutory Guidance"
        title="Help &amp; Statutory SOP"
        subtitle="Requisition operating procedure under RFCTLARR 2013, NH Act 1956 and State Revenue Rules."
      />
      <PortalCard>
        <h2 className="text-sm font-bold text-[#0B1F44]">Statutory Framework &amp; SOP</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 text-xs leading-relaxed text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="font-bold text-[#0B3B5F]">National Highways Act, 1956 (Section 3A to 3G)</p>
            <p className="mt-2"><span className="font-semibold">Section 3A:</span> Declaration of intention to acquire land upon requisition by NHIDCL / MoRTH. PIA files Form-A land schedule with DGPS alignment.</p>
            <p className="mt-1.5"><span className="font-semibold">Section 3C:</span> Hearing of objections by CALA within 21 days of gazette publication.</p>
            <p className="mt-1.5"><span className="font-semibold">Section 3D:</span> Final vesting declaration. Land vests absolutely in Central Government free from encumbrances.</p>
            <p className="mt-1.5"><span className="font-semibold">Section 3G:</span> Determination of compensation by CALA with solatium and interest.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="font-bold text-[#0B3B5F]">RFCTLARR Act, 2013 &amp; State Revenue Rules</p>
            <p className="mt-2"><span className="font-semibold">Section 11:</span> Preliminary notification published in Official Gazette &amp; two local dailies.</p>
            <p className="mt-1.5"><span className="font-semibold">Section 12:</span> Joint Measurement Survey by Tehsil revenue staff with PIA engineer present.</p>
            <p className="mt-1.5"><span className="font-semibold">Section 19:</span> Final declaration after hearing objections and R&amp;R scheme approval.</p>
            <p className="mt-1.5"><span className="font-semibold">Rule 14 (SLAO Scrutiny):</span> Returned requisitions must be resubmitted within the deadline with certified RoR extracts.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-slate-700">
          <p className="flex items-center gap-1.5 font-bold text-amber-900"><TriangleAlert size={14} /> Authority Boundary Reminder</p>
          <p className="mt-1">Statutory proposals governed by RFCTLARR Act 2013 &amp; NH Act 1956. Authoritative approval vested in LAO &amp; CALA. PIA may nominate parcels and upload dossiers but cannot validate RoR extractions, freeze mutations, or alter cadastral polygons.</p>
        </div>
        <button className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0B3B5F]">Open full SOP document <ArrowRight size={13} /></button>
      </PortalCard>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          ["Response to LAO Returns", "Revise land schedules with certified RoR extracts within 10 days of return notice.", MapPin],
          ["Document Upload Standards", "300 DPI flatbed scans, PDF/A with SHA-256 manifest for every dossier.", Upload],
          ["Milestone Escalation", "Overdue Section 19 / 3D milestones auto-escalate to RO head and MoRTH dashboard.", Clock3],
        ].map(([t, d, Icon]) => (
          <PortalCard key={t as string}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={17} /></span>
            <p className="mt-2.5 text-sm font-bold text-slate-800">{t as string}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{d as string}</p>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
