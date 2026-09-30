import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PortalCard } from "../components/portal/PortalLayout";
import { POSSESSION_KPIS, possDistricts } from "../features/executive/executiveData";
import { TableShell, Td, Th } from "../features/executive/executiveUi";

export const Route = createFileRoute("/executive/possession")({
  component: ExecutivePossession,
});

function ExecutivePossession() {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">Section 16 – Physical Corridor Handover</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F44] sm:text-3xl">Cadastral Possession &amp; Right-of-Way (RoW) Clearance Monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only physical handover tracking to EPC civil contractors, unencumbered corridor verification.</p>
        </div>
        <button onClick={() => navigate({ to: "/executive/gis" })} className="w-fit rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">View Possession GIS Layers</button>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {POSSESSION_KPIS.map(([l, v, s]) => (
          <PortalCard key={l} className="!p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
            <p className={`mt-1 font-mono text-xl font-black ${l === "Pending Handover" ? "text-amber-700" : l === "Possession Blocked" || l === "Court Stay / Contested" ? "text-red-600" : "text-emerald-700"}`}>{v}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{s}</p>
          </PortalCard>
        ))}
      </section>

      <PortalCard className="mt-5">
        <div className="mb-1.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0B1F44]">Overall Program Handover Schedule vs Projected Delay</h2>
          <p className="font-mono text-[10px] text-slate-500">Target Handover Date: <b>2026-11-30</b> · <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">Avg Corridor Delay: +65 Days</span></p>
        </div>
        <p className="text-[11px] text-slate-500">Contiguous Right-of-Way handed Over to EPC</p>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: "83%" }} /></div>
        <p className="mt-1 text-right font-mono text-[11px] font-bold text-emerald-700">83%</p>
      </PortalCard>

      <PortalCard className="mt-5 !p-0">
        <h2 className="border-b border-slate-100 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#0B1F44]">District-wise Cadastral Possession Progress</h2>
        <TableShell minWidth="min-w-[900px]">
          <thead><tr><Th>District</Th><Th>State</Th><Th className="text-right">Total Parcels</Th><Th className="text-right">Handed Over</Th><Th className="text-right">Pending</Th><Th className="text-right">Court Stayed</Th><Th className="text-right">Possession %</Th></tr></thead>
          <tbody>
            {possDistricts.map(([d, s, t, h, p, cs, pct]) => (
              <tr key={d} className="hover:bg-amber-50/40">
                <Td className="font-bold text-slate-800">{d}</Td>
                <Td className="text-slate-500">{s}</Td>
                <Td className="text-right font-mono">{t}</Td>
                <Td className="text-right font-mono font-bold text-emerald-700">{h}</Td>
                <Td className="text-right font-mono">{p}</Td>
                <Td className="text-right">{cs === "0" ? <span className="font-mono text-slate-400">0</span> : <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-700">{cs}</span>}</Td>
                <Td className="text-right font-mono font-bold">{pct}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}
