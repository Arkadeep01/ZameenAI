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
import {
  DEFAULT_BOUNDARIES,
  initialAssignments,
  type Assignment,
} from "./fieldOfficerData";

/**
 * Field Officer portal — cross-page state container.
 *
 * The monolith kept the whole field-verification workflow (assignment list,
 * online/offline flag, search, the selected parcel, and all nine wizard
 * steps' answers) in a single component. Now that the wizard and the maps are
 * separate routes, that state is provided here by `routes/field-officer.tsx`
 * and consumed via `useFieldOfficer()`.
 */
export interface FieldOfficerStore {
  /* connectivity + search */
  online: boolean;
  setOnline: Dispatch<SetStateAction<boolean>>;
  query: string;
  setQuery: (v: string) => void;

  /* records */
  assignments: Assignment[];
  setAssignments: Dispatch<SetStateAction<Assignment[]>>;
  filtered: Assignment[];

  /* selected parcel / map */
  selectedId: string;
  setSelectedId: (v: string) => void;
  selected: Assignment;
  mapParcel: string;
  setMapParcel: (v: string) => void;

  /* ground-verification wizard */
  wStep: number;
  setWStep: Dispatch<SetStateAction<number>>;
  submitted: boolean;
  setSubmitted: Dispatch<SetStateAction<boolean>>;
  parcelVerdict: string;
  setParcelVerdict: (v: string) => void;
  possession: string;
  setPossession: (v: string) => void;
  areaVerdict: string;
  setAreaVerdict: (v: string) => void;
  boundaries: Record<string, string>;
  setBoundaries: Dispatch<SetStateAction<Record<string, string>>>;
  gps: string | null;
  setGps: Dispatch<SetStateAction<string | null>>;
  photos: string[];
  setPhotos: Dispatch<SetStateAction<string[]>>;
  assets: string[];
  setAssets: Dispatch<SetStateAction<string[]>>;
  remarks: string;
  setRemarks: (v: string) => void;

  /* actions */
  openVerify: (id: string) => void;
  resetDemo: () => void;
}

const FieldOfficerContext = createContext<FieldOfficerStore | null>(null);

export function FieldOfficerProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedId, setSelectedId] = useState("ASN-2026-0492");
  const [mapParcel, setMapParcel] = useState("Khasra 142/1 (Ramnagar)");
  const [wStep, setWStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  /* wizard answers */
  const [parcelVerdict, setParcelVerdict] = useState("Verified");
  const [possession, setPossession] = useState("Confirmed");
  const [areaVerdict, setAreaVerdict] = useState("Matches Record");
  const [boundaries, setBoundaries] = useState<Record<string, string>>(DEFAULT_BOUNDARIES);
  const [gps, setGps] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const selected = assignments.find((a) => a.id === selectedId) ?? assignments[0];

  const filtered = useMemo(() => {
    const x = query.trim().toLowerCase();
    if (!x) return assignments;
    return assignments.filter((a) => `${a.id} ${a.khasra} ${a.owner} ${a.village}`.toLowerCase().includes(x));
  }, [query, assignments]);

  /** Opens the ground-verification wizard for an assignment (state side only). */
  const openVerify = useCallback((id: string) => {
    setSelectedId(id);
    setWStep(1);
    setSubmitted(false);
    setAssignments((list) => list.map((a) => (a.id === id && a.status === "Assigned" ? { ...a, status: "In Progress" } : a)));
  }, []);

  const resetDemo = useCallback(() => {
    setAssignments(initialAssignments);
    setQuery("");
    setWStep(1);
    setSubmitted(false);
  }, []);

  const value = useMemo<FieldOfficerStore>(
    () => ({
      online,
      setOnline,
      query,
      setQuery,
      assignments,
      setAssignments,
      filtered,
      selectedId,
      setSelectedId,
      selected,
      mapParcel,
      setMapParcel,
      wStep,
      setWStep,
      submitted,
      setSubmitted,
      parcelVerdict,
      setParcelVerdict,
      possession,
      setPossession,
      areaVerdict,
      setAreaVerdict,
      boundaries,
      setBoundaries,
      gps,
      setGps,
      photos,
      setPhotos,
      assets,
      setAssets,
      remarks,
      setRemarks,
      openVerify,
      resetDemo,
    }),
    [
      online, query, assignments, filtered, selectedId, selected, mapParcel, wStep, submitted,
      parcelVerdict, possession, areaVerdict, boundaries, gps, photos, assets, remarks,
      openVerify, resetDemo,
    ],
  );

  return <FieldOfficerContext.Provider value={value}>{children}</FieldOfficerContext.Provider>;
}

export function useFieldOfficer(): FieldOfficerStore {
  const ctx = useContext(FieldOfficerContext);
  if (!ctx)
    throw new Error("useFieldOfficer must be used within the /field-officer route shell (FieldOfficerProvider)");
  return ctx;
}
