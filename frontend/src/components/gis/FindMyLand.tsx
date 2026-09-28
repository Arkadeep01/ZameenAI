import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  CircleHelp,
  FileQuestion,
  FileText,
  Info,
  Loader2,
  Map as MapIcon,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import type { Parcel } from "../../types/gis";
import type { SearchParcelRow } from "../../services/gis";
import { gisParcels } from "../../utils/gisMockData";
import {
  searchLandParcels,
  searchRowToParcel,
  type SearchParcelParams,
} from "../../services/gis";

import { citizenCrumbs } from "../../config/citizenBreadcrumbs";
import { LocationService } from "../../services/locationService";

import CitizenGISMap from "./CitizenGISMap";
import ParcelCard from "./ParcelCard";
import SearchableCombobox from "../common/SearchableCombobox";

import PageContainer from "../common/PageContainer";
import PageHeader from "../common/PageHeader";
import {
  buttonClass,
  cardHeadingClass,
  eyebrowClass,
  fieldClass,
  insetSurface,
  surface,
  surfacePadded,
} from "../common/portalStyles";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SearchMethod = "details" | "parcel" | "map";

type IdentifierField = "khasra" | "khata" | "owner";

type LocationLevel = "state" | "district" | "tehsil" | "village";

/** Flattened, comparable view of a record regardless of its source. */
interface SearchableRecord {
  khasra: string;
  khata: string;
  owner: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  parcelCode: string;
}

