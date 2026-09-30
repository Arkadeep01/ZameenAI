import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { INITIAL_JURISDICTIONS } from "../features/admin/adminData";
import { TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/jurisdictions")({
  component: AdminJurisdictions,
});

function AdminJurisdictions() {
  return (
    <>
      <GreetingHeader
        eyebrow="Organization • Tehsil / Taluk Mapping"
        title="Tehsil Jurisdictions"
        subtitle="Village panchayat counts bound to responsible departments."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[860px]">
          <thead>
            <tr>
              <Th>Tehsil / Taluk</Th>
              <Th>District</Th>
              <Th>State</Th>
              <Th className="text-center">Villages</Th>
              <Th>Assigned Department</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_JURISDICTIONS.map((j) => (
              <tr key={j.id} className="hover:bg-emerald-50/40">
                <Td className="font-bold text-slate-800">{j.tehsil}</Td>
                <Td className="text-slate-600">{j.district}</Td>
                <Td className="text-slate-600">{j.state}</Td>
                <Td className="text-center font-mono">{j.villages}</Td>
                <Td className="max-w-[240px] truncate text-slate-600">{j.dept}</Td>
                <Td>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      j.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {j.status.replace("_", " ")}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}

export default AdminJurisdictions;
