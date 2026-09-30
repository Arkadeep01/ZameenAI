import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { initialDockets, type Authority, type Docket } from "./approverData";

/**
 * Approver (CALA / DM-DC) portal — cross-page state container.
 *
 * The monolith kept the whole quasi-judicial context (global docket search,
 * the docket register, the currently inspected case and the acting authority)
 * in a single component. Those pieces now span thirteen routes, so the shared
 * state lives here and each child page owns only its own presentation.
 */
export interface ApproverStore {
  /* shared case search */
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  matches: (d: Docket) => boolean;

  /* docket register (mutable — approve / return / contest / stay orders) */
  dockets: Docket[];
  selectedId: string;
  selected: Docket;
  selectDocket: (id: string) => void;
  setStatus: (id: string, status: string, stage: string) => void;

  /* acting authority for the session (CALA vs DM/DC) */
  authority: Authority;
  setAuthority: Dispatch<SetStateAction<Authority>>;

  /* derived case buckets */
  pending: Docket[];
  contestedList: Docket[];
  stayedList: Docket[];
  approvedList: Docket[];

  /* dashboard metric tiles */
  metrics: Array<{ label: string; value: string; sub: string }>;

  /* demo reset */
  resetDemo: () => void;
}

const ApproverContext = createContext<ApproverStore | null>(null);

export function ApproverProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [dockets, setDockets] = useState<Docket[]>(initialDockets);
  const [selectedId, setSelectedId] = useState<string>(initialDockets[0].id);
  const [authority, setAuthority] = useState<Authority>("CALA");

  const matches = useCallback(
    (d: Docket) => {
      const q = query.trim().toLowerCase();
      return !q || `${d.id} ${d.project} ${d.agency}`.toLowerCase().includes(q);
    },
    [query],
  );

  const selectDocket = useCallback((id: string) => setSelectedId(id), []);

  const setStatus = useCallback((id: string, status: string, stage: string) => {
    setDockets((ds) => ds.map((d) => (d.id === id ? { ...d, status, stage } : d)));
  }, []);

  const pending = useMemo(() => dockets.filter((d) => d.stage === "Approver Review" && d.status !== "Approved"), [dockets]);
  const contestedList = useMemo(() => dockets.filter((d) => d.status === "Contested" || d.status === "Stayed"), [dockets]);
  const stayedList = useMemo(() => dockets.filter((d) => d.status === "Stayed"), [dockets]);
  const approvedList = useMemo(() => dockets.filter((d) => d.status === "Approved"), [dockets]);

  const selected = useMemo(() => dockets.find((d) => d.id === selectedId) ?? dockets[0], [dockets, selectedId]);

  const metrics = useMemo(
    () => [
      { label: "Pending Reviews", value: String(pending.length), sub: "Action required before SLA" },
      { label: "High / Critical Priority", value: "5", sub: "Expedited infrastructure corridor" },
      { label: "Compensation Pending", value: "3", sub: "Awaiting CALA approval & award" },
      { label: "Objections Pending", value: "1", sub: "Hearings scheduled / under review" },
      { label: "Contested Parcels", value: String(contestedList.length), sub: "Title & ownership disputes" },
      { label: "Stayed Parcels", value: String(stayedList.length), sub: "Judicial court stay orders active" },
      { label: "Possession Pending", value: "1", sub: "Ready for DM/DC possession order" },
      { label: "Approved Cases", value: String(approvedList.length), sub: "Statutory clearance executed" },
    ],
    [pending.length, contestedList.length, stayedList.length, approvedList.length],
  );

  const resetDemo = useCallback(() => {
    setDockets(initialDockets);
    setSelectedId(initialDockets[0].id);
    setQuery("");
  }, []);

  const value = useMemo<ApproverStore>(
    () => ({
      query,
      setQuery,
      matches,
      dockets,
      selectedId,
      selected,
      selectDocket,
      setStatus,
      authority,
      setAuthority,
      pending,
      contestedList,
      stayedList,
      approvedList,
      metrics,
      resetDemo,
    }),
    [
      query,
      matches,
      dockets,
      selectedId,
      selected,
      selectDocket,
      setStatus,
      authority,
      pending,
      contestedList,
      stayedList,
      approvedList,
      metrics,
      resetDemo,
    ],
  );

  return <ApproverContext.Provider value={value}>{children}</ApproverContext.Provider>;
}

export function useApprover(): ApproverStore {
  const ctx = useContext(ApproverContext);
  if (!ctx)
    throw new Error("useApprover must be used within the /approver route shell (ApproverProvider)");
  return ctx;
}
