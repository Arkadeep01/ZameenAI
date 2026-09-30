import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN,
  defaultMatrix,
  INITIAL_AUDIT,
  INITIAL_DEPTS,
  INITIAL_INTEGRATIONS,
  INITIAL_NOTIFS,
  INITIAL_PROJECTS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_WORKFLOWS,
  PERM_GROUPS,
  type AccessLevel,
  type AdminNotification,
  type AdminUser,
  type AuditEntry,
  type Department,
  type Integration,
  type NewUserForm,
  type Project,
  type Role,
  type UserStatus,
  type Workflow,
} from "./adminData";
import { NEW_USER_FORM_DEFAULTS } from "./adminData";

/**
 * Admin portal — cross-page state container.
 *
 * The former `routes/admin.tsx` kept every mutable record (users, RBAC matrix,
 * departments, projects, workflows, integrations, audit ledger, notifications,
 * platform settings) plus the global confirm-dialog / toast channels in ONE
 * component. Splitting the views into real routes requires that shared state to
 * live above the route boundary, so it is provided here by `routes/admin.tsx`
 * (the parent route) and consumed by each `admin.*.tsx` page via `useAdmin()`.
 *
 * Page-scoped state (search boxes, filters, pagination, the "add official"
 * form, the inspect drawer) deliberately stays inside the individual page
 * components — it was never shared between views.
 */

export interface ConfirmRequest {
  title: string;
  message: string;
  impactWarning: string;
  confirmButtonText?: string;
  dangerLevel?: "danger" | "warning" | "primary";
  requiresReason?: boolean;
  onConfirm: (reason?: string) => void;
}

export interface AdminStore {
  /* domain records */
  users: AdminUser[];
  departments: Department[];
  projects: Project[];
  workflows: Workflow[];
  integrations: Integration[];
  auditLogs: AuditEntry[];
  notifs: AdminNotification[];
  settings: Record<string, string | number | boolean>;
  matrix: Record<Role, Record<string, AccessLevel>>;
  matrixDirty: boolean;
  matrixSaved: boolean;
  settingsSaved: boolean;
  unread: number;

  /* mutators */
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  setIntegrations: React.Dispatch<React.SetStateAction<Integration[]>>;
  setNotifs: React.Dispatch<React.SetStateAction<AdminNotification[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string | number | boolean>>>;
  setSettingsSaved: React.Dispatch<React.SetStateAction<boolean>>;

  /* cross-page actions */
  showToast: (msg: string) => void;
  logAudit: (
    action: string,
    module: string,
    entity: string,
    severity: string,
    reason: string,
    result?: string,
  ) => void;
  askConfirm: (req: ConfirmRequest) => void;
  setUserStatus: (id: string, status: UserStatus, verb: string) => void;
  cycleAccess: (role: Role, pid: string) => void;
  commitMatrix: () => void;
  submitNewUser: (form: NewUserForm) => void;
  exportAuditJson: () => void;
  resetDemo: () => void;

  /* confirm-dialog channel (rendered once by the parent shell) */
  confirm: ConfirmRequest | null;
  confirmReason: string;
  confirmError: string;
  setConfirmReason: (v: string) => void;
  setConfirmError: (v: string) => void;
  closeConfirm: () => void;
  doConfirm: () => void;

  /* toast channel (rendered once by the parent shell) */
  toast: string | null;
}

const AdminContext = createContext<AdminStore | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [matrix, setMatrix] = useState(defaultMatrix);
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [matrixSaved, setMatrixSaved] = useState(false);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [workflows, setWorkflows] = useState<Workflow[]>(INITIAL_WORKFLOWS);
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(INITIAL_AUDIT);
  const [notifs, setNotifs] = useState<AdminNotification[]>(INITIAL_NOTIFS);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const logAudit = useCallback(
    (action: string, module: string, entity: string, severity: string, reason: string, result = "SUCCESS") => {
      setAuditLogs((prev) => [
        {
          id: `aud_${Date.now()}`,
          ts: "2026-09-27 11:30 UTC",
          user: ADMIN.name,
          action,
          module,
          entity,
          result,
          severity,
          reason,
        },
        ...prev,
      ]);
    },
    [],
  );

  const askConfirm = useCallback((req: ConfirmRequest) => {
    setConfirm(req);
    setConfirmReason("");
    setConfirmError("");
  }, []);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  const doConfirm = useCallback(() => {
    if (!confirm) return;
    if (confirm.requiresReason && !confirmReason.trim()) {
      setConfirmError("An administrative reason is mandatory for this operation under audit compliance.");
      return;
    }
    confirm.onConfirm(confirmReason);
    setConfirm(null);
  }, [confirm, confirmReason]);

