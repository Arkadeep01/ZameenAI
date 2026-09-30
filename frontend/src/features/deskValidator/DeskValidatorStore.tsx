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
import { queueRows } from "./deskValidatorData";

/**
 * Desk Validator (LAO) portal — cross-page state container.
 *
 * The monolith held the whole desk-scrutiny context (global case search,
 * confidence filter, the selected case, the dossier tab and the validator's
 * corrected field values) in one component. Those are now spread over eleven
 * routes, so the shared pieces live here.
 */
export interface DeskValidatorStore {
  /* shared search + confidence filter */
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  confFilter: "All" | "Low" | "Mid" | "High";
  setConfFilter: (v: "All" | "Low" | "Mid" | "High") => void;
  filteredQueue: typeof queueRows;

  /* selected case */
  selectedCase: string;
  setSelectedCase: (v: string) => void;
  /** Selects a case and prepares the workspace for it (routing is per-page). */
  selectCase: (caseId: string) => void;

  /* dossier */
  dossierTab: string;
  setDossierTab: (v: string) => void;

  /* validator corrections inside the scrutiny workspace */
  validatorValues: Record<string, string>;
  setValidatorValues: Dispatch<SetStateAction<Record<string, string>>>;

  /* actions */
  resetFilters: () => void;
}

const DeskValidatorContext = createContext<DeskValidatorStore | null>(null);

export function DeskValidatorProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [confFilter, setConfFilter] = useState<"All" | "Low" | "Mid" | "High">("All");
  const [selectedCase, setSelectedCase] = useState<string>("LA-2026-00132");
  const [dossierTab, setDossierTab] = useState("Overview");
  const [validatorValues, setValidatorValues] = useState<Record<string, string>>({ khasra: "192", area: "0.62" });

  const filteredQueue = useMemo(() => {
    return queueRows.filter((r) => {
      const q = query.trim().toLowerCase();
      const matches =
        !q ||
        r.caseId.toLowerCase().includes(q) ||
        r.khasra.toLowerCase().includes(q) ||
        r.khata.toLowerCase().includes(q) ||
        r.docId.toLowerCase().includes(q) ||
        r.project.toLowerCase().includes(q);
      const band = r.conf < 75 ? "Low" : r.conf < 90 ? "Mid" : "High";
      const confOk = confFilter === "All" || band === confFilter;
      return matches && confOk;
    });
  }, [query, confFilter]);

  const selectCase = useCallback((caseId: string) => setSelectedCase(caseId), []);

  const resetFilters = useCallback(() => {
    setQuery("");
    setConfFilter("All");
  }, []);

  const value = useMemo<DeskValidatorStore>(
    () => ({
      query,
      setQuery,
      confFilter,
      setConfFilter,
      filteredQueue,
      selectedCase,
      setSelectedCase,
      selectCase,
      dossierTab,
      setDossierTab,
      validatorValues,
      setValidatorValues,
      resetFilters,
    }),
    [query, confFilter, filteredQueue, selectedCase, selectCase, dossierTab, validatorValues, resetFilters],
  );

  return <DeskValidatorContext.Provider value={value}>{children}</DeskValidatorContext.Provider>;
}

export function useDeskValidator(): DeskValidatorStore {
  const ctx = useContext(DeskValidatorContext);
  if (!ctx)
    throw new Error("useDeskValidator must be used within the /desk-validator route shell (DeskValidatorProvider)");
  return ctx;
}
