import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Compass,
  Crosshair,
  FileText,
  Info,
  LandPlot,
  Layers3,
  Map,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { ReactNode } from "react";

import "leaflet/dist/leaflet.css";

import L from "leaflet";

import MapPanControl from "./MapPanControl";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SearchType = "survey" | "khasra" | "plot" | "dag";

type ParcelStatus = "acquisition" | "clear" | "review";

interface LandParcel {
  id: number;
  survey: string;
  khasra: string;
  dag: string;
  area: string;
  mouza: string;
  tehsil: string;
  district: string;
  classification: string;
  owner: string;
  status: ParcelStatus;
  statusLabel: string;
  match: string;
  center: [number, number];
  polygon: [number, number][];
}

/* -------------------------------------------------------------------------- */
/* MOCK DATA                                                                  */
/* -------------------------------------------------------------------------- */

const parcels: LandParcel[] = [
  {
    id: 1025,
    survey: "SV-1025",
    khasra: "KH-458",
    dag: "DG-782",
    area: "2.00 Acres",
    mouza: "Haripur",
    tehsil: "Singur",
    district: "Hooghly",
    classification: "Agricultural (Fasli)",
    owner: "Ramesh K. Sharma",
    status: "acquisition",
    statusLabel: "Under Acquisition (NH-31)",
    match: "Primary Match",
    center: [22.815, 88.229],
    polygon: [
      [22.819, 88.222],
      [22.821, 88.231],
      [22.814, 88.235],
      [22.81, 88.227],
    ],
  },
  {
    id: 1024,
    survey: "SV-1024",
    khasra: "KH-342/1",
    dag: "DG-765",
    area: "1.50 Acres",
    mouza: "Haripur",
    tehsil: "Singur",
    district: "Hooghly",
    classification: "Agricultural (Shali)",
    owner: "Ramesh K. Sharma",
    status: "clear",
    statusLabel: "Safe / Clear Title",
    match: "Adjacent Plot",
    center: [22.808, 88.22],
    polygon: [
      [22.812, 88.214],
      [22.814, 88.223],
      [22.806, 88.227],
      [22.802, 88.218],
    ],
  },
  {
    id: 1089,
    survey: "SV-1089",
    khasra: "KH-118",
    dag: "DG-811",
    area: "0.75 Acres",
    mouza: "Kalyanpur",
    tehsil: "Singur",
    district: "Hooghly",
    classification: "Residential (Bastu)",
    owner: "Ramesh K. Sharma",
    status: "review",
    statusLabel: "Under Routine Review",
    match: "Partial Match",
    center: [22.824, 88.243],
    polygon: [
      [22.829, 88.237],
      [22.831, 88.246],
      [22.823, 88.25],
      [22.819, 88.241],
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* LEAFLET ICON                                                               */
/* -------------------------------------------------------------------------- */

const markerIcon = L.divIcon({
  className: "custom-land-marker",
  html: `
    <div
      style="
        width:34px;
        height:34px;
        border-radius:50% 50% 50% 0;
        background:#003b5c;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 3px 12px rgba(0,0,0,.35);
        display:flex;
        align-items:center;
        justify-content:center;
      "
    >
      <div
        style="
          width:9px;
          height:9px;
          border-radius:50%;
          background:white;
        "
      ></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

/* -------------------------------------------------------------------------- */
/* MAP CONTROLLER                                                             */
/* -------------------------------------------------------------------------- */

function MapController({ selected }: { selected: LandParcel | null }) {
  const map = useMap();

  const goToSelected = () => {
    if (!selected) return;

    map.flyTo(selected.center, 15, {
      animate: true,
      duration: 0.7,
    });
  };

  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-lg">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="flex h-10 w-10 items-center justify-center border-b border-slate-200 text-slate-700 transition hover:bg-slate-100"
        title="Zoom in"
      >
        <ZoomIn size={18} />
      </button>

      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="flex h-10 w-10 items-center justify-center border-b border-slate-200 text-slate-700 transition hover:bg-slate-100"
        title="Zoom out"
      >
        <ZoomOut size={18} />
      </button>

      <button
        type="button"
        onClick={goToSelected}
        className="flex h-10 w-10 items-center justify-center border-b border-slate-200 text-slate-700 transition hover:bg-slate-100"
        title="Center parcel"
      >
        <Crosshair size={18} />
      </button>

      <button
        type="button"
        onClick={() =>
          map.setView([22.815, 88.229], 12, {
            animate: true,
          })
        }
        className="flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-slate-100"
        title="Reset map"
      >
        <RotateCcw size={17} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAP CLICK HANDLER                                                          */
/* -------------------------------------------------------------------------- */

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onLocationSelect(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      );
    },
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* STATUS HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function statusClasses(status: ParcelStatus) {
  switch (status) {
    case "acquisition":
      return {
        badge: "bg-[#ffe2bd] text-[#7a4300]",
        dot: "bg-[#d99125]",
        fill: "#d99125",
        border: "#8a540d",
      };

    case "review":
      return {
        badge: "bg-[#fff0bd] text-[#6e5100]",
        dot: "bg-[#e5a000]",
        fill: "#e5a000",
        border: "#9b7200",
      };

    default:
      return {
        badge: "bg-[#d9f4df] text-[#17652c]",
        dot: "bg-[#2c8a4b]",
        fill: "#2c8a4b",
        border: "#1f6938",
      };
  }
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function FindMyLand() {
  const navigate = useNavigate();

  const [searchType, setSearchType] = useState<SearchType>("survey");

  const [searchValue, setSearchValue] = useState("SV-1025");

  const [village, setVillage] = useState("West Bengal");

  const [district, setDistrict] = useState("Hooghly");

  const [block, setBlock] = useState("Haripur (Singur)");

  const [searched, setSearched] = useState(true);

  const [selectedParcel, setSelectedParcel] = useState<LandParcel>(parcels[0]);

  const [clickedLocation, setClickedLocation] = useState<
    [number, number] | null
  >(null);

  /* ---------------------------------------------------------------------- */
  /* FILTER PARCELS                                                         */
  /* ---------------------------------------------------------------------- */

  const filteredParcels = useMemo(() => {
    if (!searched) return [];

    const value = searchValue.trim().toLowerCase();

    if (!value) return parcels;

    return parcels.filter((parcel) => {
      if (searchType === "survey") {
        return parcel.survey.toLowerCase().includes(value);
      }

      if (searchType === "khasra") {
        return parcel.khasra.toLowerCase().includes(value);
      }

      if (searchType === "plot") {
        return String(parcel.id).includes(value);
      }

      return parcel.dag.toLowerCase().includes(value);
    });
  }, [searched, searchType, searchValue]);

  /* ---------------------------------------------------------------------- */
  /* SEARCH                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleSearch = () => {
    setSearched(true);

    const first = filteredParcels[0] ?? parcels[0];

    setSelectedParcel(first);
  };

  /* ---------------------------------------------------------------------- */
  /* CLEAR                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleClear = () => {
    setSearchValue("");
    setSearched(false);
    setSelectedParcel(parcels[0]);
    setClickedLocation(null);
  };

  /* ---------------------------------------------------------------------- */
  /* SELECT PARCEL                                                          */
  /* ---------------------------------------------------------------------- */

  const handleParcelSelect = (parcel: LandParcel) => {
    setSelectedParcel(parcel);
  };

  /* ---------------------------------------------------------------------- */
  /* VIEW DETAILS                                                           */
  /* ---------------------------------------------------------------------- */

  const handleViewDetails = (parcel: LandParcel) => {
    navigate({
      to: "/citizen/land-details",
      search: {
        parcel: String(parcel.id),
      },
    });
  };

  /* ---------------------------------------------------------------------- */
  /* FULL MAP                                                               */
  /* ---------------------------------------------------------------------- */

  const handleFullMap = () => {
    navigate({
      to: "/citizen/my-land-map",
      search: {
        parcel: String(selectedParcel.id),
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#082f49]">
      {/* ================================================================== */}
      {/* TOP HEADER                                                         */}
      {/* ================================================================== */}

      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs text-slate-600">
            <div>
              My Land <span className="mx-1">›</span>{" "}
              <span className="font-semibold text-[#082f49]">Find My Land</span>
            </div>

            <div className="hidden items-center gap-5 md:flex">
              <button
                type="button"
                className="flex items-center gap-1.5 font-medium hover:text-[#003b5c]"
              >
                <BookOpen size={14} />
                Need help finding numbers? View Guide
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 hover:text-[#003b5c]"
              >
                <RotateCcw size={14} />
                Reset Search
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#062f4f] sm:text-3xl">
                  Find My Land
                </h1>

                <span className="rounded bg-[#dbeaf5] px-2 py-1 text-[10px] font-bold tracking-wide text-[#123d59]">
                  CADASTRAL GIS ENGINE V4.2
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-600 sm:text-[15px]">
                Search for your land using the information on your land record,
                khatian, or registered sale deed.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded bg-[#e8f5fc] px-3 py-2 text-xs font-semibold text-[#163d56]">
              <ShieldCheck size={17} className="text-[#24764b]" />
              Directorate of Land Records & Surveys (WB)
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6 lg:px-8">
        {/* ================================================================ */}
        {/* INFORMATION BAR                                                   */}
        {/* ================================================================ */}

        <section className="mb-4 flex flex-col gap-3 rounded border border-[#9bc8e5] bg-[#e5f5fd] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Info size={19} className="mt-0.5 shrink-0 text-[#0b4567]" />

            <p className="text-sm leading-5 text-[#173b50]">
              You can search using any one of your land record identifiers
              below. <strong>No technical GIS knowledge required.</strong>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-[#25834c]" />
            Revenue Sync: Updated Today, 08:30 AM IST
          </div>
        </section>

        {/* ================================================================ */}
        {/* SEARCH CARD                                                        */}
        {/* ================================================================ */}

        <section className="mb-4 rounded border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="text-lg font-bold text-[#073654]">
                Search Land Parcel
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Enter the land record number you have. You only need to provide
                one identifier.
              </p>

              {/* Search Type */}
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Select Identifier Type
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    ["survey", "Survey Number"],
                    ["khasra", "Khasra Number"],
                    ["plot", "Plot Number"],
                    ["dag", "Dag Number"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSearchType(value as SearchType)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        searchType === value
                          ? "bg-[#003b5c] text-white"
                          : "bg-[#e1f1fb] text-[#29495c] hover:bg-[#cfe7f5]"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full border ${
                          searchType === value
                            ? "border-white bg-white"
                            : "border-slate-500"
                        }`}
                      />

                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold text-[#16435e]">
                  {searchType === "survey"
                    ? "Enter Survey Number"
                    : searchType === "khasra"
                      ? "Enter Khasra Number"
                      : searchType === "plot"
                        ? "Enter Plot Number"
                        : "Enter Dag Number"}{" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FileText
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />

                    <input
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch();
                        }
                      }}
                      placeholder={
                        searchType === "survey"
                          ? "e.g. SV-1025"
                          : "Enter number"
                      }
                      className="h-11 w-full border border-slate-300 bg-white pl-10 pr-9 text-sm outline-none transition focus:border-[#00628f] focus:ring-2 focus:ring-[#cce8f5]"
                    />

                    {searchValue && (
                      <button
                        type="button"
                        onClick={() => setSearchValue("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="flex h-11 items-center gap-2 bg-[#003b5c] px-5 text-sm font-bold text-white transition hover:bg-[#005174]"
                  >
                    <Search size={17} />

                    <span className="hidden sm:inline">Find Land</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-11 bg-[#e0f0fa] px-4 text-sm font-semibold text-[#173d55] transition hover:bg-[#cfe7f5]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Where to look */}
            <div>
              <div className="rounded bg-[#e0f1fb] px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#143d56]">
                  <CircleHelp size={16} />
                  Where to look? Top right corner of your Khatian, RoR, or Sale
                  Deed document.
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    Where is your land?{" "}
                    <span className="font-normal">(Optional)</span>
                  </p>

                  <span className="text-[11px] text-slate-500">
                    Leave blank if unknown
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <SelectBox value={village} onChange={setVillage} />

                  <SelectBox value={district} onChange={setDistrict} />

                  <SelectBox value={block} onChange={setBlock} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SEARCH RESULT MESSAGE                                             */}
        {/* ================================================================ */}

        {searched && (
          <section className="mb-4 flex flex-col gap-3 rounded border border-slate-300 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d6f6df]">
                <CheckCircle2 size={22} className="text-[#25834c]" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Land Parcel Located
                </p>

                <p className="text-sm text-slate-600">
                  {filteredParcels.length} registered cadastral records found
                  matching <strong>"{searchValue || "your search"}"</strong> in
                  Haripur Mouza, Hooghly. Primary record{" "}
                  <strong>Parcel #{selectedParcel.id}</strong> is highlighted on
                  the map.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600">
              <Layers3 size={16} />
              Survey Map Sheet #WB-HG-084
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* RESULTS + MAP                                                     */}
        {/* ================================================================ */}

        <section className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* LEFT */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-[#073b5a]">
                Land Parcels Found{" "}
                <span className="rounded-full bg-[#dcecf7] px-2 py-0.5 text-xs">
                  {filteredParcels.length}
                </span>
              </h2>

              <span className="text-[11px] text-slate-500">
                Sorted by relevance
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredParcels.map((parcel, index) => (
                <ParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  active={selectedParcel.id === parcel.id}
                  primary={index === 0}
                  onSelect={() => handleParcelSelect(parcel)}
                  onViewDetails={() => handleViewDetails(parcel)}
                />
              ))}
            </div>

            {/* Browse village */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded bg-[#e0f1fb] px-4 py-3">
              <div className="flex items-center gap-3">
                <Compass size={22} className="shrink-0 text-[#124968]" />

                <div>
                  <p className="text-xs font-bold text-[#143d56]">
                    Search by Village or Map location instead?
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Browse full revenue cadastre sheets by mouza.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="shrink-0 rounded bg-white px-3 py-2 text-xs font-bold text-[#083b58] shadow-sm transition hover:bg-[#f5f9fc]"
              >
                Browse Village
              </button>
            </div>
          </div>

          {/* RIGHT MAP */}
          <div className="min-w-0">
            <div className="relative h-[520px] overflow-hidden rounded border border-slate-300 bg-[#dce7ef] shadow-sm sm:h-[600px] lg:h-[670px]">
              <MapContainer
                center={selectedParcel.center}
                zoom={14}
                minZoom={5}
                maxZoom={20}
                scrollWheelZoom
                dragging
                touchZoom
                doubleClickZoom
                boxZoom
                keyboard
                zoomControl={false}
                attributionControl
                className="absolute inset-0 !h-full !w-full"
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController selected={selectedParcel} />

                <MapClickHandler
                  onLocationSelect={(lat, lng) =>
                    setClickedLocation([lat, lng])
                  }
                />

                {parcels.map((parcel) => {
                  const status = statusClasses(parcel.status);

                  const active = selectedParcel.id === parcel.id;

                  return (
                    <div key={parcel.id}>
                      <Polygon
                        positions={parcel.polygon}
                        pathOptions={{
                          color: active ? "#001f33" : status.border,
                          weight: active ? 3 : 1.5,
                          fillColor: status.fill,
                          fillOpacity: active ? 0.48 : 0.2,
                        }}
                        eventHandlers={{
                          click: () => handleParcelSelect(parcel),
                        }}
                      />

                      <Marker
                        position={parcel.center}
                        icon={markerIcon}
                        eventHandlers={{
                          click: () => handleParcelSelect(parcel),
                        }}
                      >
                        <Popup>
                          <div className="min-w-[190px]">
                            <p className="text-sm font-bold text-[#083b58]">
                              Parcel #{parcel.id}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {parcel.mouza} Mouza • {parcel.tehsil}
                            </p>

                            <div
                              className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${status.badge}`}
                            >
                              {parcel.statusLabel}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleViewDetails(parcel)}
                              className="mt-3 w-full rounded bg-[#003b5c] px-3 py-2 text-xs font-bold text-white"
                            >
                              View Details
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    </div>
                  );
                })}

                {clickedLocation && (
                  <Marker position={clickedLocation}>
                    <Popup>
                      <div className="text-xs">
                        <p className="font-bold">Selected Map Location</p>

                        <p className="mt-1">
                          {clickedLocation[0]}, {clickedLocation[1]}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                <MapPanControl defaultCenter={selectedParcel.center} />
              </MapContainer>

              {/* Map top badges */}
              <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex flex-wrap gap-2">
                <div className="rounded bg-white/95 px-3 py-2 text-xs font-bold text-[#16435e] shadow">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#25834c]" />
                  GPS Cadastre: WGS 84 / UTM Zone 45N
                </div>

                <div className="rounded bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow">
                  Scale 1:2,500
                </div>
              </div>

              {/* Selected parcel label */}
              <div className="absolute bottom-24 left-1/2 z-[1000] -translate-x-1/2">
                <div className="rounded bg-[#003b5c] px-3 py-2 text-xs font-bold text-white shadow-lg">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400" />
                  Parcel #{selectedParcel.id} (Searched)
                </div>
              </div>

              {/* Selected parcel panel */}
              <div className="absolute bottom-3 right-3 z-[1000] w-[min(360px,calc(100%-24px))] rounded-lg border border-slate-200 bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-[#123d59]">
                      <ShieldCheck size={17} className="text-[#99702a]" />
                      Parcel #{selectedParcel.id} Found
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {selectedParcel.mouza} Mouza • {selectedParcel.tehsil},{" "}
                      {selectedParcel.district}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-slate-600">
                    {selectedParcel.area}
                  </span>
                </div>

                {selectedParcel.status === "acquisition" && (
                  <div className="mx-3 mb-3 rounded bg-[#fff0d9] px-3 py-2 text-[11px] font-semibold text-[#744b16]">
                    <AlertTriangle size={13} className="mr-1 inline" />
                    Intersecting NH-31 Acquisition Zone
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleViewDetails(selectedParcel)}
                  className="mx-3 mb-3 flex w-[calc(100%-24px)] items-center justify-center gap-2 rounded bg-[#003b5c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#005174]"
                >
                  View Full Land Details
                  <ArrowRight size={15} />
                </button>

                <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
                  Verified by Directorate of Land Records
                </div>
              </div>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 z-[1000] hidden w-[245px] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg sm:block">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#16435e]">
                  What do parcel colours mean?
                </p>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-medium text-slate-700">
                  <LegendItem color="#25834c" label="Safe / Clear" />

                  <LegendItem color="#e5a000" label="Under Review" />

                  <LegendItem color="#d99125" label="Acquisition" />

                  <LegendItem color="#b91c1c" label="Disputed / Stay" />
                </div>
              </div>

              {/* Map bottom actions */}
              <div className="absolute bottom-0 left-0 right-0 z-[999] flex items-center justify-end gap-2 bg-white/90 px-3 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={handleFullMap}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#073b5a] hover:underline"
                >
                  <Map size={14} />
                  View Full Interactive Map
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* HELP                                                               */}
        {/* ================================================================ */}

        <section className="mt-5 rounded border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#e0f1fb]">
                <FileText size={24} className="text-[#104766]" />
              </div>

              <div>
                <h2 className="text-base font-bold text-[#083b58] sm:text-lg">
                  Need Help Finding Your Land Record?
                </h2>

                <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
                  If you cannot find your parcel or your document's survey
                  number is blurred, call the Toll-Free Citizen Helpline:
                  1800-112-455 (Mon-Sat 9:00 AM–6:00 PM) or visit your nearest
                  Singur Block Revenue Camp.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                className="flex items-center gap-2 bg-[#e0f1fb] px-4 py-3 text-xs font-bold text-[#123d59] transition hover:bg-[#cfe7f5]"
              >
                <Phone size={15} />
                Citizen Help Center
              </button>

              <button
                type="button"
                className="bg-[#003b5c] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#005174]"
              >
                Report Issue
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* FOOTER                                                            */}
        {/* ================================================================ */}

        <div className="flex flex-col gap-2 py-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © Directorate of Land Records & Surveys, Government of West Bengal
          </span>

          <span className="flex items-center gap-1">
            <ShieldCheck size={13} />
            Official Government Land Records Portal
          </span>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SELECT BOX                                                                 */
/* -------------------------------------------------------------------------- */

function SelectBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded border border-transparent bg-[#e0f1fb] px-3 pr-9 text-xs font-semibold text-[#173d55] outline-none transition focus:border-[#7ab2d0]"
      >
        <option>{value}</option>
        <option>West Bengal</option>
        <option>Hooghly</option>
        <option>Singur</option>
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PARCEL CARD                                                                */
/* -------------------------------------------------------------------------- */

function ParcelCard({
  parcel,
  active,
  primary,
  onSelect,
  onViewDetails,
}: {
  parcel: LandParcel;
  active: boolean;
  primary: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}) {
  const status = statusClasses(parcel.status);

  return (
    <article
      className={`overflow-hidden rounded border bg-white transition ${
        active
          ? "border-[#0a3e5c] shadow-md ring-1 ring-[#0a3e5c]"
          : "border-slate-300 shadow-sm hover:border-slate-400 hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#093a59]">
              Parcel #{parcel.id}
            </h3>

            {primary && (
              <span className="rounded bg-[#003b5c] px-2 py-1 text-[10px] font-bold text-white">
                Active Focus
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] font-semibold text-slate-600">
            Mouza: {parcel.mouza} (Jl. No. 42) • Tehsil: {parcel.tehsil}
          </p>
        </div>

        <span
          className={`shrink-0 rounded px-2.5 py-1.5 text-[10px] font-bold ${status.badge}`}
        >
          {parcel.status === "acquisition" && (
            <AlertTriangle size={12} className="mr-1 inline" />
          )}

          {parcel.status === "clear" && (
            <CheckCircle2 size={12} className="mr-1 inline" />
          )}

          {parcel.statusLabel}
        </span>
      </div>

      {/* Main data */}
      <div className="mx-3 mb-3 grid grid-cols-3 divide-x divide-white bg-[#e1f2fb]">
        <DataCell label="Survey No" value={parcel.survey} />

        <DataCell
          label="Khasra / Dag"
          value={`${parcel.khasra} / ${parcel.dag}`}
        />

        <DataCell label="Recorded Area" value={parcel.area} />
      </div>

      {/* Details */}
      <div className="grid gap-x-4 gap-y-2 px-4 pb-3 sm:grid-cols-2">
        <SmallDetail
          icon={<LandPlot size={14} />}
          label="Classification"
          value={parcel.classification}
        />

        <SmallDetail
          icon={<UserRound size={14} />}
          label="Owner"
          value={`${parcel.owner} (1/1)`}
        />

        <SmallDetail
          icon={<FileText size={14} />}
          label="Notification"
          value={
            parcel.status === "acquisition"
              ? "Sec 3A Gazetted"
              : "No Active Notice"
          }
        />

        <SmallDetail
          icon={<ShieldCheck size={14} />}
          label="Title Status"
          value={parcel.status === "clear" ? "Clear" : "Mutation Cleared"}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[#003b5c] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#005174]"
        >
          View Land Details
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex items-center justify-center gap-1.5 rounded bg-[#dceefa] px-3 py-2.5 text-xs font-bold text-[#16445f] transition hover:bg-[#cce5f4]"
        >
          <Map size={14} />
          Map Centered
        </button>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* DATA CELL                                                                  */
/* -------------------------------------------------------------------------- */

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-600">{label}</p>

      <p className="mt-0.5 truncate text-xs font-bold text-[#073b5a]">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SMALL DETAIL                                                               */
/* -------------------------------------------------------------------------- */

function SmallDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-1.5 text-[11px] leading-4">
      <span className="mt-0.5 shrink-0 text-[#16435e]">{icon}</span>

      <div>
        <span className="font-semibold text-slate-600">{label}:</span>{" "}
        <span className="font-medium text-slate-700">{value}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LEGEND                                                                     */
/* -------------------------------------------------------------------------- */

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: color,
        }}
      />

      {label}
    </div>
  );
}
