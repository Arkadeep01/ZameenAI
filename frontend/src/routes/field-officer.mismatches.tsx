import { createFileRoute } from "@tanstack/react-router";
import { Eye, Lock } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { mismatches } from "../features/fieldOfficer/fieldOfficerData";
import { StatusPill, Td, Th } from "../features/fieldOfficer/fieldOfficerUi";

export const Route = createFileRoute("/field-officer/mismatches")({
  component: FieldOfficerMismatches,
});

function FieldOfficerMismatches() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Ground Discrepancy Queue</h1>
          <p className="mt-1 text-sm text-slate-500">Official field mismatches reported by the Patwari/Surveyor awaiting Circle Office review.</p>
        </div>
        <span className="w-fit rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">2 Active Discrepancy Record(s)</span>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
        <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" />
        <p><b>Role Boundary Enforced:</b> The Field Officer reports physical discrepancies. Final resolution, compensation adjustment, and title dispute adjudication are restricted to the Land Acquisition Officer (LAO).</p>
      </div>
      <PortalCard className="mt-4 !p-0">
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead><tr><Th>Mismatch ID</Th><Th>Parcel / Khasra</Th><Th>Classification</Th><Th>Severity</Th><Th>Submitted Date</Th><Th>Review Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {mismatches.map((m) => (
                  <tr key={m.id} className="hover:bg-amber-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-amber-800">{m.id}</Td>
                    <Td><p className="font-bold text-slate-800">{m.parcel}</p><p className="font-mono text-[11px] text-slate-400">Assignment: {m.asn}</p></Td>
                    <Td className="text-slate-600">{m.cls}</Td>
                    <Td><span className={`rounded px-2 py-0.5 text-[11px] font-bold ${m.sev === "High" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{m.sev}</span></Td>
                    <Td className="font-mono text-slate-500">{m.date}</Td>
                    <Td><StatusPill s={m.status} /></Td>
                    <Td className="text-right"><button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Eye size={12} /> Inspect</button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {mismatches.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-mono text-[11px] font-bold text-amber-800">{m.id}</p>
              <p className="mt-1 text-sm font-bold">{m.parcel} · {m.cls}</p>
              <p className="text-[11px] text-slate-500">{m.date} · {m.status}</p>
              <button className="mt-2.5 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold">Inspect</button>
            </div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}
