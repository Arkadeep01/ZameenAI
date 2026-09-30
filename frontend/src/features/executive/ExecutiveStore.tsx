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
import { ALL_DISTRICTS, INDIA_DISTRICTS, INDIA_STATES } from "../../utils/indiaGeo";
import { RFCTLARR_STAGES } from "../../utils/executiveRefs";
import {
  corridors,
  DEFAULT_COMPARE,
  DISTRICT_PAGE_SIZE,
  districts as monitoredDistricts,
  MAX_COMPARE,
  stateBenchmark,
  type Corridor,
  type DistrictRow,
  type Scope,
  type StateRow,
} from "./executiveData";

/**
 * Executive (MIS & DSS) portal — cross-page state container.
 *
 * The monolith held the whole decision-support context (global MIS filter
 * strip, search, jurisdictional scope, state/district directory scope,
 * comparison basket and report tab) in one component. Those now span
 * seventeen routes, so the shared state lives here.
 */
export interface ExecutiveStore {
  /* global MIS filter strip (rendered portal-wide by the parent shell) */
  globalState: string;
  setGlobalState: (v: string) => void;
  globalDistrict: string;
  setGlobalDistrict: (v: string) => void;
  globalType: string;
  setGlobalType: (v: string) => void;
  globalMinistry: string;
  setGlobalMinistry: (v: string) => void;
  globalStage: string;
  setGlobalStage: (v: string) => void;
  globalHealth: string;
  setGlobalHealth: (v: string) => void;
  hasActiveFilters: boolean;
  clearGlobalFilters: () => void;
  districtsOfGlobalState: string[];

  /* shared search box + jurisdictional scope */
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  scope: Scope;
  setScope: Dispatch<SetStateAction<Scope>>;

  /* corridors */
  filteredCorridors: Corridor[];

  /* state performance screen */
  stateScope: "monitored" | "all";
  setStateScope: Dispatch<SetStateAction<"monitored" | "all">>;
  allStatesRows: StateRow[];
  visibleStates: StateRow[];

  /* district MIS screen (paged) */
  districtState: string;
  setDistrictState: Dispatch<SetStateAction<string>>;
  districtPage: number;
  setDistrictPage: Dispatch<SetStateAction<number>>;
  districtDirectory: DistrictRow[];
  visibleDistricts: DistrictRow[];
  districtPages: number;
  districtRows: DistrictRow[];
  drillIntoDistrict: (stateName: string) => void;

  /* project comparison basket */
  compare: string[];
  toggleCompare: (name: string) => void;
  compared: Corridor[];

  /* MIS reports screen tab */
  reportTab: string;
  setReportTab: (v: string) => void;

  /* demo reset */
  resetDemo: () => void;
}

const ExecutiveContext = createContext<ExecutiveStore | null>(null);