interface SearchCriteria {
  state: string;
  district: string;
  tehsil: string;
  village: string;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function lower(value: string): string {
  return value.trim().toLowerCase();
}

/** Any of the supplied values contains the needle. */
function anyContains(values: string[], needle: string): boolean {
  return values.some((value) => lower(value).includes(needle));
}

const rowToRecord = (row: SearchParcelRow): SearchableRecord => ({
  khasra: text(row.khasra_no),
  khata: text(row.khata_no),
  owner: text(row.owner_name),
  village: text(row.village),
  tehsil: text(row.tehsil),
  district: text(row.district),
  state: "",
  parcelCode: text(row.parcel_code),
});

const parcelToRecord = (parcel: Parcel): SearchableRecord => ({
  khasra: parcel.khasraNumber,
  khata: parcel.khatauni ?? "",
  owner: "",
  village: parcel.village,
  tehsil: parcel.tehsil,
  district: parcel.district,
  state: parcel.state,
  parcelCode: parcel.cadastralId,
});

/**
 * Applies the location filters plus one identifier the citizen typed.
 * `identifier` is empty when the citizen only narrowed by location.
 */
function matchesCriteria(
  record: SearchableRecord,
  location: SearchCriteria,
  identifierField: IdentifierField | null,
  identifierValue: string,
): boolean {
  if (location.state && record.state && lower(record.state) !== lower(location.state)) return false;
  if (location.district && record.district && lower(record.district) !== lower(location.district)) return false;
  if (location.tehsil && record.tehsil && lower(record.tehsil) !== lower(location.tehsil)) return false;
  if (location.village && record.village && lower(record.village) !== lower(location.village)) return false;

  const needle = lower(identifierValue);
  if (!needle) return true;

  if (identifierField === "khasra") {
    return anyContains(
      [record.khasra, record.parcelCode],
      needle,
    );
  }

  if (identifierField === "khata") {
    return anyContains([record.khata], needle);
  }

  return anyContains([record.owner], needle);
}

/** Method 2 accepts both identifiers at once; both must match when supplied. */
function matchesParcelMethod(
  record: SearchableRecord,
  khasra: string,
  khata: string,
): boolean {
  const hasKhasra = lower(khasra).length > 0;
  const hasKhata = lower(khata).length > 0;

  if (!hasKhasra && !hasKhata) return true;

  if (hasKhasra && !anyContains([record.khasra, record.parcelCode], lower(khasra))) {
    return false;
  }

  if (hasKhata && !anyContains([record.khata], lower(khata))) return false;

  return true;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    setReduced(mq.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function FindMyLand() {
  const navigate = useNavigate();

  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(false);

  const [method, setMethod] = useState<SearchMethod>("details");

  const [location, setLocation] = useState<SearchCriteria>({
    state: "",
    district: "",
    tehsil: "",
    village: "",
  });

  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingTehsils, setIsLoadingTehsils] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);

  const districtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tehsilTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const villageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (districtTimerRef.current) clearTimeout(districtTimerRef.current);
      if (tehsilTimerRef.current) clearTimeout(tehsilTimerRef.current);
      if (villageTimerRef.current) clearTimeout(villageTimerRef.current);
    };
  }, []);

  const [identifierField, setIdentifierField] =
    useState<IdentifierField>("khasra");
  const [identifierValue, setIdentifierValue] = useState("");

  const [khasraValue, setKhasraValue] = useState("");
  const [khataValue, setKhataValue] = useState("");

  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [validationHint, setValidationHint] = useState<string | null>(null);
  const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true);
      return;
    }

    const frame = requestAnimationFrame(() => setRevealed(true));

    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  /* ---------------------------------------------------------------------- */
  /* CASCADING LOCATION OPTIONS                                             */
  /* ---------------------------------------------------------------------- */

  const locationOptions = useMemo(() => {
    const states = LocationService.getStates();
    const districts = location.state
      ? LocationService.getDistricts(location.state)
      : [];
    const tehsils =
      location.state && location.district
        ? LocationService.getTehsils(location.state, location.district)
        : [];
    const villages =
      location.state && location.district && location.tehsil
        ? LocationService.getVillages(
            location.state,
            location.district,
            location.tehsil,
          )
        : [];

    return {
      state: states,
      district: districts,
      tehsil: tehsils,
      village: villages,
    };
  }, [location.state, location.district, location.tehsil]);

  /** Changing a level clears every deeper level so options stay consistent. */
  const handleLocationChange = (level: LocationLevel, value: string) => {
    setLocation((prev) => {
      const next: SearchCriteria = { ...prev, [level]: value };

      if (level === "state") {
        next.district = "";
        next.tehsil = "";
        next.village = "";
      } else if (level === "district") {
        next.tehsil = "";
        next.village = "";
      } else if (level === "tehsil") {
        next.village = "";
      }

      return next;
    });

    if (level === "state") {
      if (value) {
        setIsLoadingDistricts(true);
        if (districtTimerRef.current) clearTimeout(districtTimerRef.current);
        districtTimerRef.current = setTimeout(() => setIsLoadingDistricts(false), 120);
      } else {
        setIsLoadingDistricts(false);
      }
      setIsLoadingTehsils(false);
      setIsLoadingVillages(false);
    } else if (level === "district") {
      if (value) {
        setIsLoadingTehsils(true);
        if (tehsilTimerRef.current) clearTimeout(tehsilTimerRef.current);
        tehsilTimerRef.current = setTimeout(() => setIsLoadingTehsils(false), 120);
      } else {
        setIsLoadingTehsils(false);
      }
      setIsLoadingVillages(false);
    } else if (level === "tehsil") {
      if (value) {
        setIsLoadingVillages(true);
        if (villageTimerRef.current) clearTimeout(villageTimerRef.current);
        villageTimerRef.current = setTimeout(() => setIsLoadingVillages(false), 120);
      } else {
        setIsLoadingVillages(false);
      }
    }
  };

  /* ---------------------------------------------------------------------- */
  /* MAP DATA                                                              */
  /* ---------------------------------------------------------------------- */

  const mapParcels = useMemo(
    () => (searched ? results : gisParcels),
    [searched, results],
  );

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                */
  /* ---------------------------------------------------------------------- */

  const runSearch = async (
    locationFilter: SearchCriteria,
    matcher: (record: SearchableRecord) => boolean,
    params: SearchParcelParams,
  ) => {
    setIsSearching(true);
    setError(null);
    setOfflineNotice(false);
    setValidationHint(null);

    try {
      const response = await searchLandParcels(params);

      const matched = response.data
        .filter((row) => matcher(rowToRecord(row)))
        .map((row) => searchRowToParcel(row))
        .filter((parcel): parcel is Parcel => parcel !== null);

      setResults(matched);
      setSearched(true);
    } catch {
      /*
       * The GIS module can be unavailable while the rest of the portal keeps
       * working, so fall back to the shared cadastral dataset the rest of the
       * Citizen Portal already uses and tell the citizen which source answered.
       */
      try {
        const matched = gisParcels.filter((parcel) =>
          matcher(parcelToRecord(parcel)),
        );

        setResults(matched);
        setSearched(true);
        setOfflineNotice(true);
      } catch {
        setResults([]);
        setSearched(true);
        setError(
          "We could not reach the land records service right now. Please try again in a moment.",
        );
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (method === "map") return;

    if (method === "details") {
      if (!identifierValue.trim()) {
        setValidationHint(
          "Enter the land record number you want to search for.",
        );
        return;
      }

      void runSearch(
        location,
        (record) =>
          matchesCriteria(record, location, identifierField, identifierValue),
        {
          ...(location.district ? { district: location.district } : {}),
          ...(identifierField === "khasra" && identifierValue.trim()
            ? { khasra_no: identifierValue.trim() }
            : {}),
        },
      );

      return;
    }

    if (!khasraValue.trim() && !khataValue.trim()) {
      setValidationHint("Enter a Khasra / Plot number or a Khata / Khatian number.");
      return;
    }

    void runSearch(
      location,
      (record) => matchesParcelMethod(record, khasraValue, khataValue),
      {
        ...(location.district ? { district: location.district } : {}),
        ...(khasraValue.trim() ? { khasra_no: khasraValue.trim() } : {}),
      },
    );
  };

  /* ---------------------------------------------------------------------- */
  /* RESET / NAVIGATION                                                    */
  /* ---------------------------------------------------------------------- */

  const handleReset = () => {
    setMethod("details");
    setLocation({ state: "", district: "", tehsil: "", village: "" });
    setIsLoadingDistricts(false);
    setIsLoadingTehsils(false);
    setIsLoadingVillages(false);
    setIdentifierField("khasra");
    setIdentifierValue("");
    setKhasraValue("");
    setKhataValue("");
    setResults([]);
    setSearched(false);
    setSelectedParcel(null);
    setError(null);
    setOfflineNotice(false);
    setValidationHint(null);
    setClickedLocation(null);
  };

  const handleViewDetails = (parcel: Parcel) => {
    navigate({ to: "/citizen/land-details", search: { parcel: String(parcel.id) } });
  };

  const handleViewOnMap = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setMethod("map");
  };

  const showOnMap = searched ? results : gisParcels;

  const identifierLabel =
    identifierField === "khasra"
      ? "Khasra / Plot Number"
      : identifierField === "khata"
        ? "Khata / Khatian Number"
        : "Owner Name";

  const identifierPlaceholder =
    identifierField === "khasra"
      ? "e.g. 184/2"
      : identifierField === "khata"
        ? "e.g. KH-9912"
        : "e.g. part of the registered name";

  return (
    <PageContainer className="space-y-5 sm:space-y-6">
      {/* ================================================================== */}
      {/* PAGE HEADER                                                       */}
      {/* ================================================================== */}

      <Reveal shown={revealed} reduced={reducedMotion} as="div">
        <PageHeader
          breadcrumbs={citizenCrumbs("/citizen/find-land")}
          title="Search / Find Land"
          subtitle="Find your land record using location, parcel details, or the map."
          actions={
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDCF0] bg-[#EAF3FC] px-2.5 py-1 text-xs font-semibold text-[#1261A8]">
                <FileText size={13} aria-hidden="true" />
                Land Record Search
              </span>

              {(searched || identifierValue || khasraValue || khataValue) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className={buttonClass("secondary", "sm")}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Reset Search
                </button>
              )}
            </>
          }
        />
      </Reveal>

      {/* ================================================================== */}
      {/* SEARCH CARD                                                       */}
      {/* ================================================================== */}

      <Reveal
        shown={revealed}
        reduced={reducedMotion}
        delay={reducedMotion ? 0 : 70}
        as="section"
        className={surfacePadded}
        aria-labelledby="find-land-search-heading"
      >
        <h2 id="find-land-search-heading" className={cardHeadingClass}>
          Find a Land Parcel
        </h2>

        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Enter the details you know. You can search by location, parcel number,
          or owner information.
        </p>

        {/* ---------------- Search method tabs ---------------- */}

        <div
          role="tablist"
          aria-label="Search method"
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {(
            [
              ["details", "Search by Land Details", Building2],
              ["parcel", "Search by Parcel Number", FileText],
              ["map", "Search on Map", MapIcon],
            ] as const
          ).map(([value, label, Icon]) => {
            const isSelected = method === value;

            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`find-land-tab-${value}`}
                aria-selected={isSelected}
                aria-controls={`find-land-panel-${value}`}
                onClick={() => setMethod(value)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8] ${
                  isSelected
                    ? "border-[#062B52] bg-[#062B52] text-white"
                    : "border-[#D9E2EC] bg-white text-[#062B52] hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ---------------- Method 1: Land Details ---------------- */}

        {method === "details" && (
          <div
            role="tabpanel"
            id="find-land-panel-details"
            aria-labelledby="find-land-tab-details"
            className="mt-5 min-w-0"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SearchableCombobox
                id="find-land-state"
                label="State"
                value={location.state}
                options={locationOptions.state}
                placeholder="All States / Union Territories"
                searchPlaceholder="Search states..."
                emptyMessage="No states found"
                onChange={(value) => handleLocationChange("state", value)}
                onClear={() => handleLocationChange("state", "")}
              />

              <SearchableCombobox
                id="find-land-district"
                label="District"
                value={location.district}
                options={locationOptions.district}
                placeholder="All districts"
                disabledPlaceholder="Select a state first"
                searchPlaceholder="Search districts..."
                disabled={!location.state}
                loading={isLoadingDistricts}
                loadingMessage="Loading districts..."
                emptyMessage="No districts found"
                onChange={(value) => handleLocationChange("district", value)}
                onClear={() => handleLocationChange("district", "")}
              />

              <SearchableCombobox
                id="find-land-tehsil"
                label="Tehsil / Taluka"
                value={location.tehsil}
                options={locationOptions.tehsil}
                placeholder="All tehsils"
                disabledPlaceholder="Select a district first"
                searchPlaceholder="Search tehsil / taluka..."
                disabled={!location.district}
                loading={isLoadingTehsils}
                loadingMessage="Loading tehsils..."
                emptyMessage="No tehsils found"
                onChange={(value) => handleLocationChange("tehsil", value)}
                onClear={() => handleLocationChange("tehsil", "")}
              />

              <SearchableCombobox
                id="find-land-village"
                label="Village"
                value={location.village}
                options={locationOptions.village}
                placeholder="All villages"
                disabledPlaceholder="Select a tehsil/taluka first"
                searchPlaceholder="Search villages..."
                disabled={!location.tehsil}
                loading={isLoadingVillages}
                loadingMessage="Loading villages..."
                emptyMessage="No villages found"
                onChange={(value) => handleLocationChange("village", value)}
                onClear={() => handleLocationChange("village", "")}
              />
            </div>

            <fieldset className="mt-5 min-w-0">
              <legend className={eyebrowClass}>Search by</legend>

              <div
                role="radiogroup"
                aria-label="Search by"
                className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {(
                  [
                    ["khasra", "Khasra / Plot Number"],
                    ["khata", "Khata / Khatian Number"],
                    ["owner", "Owner Name"],
                  ] as const
                ).map(([value, label]) => {
                  const isSelected = identifierField === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setIdentifierField(value);
                        setValidationHint(null);
                      }}
                      className={`flex min-h-[44px] items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8] ${
                        isSelected
                          ? "border-[#062B52] bg-[#062B52] text-white"
                          : "border-[#D9E2EC] bg-white text-[#062B52] hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                          isSelected
                            ? "border-white bg-white"
                            : "border-slate-300 bg-transparent"
                        }`}
                      />

                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5 min-w-0">
              <label
                htmlFor="find-land-identifier"
                className="mb-1.5 block text-xs font-semibold text-[#062B52]"
              >
                {identifierLabel}{" "}
                <span className="text-red-600">*</span>
              </label>

              <div className="relative min-w-0">
                {identifierField === "owner" ? (
                  <User
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                ) : (
                  <FileText
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                )}

                <input
                  id="find-land-identifier"
                  value={identifierValue}
                  onChange={(event) => {
                    setIdentifierValue(event.target.value);
                    setValidationHint(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder={identifierPlaceholder}
                  aria-invalid={Boolean(validationHint)}
                  className={`${fieldClass} h-11 pl-10 ${
                    identifierValue ? "pr-10" : "pr-3"
                  }`}
                />

                {identifierValue && (
                  <button
                    type="button"
                    onClick={() => setIdentifierValue("")}
                    aria-label={`Clear ${identifierLabel}`}
                    className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Method 2: Parcel Number ---------------- */}

        {method === "parcel" && (
          <div
            role="tabpanel"
            id="find-land-panel-parcel"
            aria-labelledby="find-land-tab-parcel"
            className="mt-5 min-w-0"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                id="find-land-khasra"
                label="Khasra / Plot Number"
                placeholder="e.g. 184/2"
                value={khasraValue}
                onChange={(value) => {
                  setKhasraValue(value);
                  setValidationHint(null);
                }}
                onEnter={handleSearch}
                icon={<FileText size={16} aria-hidden="true" />}
              />

              <TextField
                id="find-land-khata"
                label="Khata / Khatian Number"
                placeholder="e.g. KH-9912"
                value={khataValue}
                onChange={(value) => {
                  setKhataValue(value);
                  setValidationHint(null);
                }}
                onEnter={handleSearch}
                icon={<FileText size={16} aria-hidden="true" />}
              />
            </div>

            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <Info
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-slate-400"
              />
              <span>
                Enter either number, or both to narrow the search further.
              </span>
            </p>
          </div>
        )}

        {/* ---------------- Method 3: Map ---------------- */}

        {method === "map" && (
          <div
            role="tabpanel"
            id="find-land-panel-map"
            aria-labelledby="find-land-tab-map"
            className="mt-5 min-w-0"
          >
            <div
              className={`${surface} min-w-0 overflow-hidden`}
              aria-label="Land parcel map"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-[#D9E2EC] px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#1261A8]">
                    <MapPin size={16} aria-hidden="true" />
                  </span>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[#062B52]">
                      Select a Parcel on the Map
                    </h3>
                    <p className="truncate text-xs text-slate-600">
                      Tap a boundary to see the land record
                    </p>
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-2.5 py-1 text-xs font-semibold text-[#062B52]">
                  {showOnMap.length} parcel{showOnMap.length === 1 ? "" : "s"}{" "}
                  shown
                </span>
              </div>

              <CitizenGISMap
                parcels={mapParcels}
                selectedParcel={selectedParcel}
                onSelectParcel={setSelectedParcel}
                onMapClick={(lat, lng) =>
                  setClickedLocation([
                    Number(lat.toFixed(6)),
                    Number(lng.toFixed(6)),
                  ])
                }
                clickedLocation={clickedLocation}
                className="h-[380px] w-full sm:h-[460px] lg:h-[540px]"
              />
            </div>

            {selectedParcel ? (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <ShieldCheck
                    size={16}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[#1261A8]"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#062B52]">
                      Khasra {selectedParcel.khasraNumber} selected
                    </p>

                    <p className="mt-0.5 text-xs text-slate-600">
                      {selectedParcel.village} &bull; {selectedParcel.tehsil},{" "}
                      {selectedParcel.district} &bull;{" "}
                      {Number(selectedParcel.area).toFixed(2)}{" "}
                      {selectedParcel.areaUnit}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-[#1261A8]">
                      {selectedParcel.statusLabel}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleViewDetails(selectedParcel)}
                  className={`${buttonClass("primary", "md")} w-full shrink-0 sm:w-auto`}
                >
                  <FileText size={15} aria-hidden="true" />
                  View Land Details
                </button>
              </div>
            ) : (
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <CircleHelp
                  size={14}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#1261A8]"
                />
                <span>
                  No parcel selected yet. Choose a boundary on the map to view
                  its land record.
                </span>
              </p>
            )}
          </div>
        )}

        {/* ---------------- Validation hint ---------------- */}

        {validationHint && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
          >
            <AlertTriangle
              size={14}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-700"
            />
            {validationHint}
          </p>
        )}

        {/* ---------------- Actions ---------------- */}

        {method !== "map" && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              aria-busy={isSearching}
              className={`${buttonClass("primary", "lg")} group w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto`}
            >
              {isSearching ? (
                <Loader2
                  size={16}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <Search size={16} aria-hidden="true" />
              )}

              {isSearching ? "Searching…" : "Search Land"}

              {!isSearching && (
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isSearching}
              className={`${buttonClass("secondary", "lg")} w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto`}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Clear
            </button>

            {isSearching && (
              <span
                role="status"
                className="flex items-center gap-2 text-xs text-slate-600 sm:ml-1"
              >
                <Loader2
                  size={13}
                  aria-hidden="true"
                  className="animate-spin text-[#1261A8]"
                />
                Searching land records…
              </span>
            )}
          </div>
        )}

        {/* ---------------- Compact help ---------------- */}

        <div className={`${insetSurface} mt-5 p-3.5`}>
          <p className="flex items-center gap-2 text-xs font-bold text-[#062B52]">
            <CircleHelp size={14} aria-hidden="true" className="text-[#1261A8]" />
            Where can I find these details?
          </p>

          <dl className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              [
                "Khasra / Plot Number",
                "Usually available on your land record or RoR.",
              ],
              [
                "Khata / Khatian Number",
                "Available on your land record documents.",
              ],
              [
                "Village / Tehsil",
                "Available on the land record or property documents.",
              ],
            ].map(([term, description]) => (
              <div key={term} className="min-w-0">
                <dt className="text-xs font-semibold text-[#062B52]">{term}</dt>
                <dd className="mt-0.5 text-xs leading-5 text-slate-600">
                  {description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      {/* ================================================================== */}
      {/* SEARCH RESULTS                                                      */}
      {/* ================================================================== */}

      {searched && method !== "map" && (
        <Reveal
          shown={revealed}
          reduced={reducedMotion}
          delay={reducedMotion ? 0 : 120}
          as="section"
          className="space-y-3"
          aria-labelledby="find-land-results-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2
              id="find-land-results-heading"
              className="text-base font-bold text-[#062B52]"
            >
              Search Results
            </h2>

            <span className="text-xs text-slate-500">
              {results.length} land parcel{results.length === 1 ? "" : "s"} found
            </span>
          </div>

          {error && (
            <div
              className={`${surface} border-red-200 bg-red-50 p-4`}
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  size={16}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-800">
                    Unable to search land records
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-red-800">
                    Please try again in a moment.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className={`${buttonClass("secondary", "sm")} mt-3`}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Try Again
              </button>
            </div>
          )}

          {!error && offlineNotice && (
            <div
              className={`${insetSurface} flex items-start gap-2.5 p-3.5`}
              role="status"
            >
              <Info
                size={15}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[#1261A8]"
              />

              <p className="text-xs leading-5 text-[#062B52]">
                The land records service is not responding, so these results
                come from the last synchronised offline registry copy.
              </p>
            </div>
          )}

          {!error && results.length > 0 && (
            <div className="space-y-3">
              {results.map((parcel) => (
                <ParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  selected={selectedParcel?.id === parcel.id}
                  onSelect={() => setSelectedParcel(parcel)}
                  onViewMap={() => handleViewOnMap(parcel)}
                  onViewDetails={() => handleViewDetails(parcel)}
                />
              ))}
            </div>
          )}

          {!error && results.length === 0 && (
            <div
              className={`${surface} border-dashed p-8 text-center`}
              role="status"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3FC] text-[#1261A8]">
                <Search size={22} aria-hidden="true" />
              </span>

              <p className="mt-3 text-sm font-bold text-[#062B52]">
                No land record found
              </p>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                We couldn&apos;t find a matching land parcel with the details
                entered.
              </p>

              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setMethod("details");
                    setValidationHint(null);
                  }}
                  className={`${buttonClass("secondary", "md")} w-full sm:w-auto`}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Try again
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("map")}
                  className={`${buttonClass("primary", "md")} w-full sm:w-auto`}
                >
                  <MapIcon size={14} aria-hidden="true" />
                  Search on Map
                </button>
              </div>
            </div>
          )}
        </Reveal>
      )}

      {/* ================================================================== */}
      {/* NEED HELP & SUPPORT                                                 */}
      {/* ================================================================== */}

      <Reveal
        shown={revealed}
        reduced={reducedMotion}
        delay={reducedMotion ? 0 : 170}
        as="section"
        className={surfacePadded}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FC] text-[#1261A8]">
              <FileQuestion size={20} aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#062B52]">
                Need Help Finding Your Land Record?
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                If you cannot find your parcel or your document&apos;s survey
                number is blurred, call the Toll-Free Citizen Helpline:{" "}
                <strong className="text-[#062B52]">1800-112-455</strong>{" "}
                (Mon&ndash;Sat 9:00 AM&ndash;6:00 PM) or visit your nearest Revenue
                Camp.
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto">
            <button
              type="button"
              className={`${buttonClass("secondary", "md")} w-full sm:w-auto`}
            >
              <Phone size={14} aria-hidden="true" className="text-[#1261A8]" />
              Citizen Helpline
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/citizen/dashboard" })}
              className={`${buttonClass("primary", "md")} w-full sm:w-auto`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Reveal>

      {/* ================================================================== */}
      {/* CITIZEN PORTAL FOOTER                                               */}
      {/* ================================================================== */}

      <footer className="border-t border-[#D9E2EC] pt-5 text-center text-xs leading-relaxed text-slate-500">
        <p>
          &copy; Directorate of Land Records &amp; Surveys, ZameenAI Citizen
          Cadastre
        </p>

        <p className="mt-1 inline-flex items-center gap-1.5 font-medium text-emerald-700">
          <ShieldCheck size={13} aria-hidden="true" />
          Official Government Land Records Portal
        </p>
      </footer>
    </PageContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* REVEAL — subtle fade-up, disabled under prefers-reduced-motion            */
/* -------------------------------------------------------------------------- */

function Reveal({
  shown,
  reduced,
  delay = 0,
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  shown: boolean;
  reduced: boolean;
  delay?: number;
  as?: "div" | "section";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: reduced
          ? "none"
          : `opacity 400ms ease-out ${delay}ms, transform 400ms ease-out ${delay}ms`,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* FORM FIELDS                                                                */
/* -------------------------------------------------------------------------- */

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-[#062B52]"
      >
        {label}
      </label>

      <div className="relative min-w-0">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} h-11 cursor-pointer appearance-none pr-9 font-semibold`}
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onEnter,
  icon,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-[#062B52]"
      >
        {label}
      </label>

      <div className="relative min-w-0">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>

        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEnter();
          }}
          className={`${fieldClass} h-11 pl-10 ${value ? "pr-10" : "pr-3"}`}
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8]"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
