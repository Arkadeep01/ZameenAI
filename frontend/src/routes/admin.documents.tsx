import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { DOC_CATS } from "../features/admin/adminData";
import { TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocuments,
});

function AdminDocuments() {
  return (
    <>
      <GreetingHeader
        eyebrow="Platform Config • Retention & Legal Archival"
        title="Document Repository Categories"
        subtitle="Category schemas: formats, size caps, retention, versioning and access policy."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[1000px]">
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Code</Th>
              <Th>Formats</Th>
              <Th className="text-right">Max MB</Th>
              <Th className="text-right">Retention (yrs)</Th>
              <Th>Versioning</Th>
              <Th>Access</Th>
              <Th className="text-right">Stored</Th>
              <Th className="text-right">Size (GB)</Th>
            </tr>
          </thead>
          <tbody>
            {DOC_CATS.map((d) => (
              <tr key={d.code} className="hover:bg-emerald-50/40">
                <Td className="font-bold text-slate-800">
                  {d.name}{" "}
                  {d.permanent && (
                    <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[9px] font-black text-amber-800">
                      PERMANENT
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-slate-500">{d.code}</Td>
                <Td className="text-slate-500">{d.formats}</Td>
                <Td className="text-right font-mono">{d.size}</Td>
                <Td className="text-right font-mono">{d.retention}</Td>
                <Td className="font-mono text-[11px] text-slate-500">{d.versioning}</Td>
                <Td>
                  <span
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      d.access === "CONFIDENTIAL"
                        ? "bg-red-50 text-red-700"
                        : d.access === "PUBLIC_FACING"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {d.access}
                  </span>
                </Td>
                <Td className="text-right font-mono">{d.stored.toLocaleString("en-IN")}</Td>
                <Td className="text-right font-mono">{d.gb.toLocaleString("en-IN")}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}

export default AdminDocuments;
