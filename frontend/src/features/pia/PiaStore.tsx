import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cases,
  matchesCaseTab,
  projects,
  type PiaCase,
} from "./piaData";

/**
 * PIA portal — cross-page state container.
 *
 * The former `routes/pia.tsx` kept a single `PiaPortal` component whose
 * `view` state switched between 13 screens. Once each screen is a real route,
 * the filters that were shared by more than one screen have to live above the
 * route boundary, so they are provided here by `routes/pia.tsx` (the parent
 * route) and consumed by the `pia.*.tsx` pages via `usePia()`.
 *
 *   query        – search box shared by Projects / Cases / Documents / Workflow
 *   caseTab      – the acquisition-cases tab strip
 *   notifTab     – the notification group tab strip
 *   wizardStep   – the new-proposal wizard step selector
 */

export interface PiaStore {
  query: string;
  setQuery: (v: string) => void;
  caseTab: string;
  setCaseTab: (v: string) => void;
  notifTab: string;
  setNotifTab: (v: string) => void;
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  filteredProjects: typeof projects;
  filteredCases: PiaCase[];
  resetDemo: () => void;
}

const PiaContext = createContext<PiaStore | null>(null);

export function PiaProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [caseTab, setCaseTab] = useState("All Cases");
  const [notifTab, setNotifTab] = useState("All Notifications");
  const [wizardStep, setWizardStep] = useState(1);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.id} ${p.name} ${p.districts} ${p.type}`.toLowerCase().includes(q));
  }, [query]);

  const filteredCases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      const matches = !q || `${c.id} ${c.title} ${c.dist} ${c.proj}`.toLowerCase().includes(q);
      return matchesCaseTab(c.stage, caseTab);
    });
  }, [query, caseTab]);

  const resetDemo = useCallback(() => {
    setQuery("");
    setCaseTab("All Cases");
    setNotifTab("All Notifications");
    setWizardStep(1);
  }, []);

  const value = useMemo<PiaStore>(
    () => ({
      query,
      setQuery,
      caseTab,
      setCaseTab,
      notifTab,
      setNotifTab,
      wizardStep,
      setWizardStep,
      filteredProjects,
      filteredCases,
      resetDemo,
    }),
    [query, caseTab, notifTab, wizardStep, filteredProjects, filteredCases, resetDemo],
  );

  return <PiaContext.Provider value={value}>{children}</PiaContext.Provider>;
}

export function usePia(): PiaStore {
  const ctx = useContext(PiaContext);
  if (!ctx) throw new Error("usePia must be used within the /pia route shell (PiaProvider)");
  return ctx;
}
