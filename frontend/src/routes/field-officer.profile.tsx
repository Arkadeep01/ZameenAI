import { createFileRoute } from "@tanstack/react-router";
import { Bell, MapPin, Smartphone, Trash2, Wifi } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { DEVICE_DIAGNOSTICS, OFFICER } from "../features/fieldOfficer/fieldOfficerData";
import { useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";

export const Route = createFileRoute("/field-officer/profile")({
  component: FieldOfficerProfile,
});

function FieldOfficerProfile() {
  const { setOnline } = useFieldOfficer();

  return (
    <>
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Field Officer Profile</h1>
      <p className="mt-1 text-sm text-slate-500">Authorized credentials, field jurisdiction, and device offline storage management.</p>

      <PortalCard className="mx-auto mt-5 w-full max-w-3xl">
        <div className="flex items-start gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-base font-black text-white">RK</span>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-base font-black text-slate-900">{OFFICER.name} <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-900">{OFFICER.badge}</span></p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">{OFFICER.designation}</p>
            <p className="text-[11px] text-slate-400">{OFFICER.dept}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3.5 text-xs">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><MapPin size={12} /> Assigned Jurisdiction</p>
            <p className="mt-1 font-bold text-slate-800">Varanasi · Pindra</p>
            <p className="mt-0.5 leading-relaxed text-slate-500">Mauza Ramnagar &amp; Kashi Ring Road Sector 4 (Parcels 101 to 240)</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 text-xs">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><Bell size={12} /> Contact &amp; Official Communications</p>
            <p className="mt-1 font-bold text-slate-800">{OFFICER.phone}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500">{OFFICER.email}</p>
          </div>
        </div>
      </PortalCard>

      <PortalCard className="mx-auto mt-4 w-full max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900"><Smartphone size={16} className="text-emerald-800" /> Field Tablet &amp; Offline Storage Diagnostics</h2>
          <span className="w-fit rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">ZameenAI Field 2.6.4-offline-ready</span>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3.5 lg:grid-cols-4">
          {DEVICE_DIAGNOSTICS.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p>
              <p className={`mt-0.5 font-black ${l === "Pending Sync Queue" ? "text-amber-800" : "text-slate-900"}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
          <button onClick={() => setOnline(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"><Wifi size={14} className="text-emerald-700" /> Switch Online</button>
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><Trash2 size={14} /> Clear Local Drafts Cache</button>
        </div>
      </PortalCard>
    </>
  );
}
