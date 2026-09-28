import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  code?: string;
}

export interface SearchableComboboxProps {
  id?: string;
  label: string;
  value: string;
  options: (string | ComboboxOption)[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export default function SearchableCombobox({
  id: explicitId,
  label,
  value,
  options,
  placeholder = "Select...",
  searchPlaceholder,
  disabled = false,
  disabledPlaceholder,
  loading = false,
  loadingMessage,
  emptyMessage = "No locations found",
  onChange,
  onClear,
  className = "",
}: SearchableComboboxProps) {
  const autoId = useId();
  const id = explicitId || autoId;
  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Normalize options to { value, label, code }
  const normalizedOptions = useMemo<ComboboxOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected label lookup
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(
      (opt) =>
        opt.value.toLowerCase() === value.toLowerCase() ||
        opt.label.toLowerCase() === value.toLowerCase(),
    );
  }, [normalizedOptions, value]);

  const displayValue = selectedOption ? selectedOption.label : value;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedOptions;

    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchValue = opt.value.toLowerCase().includes(query);
      const matchCode = opt.code
        ? opt.code.toLowerCase().includes(query)
        : false;
      return matchLabel || matchValue || matchCode;
    });
  }, [normalizedOptions, searchQuery]);

  // Limit rendered items for maximum performance (virtual slice)
  const renderedOptions = useMemo(() => {
    return filteredOptions.slice(0, 100);
  }, [filteredOptions]);

  // Reset search and highlight when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const idx = normalizedOptions.findIndex(
        (opt) => opt.value.toLowerCase() === value.toLowerCase(),
      );
      setHighlightedIndex(idx >= 0 ? Math.min(idx, 99) : 0);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    } else {
      setSearchQuery("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Adjust highlighted index when searching
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
    }
  }, [searchQuery, isOpen]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange("");
    }
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (renderedOptions.length === 0) return -1;
          const next = prev + 1;
          return next >= renderedOptions.length ? 0 : next;
        });
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (renderedOptions.length === 0) return -1;
          const next = prev - 1;
          return next < 0 ? renderedOptions.length - 1 : next;
        });
        break;

      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < renderedOptions.length
        ) {
          handleSelect(renderedOptions[highlightedIndex].value);
        } else if (renderedOptions.length > 0) {
          handleSelect(renderedOptions[0].value);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerButtonRef.current?.focus();
        break;

      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const effectivePlaceholder = disabled
    ? disabledPlaceholder || placeholder
    : placeholder;

  const defaultSearchPlaceholder = `Search ${label.toLowerCase()}...`;
  const effectiveSearchPlaceholder =
    searchPlaceholder || defaultSearchPlaceholder;

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      {/* Label */}
      <label
        id={labelId}
        htmlFor={`${id}-trigger`}
        className="mb-1.5 block text-xs font-semibold text-[#062B52]"
      >
        {label}
      </label>

      {/* Trigger Button */}
      <div className="relative min-w-0">
        <button
          ref={triggerButtonRef}
          id={`${id}-trigger`}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-labelledby={labelId}
          disabled={disabled}
          onClick={handleTriggerClick}
          onKeyDown={handleKeyDown}
          className={`flex h-11 w-full min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8] ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              : isOpen
                ? "border-[#1261A8] bg-white text-[#062B52] shadow-sm ring-1 ring-[#1261A8]"
                : "border-[#D9E2EC] bg-white text-[#062B52] hover:border-slate-300"
          }`}
        >
          <span className="truncate pr-2">
            {displayValue || (
              <span className="font-normal text-slate-400">
                {effectivePlaceholder}
              </span>
            )}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {loading && (
              <Loader2
                size={14}
                aria-hidden="true"
                className="animate-spin text-[#1261A8]"
              />
            )}

            {!disabled && Boolean(value) && (
              <button
                type="button"
                aria-label={`Clear selected ${label}`}
                onClick={handleClear}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}

            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`transition-transform duration-150 ${
                disabled ? "text-slate-300" : "text-slate-400"
              } ${isOpen ? "rotate-180 text-[#1261A8]" : ""}`}
            />
          </div>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-[#D9E2EC] bg-white shadow-lg ring-1 ring-black/5"
            style={{ minWidth: "100%" }}
          >
            {/* Search Input Container */}
            <div className="border-b border-[#D9E2EC] p-2">
              <div className="relative flex items-center">
                <Search
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  placeholder={effectiveSearchPlaceholder}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8.5 w-full rounded-md border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-7 text-xs text-[#062B52] placeholder-slate-400 focus:border-[#1261A8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1261A8]"
                  aria-label={effectiveSearchPlaceholder}
                  autoComplete="off"
                  spellCheck="false"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={labelId}
              className="max-h-56 overflow-y-auto p-1 text-xs focus:outline-none"
              tabIndex={-1}
            >
              {loading ? (
                <li className="flex items-center justify-center gap-2 py-5 text-slate-500">
                  <Loader2 size={15} className="animate-spin text-[#1261A8]" />
                  <span>
                    {loadingMessage || `Loading ${label.toLowerCase()}...`}
                  </span>
                </li>
              ) : renderedOptions.length === 0 ? (
                <li className="py-6 text-center text-slate-500">
                  <p className="font-medium text-[#062B52]">{emptyMessage}</p>
                  {searchQuery && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      No matches for &ldquo;{searchQuery}&rdquo;
                    </p>
                  )}
                </li>
              ) : (
                renderedOptions.map((opt, index) => {
                  const isSelected =
                    opt.value.toLowerCase() === value.toLowerCase() ||
                    opt.label.toLowerCase() === value.toLowerCase();
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={opt.value}
                      id={`${id}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(opt.value)}
                      className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors duration-100 ${
                        isHighlighted
                          ? "bg-[#EAF3FC] text-[#1261A8] font-semibold"
                          : isSelected
                            ? "bg-slate-50 text-[#062B52] font-semibold"
                            : "text-[#062B52] hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && (
                        <Check
                          size={14}
                          aria-hidden="true"
                          className="shrink-0 text-[#1261A8]"
                        />
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Indicator if results exceed rendered slice */}
            {filteredOptions.length > renderedOptions.length && (
              <div className="border-t border-slate-100 px-3 py-1.5 text-center text-[10px] text-slate-400">
                Showing top {renderedOptions.length} of {filteredOptions.length}{" "}
                locations. Type to narrow search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
