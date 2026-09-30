import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { useAdmin } from "../features/admin/AdminStore";
import { TableShell, Td, Th } from "../features/admin/adminUi";

export const Route = createFileRoute("/admin/departments")({
  component: AdminDepartments,
});

function AdminDepartments() {
  const { departments, setDepartments, logAudit, showToast } = useAdmin();

  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  const register = () => {
    if (!deptName.trim()) {
      showToast("Department name is required.");
      return;
    }
    const id = `dept_${Date.now().toString().slice(-4)}`;
    setDepartments((p) => [
      ...p,
      {
        id,
        name: deptName.trim(),
        code: deptCode.trim() || id.toUpperCase(),
        state: "—",
        district: "—",
        head: "—",
        users: 0,
        projects: 0,
        status: "ACTIVE",
        category: "REVENUE",
      },
    ]);
    logAudit("DEPARTMENT_CREATED", "Department Config", id, "MEDIUM", `Registered department: ${deptName.trim()}`);
    setDeptName("");
    setDeptCode("");
    showToast("Department registered.");
  };

  return (
    <>
      <GreetingHeader
        eyebrow="Organization Hierarchy • Revenue & Line Departments"
        title="Departments Directory"
        subtitle="Administrative departments bound to jurisdictions, officials and project pipelines."
      />
      <PortalCard className="!p-4">
        <p className="mb-2 text-xs font-bold text-slate-700">Register New Department</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
          <input
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="Department name, e.g. Tehsil Revenue Office, Sadar"
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
          />
          <input
            value={deptCode}
            onChange={(e) => setDeptCode(e.target.value)}
            placeholder="Code, e.g. UP-REV-SDR"
            className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
          />
          <button
            onClick={register}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus size={13} /> Register
          </button>
        </div>
      </PortalCard>
      <PortalCard className="mt-4 !p-0">
        <TableShell minWidth="min-w-[900px]">
          <thead>
            <tr>
              <Th>Department</Th>
              <Th>Code</Th>
              <Th>State / District</Th>
              <Th>Head Official</Th>
              <Th className="text-center">Users</Th>
              <Th className="text-center">Projects</Th>
              <Th>Category</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="hover:bg-emerald-50/40">
                <Td className="font-bold text-slate-800">{d.name}</Td>
                <Td className="font-mono text-slate-500">{d.code}</Td>
                <Td className="text-slate-600">
                  {d.state} / {d.district}
                </Td>
                <Td className="text-slate-600">{d.head}</Td>
                <Td className="text-center font-mono">{d.users}</Td>
                <Td className="text-center font-mono">{d.projects}</Td>
                <Td>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                    {d.category}
                  </span>
                </Td>
                <Td>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {d.status}
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

export default AdminDepartments;