export function ExecutiveProvider({ children }: { children: ReactNode }) {
  const [globalState, setGlobalStateRaw] = useState("All States");
  const [globalDistrict, setGlobalDistrict] = useState("All Districts");
  const [globalType, setGlobalType] = useState("All Infrastructure Types");
  const [globalMinistry, setGlobalMinistry] = useState("All Ministries & Agencies");
  const [globalStage, setGlobalStage] = useState("All RFCTLARR Stages");
  const [globalHealth, setGlobalHealth] = useState("All Statuses");
  const [scope, setScope] = useState<Scope>("National");
  const [query, setQuery] = useState("");
  const [stateScope, setStateScope] = useState<"monitored" | "all">("monitored");
  const [districtState, setDistrictState] = useState("All States");
  const [districtPage, setDistrictPage] = useState(0);
  const [compare, setCompare] = useState<string[]>(DEFAULT_COMPARE);
  const [reportTab, setReportTab] = useState("All MIS Reports");

  /** Changing the state resets the district selection (matches monolith). */
  const setGlobalState = useCallback((v: string) => {
    setGlobalStateRaw(v);
    setGlobalDistrict("All Districts");
  }, []);

  const hasActiveFilters =
    globalState !== "All States" ||
    globalDistrict !== "All Districts" ||
    globalType !== "All Infrastructure Types" ||
    globalMinistry !== "All Ministries & Agencies" ||
    globalStage !== "All RFCTLARR Stages" ||
    globalHealth !== "All Statuses";

  const clearGlobalFilters = useCallback(() => {
    setGlobalStateRaw("All States");
    setGlobalDistrict("All Districts");
    setGlobalType("All Infrastructure Types");
    setGlobalMinistry("All Ministries & Agencies");
    setGlobalStage("All RFCTLARR Stages");
    setGlobalHealth("All Statuses");
  }, []);

  const districtsOfGlobalState = globalState === "All States" ? [] : (INDIA_DISTRICTS[globalState] ?? []);

  const filteredCorridors = useMemo(() => {
    const x = query.trim().toLowerCase();
    return corridors.filter((c) => {
      const matchesQ = !x || `${c.name} ${c.code} ${c.state} ${c.district}`.toLowerCase().includes(x);
      const matchesState = globalState === "All States" || c.state === globalState;
      const matchesDist = globalDistrict === "All Districts" || c.district === globalDistrict;
      const matchesType = globalType === "All Infrastructure Types" || c.type === globalType;
      const matchesMinistry = globalMinistry === "All Ministries & Agencies" || c.ministry === globalMinistry;
      const stageMatch = RFCTLARR_STAGES.find((s) => s.label === globalStage)?.match;
      const matchesStage = !stageMatch || c.stage.includes(stageMatch);
      const matchesHealth = globalHealth === "All Statuses" || c.status === globalHealth;
      return matchesQ && matchesState && matchesDist && matchesType && matchesMinistry && matchesStage && matchesHealth;
    });
  }, [query, globalState, globalDistrict, globalType, globalMinistry, globalStage, globalHealth]);

  /** All 36 States/UTs: 7 monitored rows + remaining directory rows. */
  const allStatesRows = useMemo<StateRow[]>(() => {
    const monitored = new Map(stateBenchmark.map((r) => [r.s, r]));
    return INDIA_STATES.map((s) => {
      const m = monitored.get(s.name);
      if (m) return { ...m, monitored: true, type: s.type, code: s.code };
      return {
        s: s.name, st: "No Active Corridor", proj: 0, req: "—", not: "—", acq: "—",
        pct: 0, ass: "—", paid: "—", fam: "—", rr: "—", del: 0,
        monitored: false, type: s.type, code: s.code,
      };
    });
  }, []);

  const visibleStates = useMemo(() => {
    const rows = stateScope === "monitored" ? allStatesRows.filter((r) => r.monitored) : allStatesRows;
    const x = query.trim().toLowerCase();
    if (!x) return rows;
    return rows.filter((r) => r.s.toLowerCase().includes(x));
  }, [allStatesRows, stateScope, query]);

  /** Full district directory: monitored KPI rows merged over the all-India list. */
  const districtDirectory = useMemo<DistrictRow[]>(() => {
    const kpi = new Map(monitoredDistricts.map((r) => [`${r.d}|${r.s}`, r]));
    return ALL_DISTRICTS.map(({ district, state }) => {
      const m = kpi.get(`${district}|${state}`);
      if (m) return { d: m.d, s: m.s, p: m.p, area: m.area, acq: m.acq, comp: m.comp, fam: m.fam, rr: m.rr, poss: m.poss, adh: m.adh, monitored: true };
      return { d: district, s: state, p: 0, area: "—", acq: 0, comp: "—", fam: "—", rr: "—", poss: "—", adh: "No Active Corridor", monitored: false };
    });
  }, []);

  const visibleDistricts = useMemo(() => {
    const x = query.trim().toLowerCase();
    return districtDirectory.filter((r) => {
      const matchesState = districtState === "All States" || r.s === districtState;
      const matchesQ = !x || `${r.d} ${r.s}`.toLowerCase().includes(x);
      return matchesState && matchesQ;
    });
  }, [districtDirectory, districtState, query]);

  const districtPages = Math.max(1, Math.ceil(visibleDistricts.length / DISTRICT_PAGE_SIZE));
  const districtRows = visibleDistricts.slice(districtPage * DISTRICT_PAGE_SIZE, districtPage * DISTRICT_PAGE_SIZE + DISTRICT_PAGE_SIZE);

  const drillIntoDistrict = useCallback((stateName: string) => {
    setDistrictState(stateName);
    setDistrictPage(0);
  }, []);

  const toggleCompare = useCallback(
    (name: string) =>
      setCompare((s) => (s.includes(name) ? s.filter((x) => x !== name) : s.length >= MAX_COMPARE ? s : [...s, name])),
    [],
  );

  const compared = useMemo(() => corridors.filter((c) => compare.includes(c.name)), [compare]);

  const resetDemo = useCallback(() => {
    setQuery("");
    setCompare(DEFAULT_COMPARE);
    setReportTab("All MIS Reports");
    clearGlobalFilters();
    setStateScope("monitored");
    setDistrictState("All States");
    setDistrictPage(0);
  }, [clearGlobalFilters]);

  const value = useMemo<ExecutiveStore>(
    () => ({
      globalState,
      setGlobalState,
      globalDistrict,
      setGlobalDistrict,
      globalType,
      setGlobalType,
      globalMinistry,
      setGlobalMinistry,
      globalStage,
      setGlobalStage,
      globalHealth,
      setGlobalHealth,
      hasActiveFilters,
      clearGlobalFilters,
      districtsOfGlobalState,
      query,
      setQuery,
      scope,
      setScope,
      filteredCorridors,
      stateScope,
      setStateScope,
      allStatesRows,
      visibleStates,
      districtState,
      setDistrictState,
      districtPage,
      setDistrictPage,
      districtDirectory,
      visibleDistricts,
      districtPages,
      districtRows,
      drillIntoDistrict,
      compare,
      toggleCompare,
      compared,
      reportTab,
      setReportTab,
      resetDemo,
    }),
    [
      globalState, setGlobalState, globalDistrict, globalType, globalMinistry, globalStage, globalHealth,
      hasActiveFilters, clearGlobalFilters, districtsOfGlobalState, query, scope, filteredCorridors,
      stateScope, allStatesRows, visibleStates, districtState, districtPage, districtDirectory,
      visibleDistricts, districtPages, districtRows, drillIntoDistrict, compare, toggleCompare,
      compared, reportTab, resetDemo,
    ],
  );

  return <ExecutiveContext.Provider value={value}>{children}</ExecutiveContext.Provider>;
}

export function useExecutive(): ExecutiveStore {
  const ctx = useContext(ExecutiveContext);
  if (!ctx)
    throw new Error("useExecutive must be used within the /executive route shell (ExecutiveProvider)");
  return ctx;
}
