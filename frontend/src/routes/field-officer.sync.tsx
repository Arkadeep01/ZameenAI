import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, RefreshCw, WifiOff } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { SYNC_QUEUE } from "../features/fieldOfficer/fieldOfficerData";
import { useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";

export const Route = createFileRoute("/field-officer/sync")({
  component: FieldOfficerSync,
});

function FieldOfficerSync() {
  const { online, setOnline } = useFieldOfficer();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Field Synchronization Center</h1>
          <p className="mt-1 text-sm text-slate-500">Offline storage buffer and bidirectional synchronization queue for field evidence and reports.</p>
        </div>
        <button disabled className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-400"><RefreshCw size={14} /> Sync Now (0 Pending)</button>
      </div>

      <PortalCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><WifiOff size={18} /></span>
            <span><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Connection State</span><span className="block text-sm font-black text-slate-900">OFFLINE (Field Simulated)</span></span>
          </p>
          <button onClick={() => setOnline((v) => !v)} className="w-fit rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">{online ? "Switch to Offline Mode" : "Switch to Online Mode"}</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 lg:grid-cols-4">
          {[["Pending Uploads", "0", "text-amber-700"], ["Successfully Synced", "2", "text-emerald-800"], ["Retry Required", "0", "text-red-800"], ["Local Device Cache", "14.8 MB", "text-slate-900"]].map(([l, v, c]) => (
            <div key={l as string}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l as string}</p><p className={`mt-0.5 text-lg font-black ${c as string}`}>{v as string}</p></div>
          ))}
        </div>
      </PortalCard>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-900">Synchronization Queue (2)</h2>
        <p className="text-[11px] text-slate-400">Local data is preserved even if network fails</p>
      </div>
      <div className="space-y-3">
        {SYNC_QUEUE.map(([k, a, p, s, d]) => (
          <PortalCard key={a} className="!p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">{k} <span className="font-mono text-[11px] font-medium text-slate-400">· Assignment {a}</span> <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">SYNCED</span></p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">{p} <span className="mx-1">·</span> {s} <span className="mx-1">·</span> {d}</p>
              </div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800"><CircleCheck size={15} /> Transmitted</p>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
