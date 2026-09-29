import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  MapPin,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  ArrowLeft,
  CornerDownLeft,
} from "lucide-react";
import {
  useCitizenProfile,
  useCitizenNotifications,
} from "../../services/citizen";
import { citizenInfo } from "../../utils/gisMockData";
import zameenLogo from "../../../assets/logo.png";

interface TopBarProps {
  onMenuClick?: () => void;
}

type SearchCategory = "all" | "land" | "notice" | "document" | "tool";

interface SearchCategoryFilter {
  id: SearchCategory;
  label: string;
}

const CATEGORY_FILTERS: SearchCategoryFilter[] = [
  { id: "all", label: "All Records" },
  { id: "land", label: "Land Parcels" },
  { id: "notice", label: "Gazette Notices" },
  { id: "document", label: "Certified RoRs" },
  { id: "tool", label: "Citizen Services" },
];

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<SearchCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Authenticated citizen profile
  const { data: profile } = useCitizenProfile();
  const citizenName = profile?.name || citizenInfo.name;
  const village = profile?.village || citizenInfo.village;

  // Real citizen notifications
  const { data: notifications = [] } = useCitizenNotifications();
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Initials for avatar
  const initials =
    citizenName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CK";

  // Focus search input when search is opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        if (window.innerWidth >= 768) {
          searchInputRef.current?.focus();
        } else {
          mobileInputRef.current?.focus();
        }
      }, 50);
    }
  }, [searchOpen]);

  // Handle global click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(target)
      ) {
        setSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setSearchOpen(false);
      }
      // Shortcut Ctrl+K / Cmd+K or "/" to toggle search
      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    navigate({ to: "/" });
  };

  // Authoritative Searchable Government Records
  const searchableRecords = [
    {
      id: "khasra-342-1",
      type: "land" as const,
      categoryLabel: "Land Parcel",
      title: "Khasra 342/1 — Agricultural Land (Tehsil Sadar)",
      sub: "1.45 Hectares • Haripur Village • Khata No. 892 • Mutated 2021",
      tag: "Clear Title",
      tagVariant: "emerald" as const,
      href: "/citizen/land-details" as const,
      icon: MapPin,
    },
    {
      id: "khasra-342-2",
      type: "land" as const,
      categoryLabel: "Land Parcel",
      title: "Khasra 342/2 — Land Acquisition Section 11 Notification",
      sub: "0.85 Hectares • NH-31 Widening Corridor • Under Verification",
      tag: "Section 11 Active",
      tagVariant: "amber" as const,
      href: "/citizen/my-land-map" as const,
      icon: AlertCircle,
    },
    {
      id: "khasra-108-4",
      type: "land" as const,
      categoryLabel: "Land Parcel",
      title: "Khasra 108/4 — Commercial / Abadi Land",
      sub: "0.22 Hectares • Haripur Industrial Peripheral • Khata No. 411",
      tag: "Verified",
      tagVariant: "sky" as const,
      href: "/citizen/my-land" as const,
      icon: MapPin,
    },
    {
      id: "gazette-nh31",
      type: "notice" as const,
      categoryLabel: "Gazette Notice",
      title: "Gazette Notification No. LA-2026-442 (NH-31 Widening)",
      sub: "Section 11(1) Preliminary Notice • Objections window open",
      tag: "Claims Open",
      tagVariant: "amber" as const,
      href: "/citizen/dashboard" as const,
      icon: Info,
    },
    {
      id: "gazette-haripur-sec19",
      type: "notice" as const,
      categoryLabel: "Gazette Notice",
      title: "Public Notice: Section 19 Declaration (Haripur Bypass)",
      sub: "Collectorate Sadar • Rehabilitation & Resettlement Scheme Approved",
      tag: "Published",
      tagVariant: "slate" as const,
      href: "/citizen/acquisition-status" as const,
      icon: Info,
    },
    {
      id: "ror-342-1",
      type: "document" as const,
      categoryLabel: "Certified Record",
      title: "Certified RoR Khatauni (Khasra 342/1)",
      sub: "Department of Revenue • Digitally Signed 2026 • Barcode Verified",
      tag: "DigiLocker Certified",
      tagVariant: "emerald" as const,
      href: "/citizen/my-land" as const,
      icon: FileText,
    },
    {
      id: "mutation-cert",
      type: "document" as const,
      categoryLabel: "Certified Record",
      title: "Land Mutation Certificate No. MC-2021-8921",
      sub: "Tehsildar Sadar Court • Succession Title Sanctioned",
      tag: "Official Certificate",
      tagVariant: "sky" as const,
      href: "/citizen/my-land" as const,
      icon: FileText,
    },
    {
      id: "cadastral-gis",
      type: "tool" as const,
      categoryLabel: "GIS Portal",
      title: "Cadastral GIS Map & Satellite Parcel Overlay",
      sub: "High-resolution parcel boundaries & acquisition corridor heatmaps",
      tag: "Interactive GIS",
      tagVariant: "blue" as const,
      href: "/citizen/my-land-map" as const,
      icon: ExternalLink,
    },
    {
      id: "ai-scanner",
      type: "tool" as const,
      categoryLabel: "Citizen Service",
      title: "Digitize Land Document / RoR Deed",
      sub: "AI-assisted OCR scanner & cadastral registry alignment",
      tag: "AI Assisted",
      tagVariant: "blue" as const,
      href: "/citizen/digitalizations" as const,
      icon: ExternalLink,
    },
    {
      id: "claim-filing",
      type: "tool" as const,
      categoryLabel: "Citizen Service",
      title: "File Land Acquisition Claim or Objection (Form 3A)",
      sub: "Submit compensation claims directly to Land Acquisition Officer",
      tag: "Online Submission",
      tagVariant: "emerald" as const,
      href: "/citizen/land-acquisition" as const,
      icon: ExternalLink,
    },
  ];

  // Quick frequent searches
  const quickSuggestions = [
    { label: "Khasra 342/1", query: "342/1" },
    { label: "NH-31 Notice", query: "NH-31" },
    { label: "RoR Khatauni", query: "Khatauni" },
    { label: "GIS Cadastre", query: "GIS" },
    { label: "Section 11", query: "Section 11" },
  ];

  const filteredSearch = searchableRecords.filter((record) => {
    const matchesCategory =
      selectedCategory === "all" || record.type === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      record.title.toLowerCase().includes(query) ||
      record.sub.toLowerCase().includes(query) ||
      record.tag.toLowerCase().includes(query) ||
      record.categoryLabel.toLowerCase().includes(query)
    );
  });

  const getTagClasses = (
    variant: "emerald" | "amber" | "sky" | "blue" | "slate",
  ) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "amber":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "sky":
        return "bg-sky-50 text-sky-700 border-sky-200/80";
      case "blue":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "slate":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200/80";
    }
  };

  const getIconWrapperClasses = (
    variant: "emerald" | "amber" | "sky" | "blue" | "slate",
  ) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200/60";
      case "amber":
        return "bg-amber-50 text-amber-600 border border-amber-200/60";
      case "sky":
        return "bg-sky-50 text-sky-600 border border-sky-200/60";
      case "blue":
        return "bg-blue-50 text-blue-600 border border-blue-200/60";
      case "slate":
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200/60";
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-amber-100 text-slate-900 font-semibold px-0.5 rounded"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSearch.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSearch.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSearch[selectedIndex]) {
        navigate({ to: filteredSearch[selectedIndex].href });
        setSearchOpen(false);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-[1100] h-[72px] border-b border-[#E2E8F0] bg-white shadow-xs">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-7 gap-2 sm:gap-4">
        {/* ================================================================ */}
        {/* LEFT SECTION: BRANDING & PORTAL IDENTITY                          */}
        {/* ================================================================ */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open navigation sidebar"
          >
            <Menu size={22} />
          </button>

          {/* Official Logo & Portal Title */}
          <Link
            to="/citizen/dashboard"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg p-0.5"
          >
            <img
              src={zameenLogo}
              alt="ZameenAI National Land Portal Emblem"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain shrink-0 rounded-md transition-transform duration-150 group-hover:scale-[1.02]"
            />

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[19px] sm:text-[21px] font-extrabold tracking-tight text-[#062B52] leading-tight">
                  Zameen<span className="text-[#1D4ED8]">AI</span>
                </span>
              </div>
              <span className="hidden md:block text-[11px] font-medium text-slate-500 leading-none mt-0.5">
                Bringing Clarity to Land Acquisition and Records
              </span>
            </div>
          </Link>
        </div>

        {/* ================================================================ */}
        {/* CENTER SECTION: RESPONSIVE OFFICIAL SEARCH BAR (DESKTOP & TABLET) */}
        {/* ================================================================ */}
        <div
          ref={searchRef}
          className="relative hidden md:flex flex-1 items-center max-w-sm lg:max-w-xl xl:max-w-2xl mx-2 lg:mx-6"
        >
          <div
            className={`group flex h-10 w-full items-center rounded-lg border transition-all duration-150 ${
              searchOpen
                ? "border-[#1261A8] bg-white ring-2 ring-[#1261A8]/15 shadow-sm"
                : "border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-slate-100/70"
            }`}
          >
            {/* Left Icon with subtle government status */}
            <div className="flex items-center pl-3 pr-2 text-slate-400 group-hover:text-slate-600 transition-colors">
              <Search
                size={16}
                className={searchOpen ? "text-[#1261A8]" : "text-slate-400"}
              />
            </div>

            {/* Direct Interactive Input */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!searchOpen) setSearchOpen(true);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDownSearch}
              placeholder="Search land records, Khasra / Khatauni, gazette notices, documents..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none placeholder:truncate"
              aria-label="Search government land cadastre and notices"
            />

            {/* Right Controls: Clear button + Keyboard shortcut badge */}
            <div className="flex items-center gap-1.5 pr-2.5 shrink-0">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </div>
          </div>

          {/* Desktop Command Palette / Results Dropdown */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Category Filter Pills Header */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50/70 overflow-x-auto scrollbar-none">
                {CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      selectedCategory === cat.id
                        ? "bg-[#062B52] text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quick Suggestions (when query empty) */}
              {!searchQuery.trim() && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      Quick Searches:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {quickSuggestions.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchQuery(s.query);
                            setSelectedIndex(0);
                          }}
                          className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Results List */}
              <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 p-1.5">
                {filteredSearch.length > 0 ? (
                  filteredSearch.map((record, index) => {
                    const Icon = record.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <Link
                        key={record.id}
                        to={record.href}
                        onClick={() => setSearchOpen(false)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex items-start gap-3 p-2.5 rounded-lg text-left transition ${
                          isSelected
                            ? "bg-sky-50/70 border-l-2 border-[#1261A8]"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${getIconWrapperClasses(
                            record.tagVariant,
                          )}`}
                        >
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {record.categoryLabel}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getTagClasses(
                                record.tagVariant,
                              )}`}
                            >
                              {record.tag}
                            </span>
                          </div>
                          <p
                            className={`text-xs font-semibold truncate mt-0.5 ${
                              isSelected
                                ? "text-[#1261A8]"
                                : "text-slate-800 group-hover:text-[#1261A8]"
                            }`}
                          >
                            {highlightMatch(record.title, searchQuery)}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {highlightMatch(record.sub, searchQuery)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="self-center pl-1 text-[#1261A8] opacity-80 shrink-0">
                            <CornerDownLeft size={13} />
                          </div>
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <div className="py-8 text-center px-4">
                    <AlertCircle
                      size={22}
                      className="mx-auto text-slate-300 mb-1.5"
                    />
                    <p className="text-xs font-semibold text-slate-700">
                      No matching records found for "{searchQuery}"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try searching by Khasra number, Tehsil name, or Gazette
                      ID.
                    </p>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      }}
                      className="mt-2 text-xs font-medium text-sky-700 hover:underline"
                    >
                      Clear search query
                    </button>
                  </div>
                )}
              </div>

              {/* Official Directory Footer */}
              <div className="border-t border-slate-100 bg-slate-50/90 px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px] shadow-2xs">
                      ↑↓
                    </kbd>
                    <span>navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px] shadow-2xs">
                      ↵
                    </kbd>
                    <span>select</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-[9px] shadow-2xs">
                      esc
                    </kbd>
                    <span>close</span>
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[#062B52] font-semibold text-[10.5px]">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  Official Land Cadastre
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* RIGHT SECTION: NOTIFICATIONS, PROFILE & MOBILE SEARCH TRIGGER     */}
        {/* ================================================================ */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Search Trigger Button (Only visible on < md screens) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1261A8]/30 md:hidden"
            aria-label="Search land records"
          >
            <Search size={17} className="text-slate-500" />
            <span className="hidden xs:inline text-[11px] text-slate-500">
              Search
            </span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#062B52]">
                      Official Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">Updates</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 text-left transition hover:bg-slate-50 ${
                          item.unread ? "bg-sky-50/40" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              item.type === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : item.type === "success"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            !
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-xs font-semibold text-slate-800">
                                {item.title}
                              </p>
                              <span className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400">
                                <Clock size={10} />
                                {item.time}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications available.
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 text-center">
                  <Link
                    to="/citizen/dashboard"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline"
                  >
                    View All Notice Gazettes →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden h-7 w-px bg-slate-200 sm:block mx-1" />

          {/* Citizen Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 p-1.5 pr-2.5 transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-expanded={profileOpen}
              aria-label="Citizen user menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F1FF] text-[#1D4ED8] font-bold text-xs border border-sky-200">
                {initials}
              </div>

              <div className="hidden text-left sm:block">
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-xs font-bold text-[#062B52]">
                    Citizen
                  </span>
                  <CheckCircle2
                    size={11}
                    className="text-emerald-500 shrink-0"
                  />
                </div>
                <span className="text-[10.5px] font-medium text-slate-500 leading-none">
                  Landowner
                </span>
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${
                  profileOpen ? "rotate-180 text-sky-600" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                {/* User Identity Details */}
                <div className="border-b border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F1FF] text-[#1D4ED8] font-bold text-xs border border-sky-200">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {citizenName}
                      </p>
                      <p className="truncate text-[10.5px] text-slate-500">
                        {village} • Sadar Tehsil
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between rounded-md bg-white border border-slate-200/80 px-2 py-1 text-[10.5px]">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <ShieldCheck size={12} /> Aadhaar e-KYC Verified
                    </span>
                    <span className="font-mono text-slate-400">•••• 8921</span>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="py-1">
                  <Link
                    to="/citizen/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                  >
                    <User size={15} className="text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/citizen/dashboard"
                    onClick={() => {
                      setProfileOpen(false);
                      const el = document.getElementById("recent-activity");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                  >
                    <Clock size={15} className="text-slate-400" />
                    <span>My Activity</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setNotificationsOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                  >
                    <Settings size={15} className="text-slate-400" />
                    <span>Notification Preferences</span>
                  </button>

                  <Link
                    to="/citizen/dashboard"
                    onClick={() => {
                      setProfileOpen(false);
                      const el = document.getElementById("help-support");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-sky-700"
                  >
                    <Info size={15} className="text-slate-400" />
                    <span>Help & Support</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="border-t border-slate-100 p-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE SEARCH FULL-VIEWPORT OVERLAY (< md)                       */}
      {/* ================================================================ */}
      {searchOpen && (
        <div
          ref={mobileSearchRef}
          className="fixed inset-0 z-[1300] bg-white md:hidden flex flex-col"
        >
          {/* Mobile Top Search Bar */}
          <div className="flex h-[72px] items-center gap-2 border-b border-slate-200 px-3.5 bg-white shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition"
              aria-label="Close search"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDownSearch}
                placeholder="Search Khasra, Notice, Document..."
                className="w-full h-10 rounded-lg border border-slate-300 bg-slate-50/90 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#1261A8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1261A8]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Dropdown Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-50/50">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                    selectedCategory === cat.id
                      ? "bg-[#062B52] text-white border-[#062B52] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick Suggestions (if query empty) */}
            {!searchQuery.trim() && (
              <div className="mt-3 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Frequently Searched Records
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickSuggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setSearchQuery(s.query);
                        setSelectedIndex(0);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="mt-3 space-y-2 pb-8">
              {filteredSearch.length > 0 ? (
                filteredSearch.map((record, index) => {
                  const Icon = record.icon;
                  return (
                    <Link
                      key={record.id}
                      to={record.href}
                      onClick={() => setSearchOpen(false)}
                      className={`block p-3 rounded-xl border bg-white shadow-2xs transition active:scale-[0.99] ${
                        index === selectedIndex
                          ? "border-[#1261A8] ring-1 ring-[#1261A8]/20"
                          : "border-slate-200/90 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getIconWrapperClasses(
                            record.tagVariant,
                          )}`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {record.categoryLabel}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getTagClasses(
                                record.tagVariant,
                              )}`}
                            >
                              {record.tag}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs font-bold text-slate-900 leading-snug">
                            {highlightMatch(record.title, searchQuery)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                            {highlightMatch(record.sub, searchQuery)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <AlertCircle
                    size={24}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  <p className="text-xs font-semibold text-slate-700">
                    No official records matching "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Try searching by Khasra number, Tehsil name, or Gazette
                    notification ID.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-medium text-sky-700 hover:underline"
                  >
                    Clear search query
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
