import { createFileRoute } from "@tanstack/react-router";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/projects")({
  component: AdminProjects,
});

function AdminProjects() {
  const { projects, setProjects, logAudit, showToast } = useAdmin();

  return (
    <>
      <GreetingHeader
        eyebrow="Platform Config • Acquisition Pipelines"
        title="Project Configuration"
        subtitle="Project dossiers bound to departments, workflows and document requirements."
      />
      <PortalCard className="!p-0">
        <TableShell minWidth="min-w-[960px]">
          <thead>
            <tr>
              <Th>Project ID</Th>
              <Th>Project Name</Th>
              <Th>Department</Th>
              <Th>State / District</Th>
              <Th>Type</Th>
              <Th>Workflow</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-emerald-50/40">
                <Td className="whitespace-nowrap font-mono font-bold text-emerald-700">{p.id}</Td>
                <Td className="max-w-[220px] font-semibold text-slate-800">{p.name}</Td>
                <Td className="max-w-[200px] truncate text-slate-500">{p.dept}</Td>
                <Td className="whitespace-nowrap text-slate-500">
                  {p.state} / {p.district}
                </Td>
                <Td>
                  <span className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                    {p.type}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-slate-500">{p.workflow}</Td>
                <Td>
                  <span
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      p.status === "ACTIVE_PIPELINE"
                        ? "bg-emerald-50 text-emerald-700"
                        : p.status === "DRAFT"
                          ? "bg-slate-100 text-slate-500"
                          : p.status === "SUSPENDED"
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {p.status.replace("_", " ")}
                  </span>
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => {
                      const order = ["DRAFT", "CONFIGURED", "ACTIVE_PIPELINE", "SUSPENDED"];
                      const next = order[(order.indexOf(p.status) + 1) % order.length];
                      setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
                      logAudit(
                        "PROJECT_CONFIG_MODIFIED",
                        "Project Config",
                        p.id,
                        "MEDIUM",
                        `Status ${p.status} → ${next}`,
                      );
                      showToast(`${p.id} moved to ${next.replace("_", " ")}.`);
                    }}
                    className="whitespace-nowrap text-[11px] font-bold text-emerald-700"
                  >
                    Advance State
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </PortalCard>
    </>
  );
}

export default AdminProjects;