  const setUserStatus = useCallback(
    (id: string, status: UserStatus, verb: string) => {
      setUsers((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
      const u = users.find((x) => x.id === id);
      logAudit(
        status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_ACTIVATED",
        "User Management",
        id,
        "HIGH",
        `${verb} ${u?.fullName ?? id}`,
      );
    },
    [logAudit, users],
  );

  const cycleAccess = useCallback(
    (role: Role, pid: string) => {
      const target = PERM_GROUPS.flatMap((g) => g.perms).find((p) => p.id === pid);
      const order: AccessLevel[] = ["ALLOWED", "RESTRICTED", "NOT_ALLOWED"];
      let blocked = false;
      setMatrix((prev) => {
        const cur = prev[role][pid];
        const next = order[(order.indexOf(cur) + 1) % order.length];
        if (role === "SYSTEM_ADMIN" && target?.operational && next === "ALLOWED") {
          blocked = true;
          return prev;
        }
        return { ...prev, [role]: { ...prev[role], [pid]: next } };
      });
      if (blocked) {
        showToast("Blocked: System Administrator cannot hold operational powers.");
        return;
      }
      setMatrixDirty(true);
      setMatrixSaved(false);
    },
    [showToast],
  );

  /** Marks the staged RBAC matrix as committed (clears dirty, raises "saved"). */
  const commitMatrix = useCallback(() => {
    setMatrixDirty(false);
    setMatrixSaved(true);
  }, []);

  const submitNewUser = useCallback(
    (form: NewUserForm) => {
      const dept = departments.find((d) => d.id === form.dept);
      askConfirm({
        title: "Confirm Official Onboarding",
        message: `Onboard ${form.fullName} with official role: ${form.role}?`,
        impactWarning:
          "An authorization record will be committed to the audit trail and credential activation dispatched via SMS/Email.",
        confirmButtonText: "Confirm & Provision User",
        dangerLevel: "primary",
        requiresReason: true,
        onConfirm: (reason) => {
          const id = `usr_${form.role.toLowerCase()}_${Date.now().toString().slice(-4)}`;
          setUsers((prev) => [
            {
              id,
              fullName: form.fullName,
              email: form.email,
              phone: form.phone,
              officialId: form.officialId,
              role: form.role,
              departmentId: form.dept,
              departmentName: dept?.name ?? "Revenue Department",
              state: form.state,
              district: form.district,
              status: form.status,
              lastLogin: "Never (Pending First Login)",
              createdAt: "2026-09-27",
              accessStartDate: form.start,
              accessExpiryDate: form.expiry,
              twoFactorEnabled: form.mfa,
            },
            ...prev,
          ]);
          logAudit(
            "USER_CREATED",
            "User Management",
            id,
            "HIGH",
            reason || `Provisioned ${form.fullName} as ${form.role}`,
          );
          showToast(`Official account provisioned: ${form.fullName}`);
        },
      });
    },
    [askConfirm, departments, logAudit, showToast],
  );

  const exportAuditJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ZameenAI_AuditLogs_2026-09-27.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logAudit(
      "AUDIT_LOG_EXPORTED",
      "Audit Log Access",
      "EXPORT_bundle",
      "MEDIUM",
      "Audit bundle exported by System Administrator",
    );
    showToast("Audit bundle exported as JSON.");
  }, [auditLogs, logAudit, showToast]);

  const resetDemo = useCallback(() => {
    setUsers(INITIAL_USERS);
    setMatrix(defaultMatrix());
    setMatrixDirty(false);
    setMatrixSaved(false);
    setDepartments(INITIAL_DEPTS);
    setProjects(INITIAL_PROJECTS);
    setWorkflows(INITIAL_WORKFLOWS);
    setIntegrations(INITIAL_INTEGRATIONS);
    setAuditLogs(INITIAL_AUDIT);
    setNotifs(INITIAL_NOTIFS);
    setSettings(INITIAL_SETTINGS);
    setSettingsSaved(false);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const value = useMemo<AdminStore>(
    () => ({
      users,
      departments,
      projects,
      workflows,
      integrations,
      auditLogs,
      notifs,
      settings,
      matrix,
      matrixDirty,
      matrixSaved,
      settingsSaved,
      unread,
      setUsers,
      setDepartments,
      setProjects,
      setWorkflows,
      setIntegrations,
      setNotifs,
      setSettings,
      setSettingsSaved,
      showToast,
      logAudit,
      askConfirm,
      setUserStatus,
      cycleAccess,
      commitMatrix,
      submitNewUser,
      exportAuditJson,
      resetDemo,
      confirm,
      confirmReason,
      confirmError,
      setConfirmReason,
      setConfirmError,
      closeConfirm,
      doConfirm,
      toast,
    }),
    [
      users, departments, projects, workflows, integrations, auditLogs, notifs, settings,
      matrix, matrixDirty, matrixSaved, settingsSaved, unread,
      showToast, logAudit, askConfirm, setUserStatus, cycleAccess, commitMatrix, submitNewUser,
      exportAuditJson, resetDemo, confirm, confirmReason, confirmError, doConfirm, toast,
    ],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminStore {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within the /admin route shell (AdminProvider)");
  return ctx;
}

export { NEW_USER_FORM_DEFAULTS };
