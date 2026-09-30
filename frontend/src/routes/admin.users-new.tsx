import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { PortalCard } from "../components/portal/PortalLayout";
import { NEW_USER_FORM_DEFAULTS, useAdmin } from "../features/admin/AdminStore";
import type { Role, UserStatus } from "../features/admin/adminData";
import { INDIA_DISTRICTS, INDIA_STATES } from "../utils/indiaGeo";

export const Route = createFileRoute("/admin/users-new")({
  component: AdminUserOnboarding,
});

function AdminUserOnboarding() {
  const navigate = useNavigate();
  const { departments, submitNewUser } = useAdmin();

  const [form, setForm] = useState(NEW_USER_FORM_DEFAULTS);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const cancel = () => navigate({ to: "/admin/users" });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full Name is required";
    if (!form.email.trim() || !form.email.includes("@")) errs.email = "Valid official email is required";
    if (!form.phone.trim()) errs.phone = "Contact number is required";
    if (!form.officialId.trim()) errs.officialId = "Employee / Official ID is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    submitNewUser(form);
    setForm(NEW_USER_FORM_DEFAULTS);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={cancel} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50">
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Provision Official User Account</h1>
          <p className="text-xs text-slate-500">
            Bind government official credentials to designated RBAC role and state jurisdiction
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <PortalCard>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">
            1. Official Identity &amp; Credentials
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Full Name &amp; Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Ramesh Chandra Sharma, PCS"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
              />
              {formErrors.fullName && <p className="mt-1 text-[11px] text-red-600">{formErrors.fullName}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Official Government Email <span className="text-red-500">*</span>
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. ramesh.sharma@gov.in"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
              />
              {formErrors.email && <p className="mt-1 text-[11px] text-red-600">{formErrors.email}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Official Mobile (DLT Registered) <span className="text-red-500">*</span>
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
              />
              {formErrors.phone && <p className="mt-1 text-[11px] text-red-600">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Employee / Official ID <span className="text-red-500">*</span>
              </label>
              <input
                value={form.officialId}
                onChange={(e) => setForm({ ...form, officialId: e.target.value })}
                placeholder="e.g. UP-PCS-LAO-882"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600"
              />
              {formErrors.officialId && <p className="mt-1 text-[11px] text-red-600">{formErrors.officialId}</p>}
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">
            2. Designated Role &amp; Security Scope
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Designated System Role <span className="text-red-500">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-600"
              >
                <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (Platform Control &amp; Governance)</option>
                <option value="PIA">PIA (Project Implementing Agency)</option>
                <option value="FIELD_OFFICER">FIELD_OFFICER (Ground Verification Officer)</option>
                <option value="LAO">LAO (Land Acquisition Officer - Desk Validator)</option>
                <option value="APPROVER">APPROVER (Acquisition Approver - CALA / DM)</option>
                <option value="EXECUTIVE">EXECUTIVE (Department Head / Principal Secretary)</option>
                <option value="CITIZEN">CITIZEN (Landowner Portal Access)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                Roles are strictly controlled by the system RBAC policy. Arbitrary titles are banned.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Initial Account Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
              >
                <option value="ACTIVE">Active (Provision Immediate Access)</option>
                <option value="PENDING_VERIFICATION">Pending Verification (Wait for nodal sign-off)</option>
                <option value="INACTIVE">Inactive (Staged account)</option>
              </select>
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.mfa}
              onChange={(e) => setForm({ ...form, mfa: e.target.checked })}
              className="h-3.5 w-3.5 accent-emerald-700"
            />
            Enforce Multi-Factor Authentication (MFA / Jan Parichay OTP)
          </label>
        </PortalCard>

        <PortalCard>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">
            3. Department &amp; Jurisdiction Assignment
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Department / Authority <span className="text-red-500">*</span>
              </label>
              <select
                value={form.dept}
                onChange={(e) => setForm({ ...form, dept: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">State Location</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value, district: "Statewide / HQ" })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
              >
                <option value="Central">Central (National Scope)</option>
                {INDIA_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">District Jurisdiction</label>
              <select
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
              >
                <option value="Statewide / HQ">Statewide / HQ</option>
                {(form.state === "Central" ? [] : (INDIA_DISTRICTS[form.state] ?? [])).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <h3 className="border-b border-slate-100 pb-2 text-xs font-black uppercase tracking-wider text-slate-700">
            4. Access Validity &amp; Lifecycle Bounds
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Access Start Date</label>
              <input
                type="date"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Access Expiry Date (Contractual / Deputation Bound)
              </label>
              <input
                type="date"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">System will automatically suspend access upon reaching the expiry date.</p>
            </div>
          </div>
        </PortalCard>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={cancel} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <CheckCircle2 size={14} /> Provision Official Account
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminUserOnboarding;
