import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import { useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";
import { FilterSelect, PriPill, StatusPill, Td, Th } from "../features/fieldOfficer/fieldOfficerUi";

export const Route = createFileRoute("/field-officer/assignments")({
  component: FieldOfficerAssignments,
});

function FieldOfficerAssignments() {
  const navigate = useNavigate();
  const { assignments, filtered, query, setQuery, openVerify } = useFieldOfficer();

  const open = (id: string) => () => {
    openVerify(id);
    navigate({ to: "/field-officer/verify" });
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">My Ground Assignments</h1>
          <p className="mt-1 text-sm text-slate-500">All land parcels assigned to your jurisdiction for physical boundary &amp; ownership verification.</p>
        </div>
        <span className="w-fit rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Showing <b>{filtered.length}</b> of {assignments.length} assignments</span>
      </div>

      <PortalCard className="!p-4">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Khasra number, Assignment ID, Owner name, or Village…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p><FilterSelect label="All Statuses" /></div>
          <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</p><FilterSelect label="All Priorities" /></div>
          <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Village / Mauza</p><FilterSelect label="All Villages" /></div>
          <div><p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</p><FilterSelect label="All Projects" /></div>
        </div>
      </PortalCard>

      <PortalCard className="mt-4 !p-0">
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead><tr><Th>Assignment ID</Th><Th>Parcel / Khasra</Th><Th>Project</Th><Th>Village / District</Th><Th>Area</Th><Th>Priority</Th><Th>Status</Th><Th>Due Date</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-emerald-50/40">
                    <Td className="whitespace-nowrap font-mono font-bold text-slate-800">{a.id}</Td>
                    <Td><p className="font-bold text-slate-900">Khasra {a.khasra}</p><p className="max-w-[180px] truncate text-[11px] text-slate-400">{a.owner}</p></Td>
                    <Td className="max-w-[170px] truncate text-slate-500">{a.project.split("(")[0]}</Td>
                    <Td><p className="text-slate-600">{a.village.replace("Mauza ", "")},</p><p className="text-slate-500">{a.district}</p></Td>
                    <Td><p className="font-medium text-slate-700">{a.areaHa}</p><p className="text-[11px] text-slate-400">({a.areaBigha})</p></Td>
                    <Td><PriPill p={a.priority} /></Td>
                    <Td><StatusPill s={a.status} /></Td>
                    <Td className="whitespace-nowrap font-mono text-slate-500">{a.due}</Td>
                    <Td className="text-right"><button onClick={open(a.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"><Eye size={12} /> Details</button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex items-center justify-between font-mono text-[11px] font-bold text-slate-700">{a.id} <PriPill p={a.priority} /></p>
              <p className="mt-1 text-sm font-black text-slate-900">Khasra {a.khasra} · {a.owner}</p>
              <p className="text-[11px] text-slate-500">{a.village}, {a.district} · {a.areaBigha} · Due {a.due}</p>
              <div className="mt-2"><StatusPill s={a.status} /></div>
              <button onClick={open(a.id)} className="mt-3 w-full rounded-xl bg-emerald-900 py-2 text-xs font-bold text-white">Open Verification →</button>
            </div>
          ))}
        </div>
      </PortalCard>
    </>
  );
}
