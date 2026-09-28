import React, { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { AcquisitionCase } from "../../../services/acquisition";
import StatusBadge from "../../common/StatusBadge";

interface AcquisitionCaseHeaderProps {
  cases: AcquisitionCase[];
  selectedCase: AcquisitionCase;
  onSelectCase: (caseItem: AcquisitionCase) => void;
}

export const AcquisitionCaseHeader: React.FC<AcquisitionCaseHeaderProps> = ({
  cases,
  selectedCase,
  onSelectCase,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hasMultipleCases = cases.length > 1;

  return (
    <section
      aria-label="Acquisition Case Identity"
      className="rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs relative"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left Side: Case Identity & Hierarchy */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              YOUR ACQUISITION CASE
            </span>
            <span className="text-slate-300">•</span>
            <StatusBadge status={selectedCase.statusLabel || "In Progress"} />
          </div>

          {/* Project Title (Primary Hierarchy) */}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#062B52] leading-snug">
            {selectedCase.projectTitle}
          </h2>

          {/* Land Parcel + Location (Secondary Hierarchy) */}
          <p className="text-sm sm:text-base font-semibold text-[#1261A8] flex flex-wrap items-center gap-1.5">
            <span>{selectedCase.khasraNumber}</span>
            <span className="text-slate-300">•</span>
            <span>{selectedCase.area}</span>
            <span className="text-slate-300">•</span>
            <span>
              {selectedCase.village}, {selectedCase.district}
            </span>
          </p>

          {/* Case ID and Authority (Secondary Metadata Row) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
            <span>
              Case ID:{" "}
              <strong className="font-mono text-slate-700">{selectedCase.id}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="truncate max-w-md">
              Acquiring Authority:{" "}
              <span className="text-slate-700 font-medium">
                {selectedCase.acquiringAuthority}
              </span>
            </span>
          </div>
        </div>

        {/* Right Side: Switch Case Button & Dropdown */}
        {hasMultipleCases && (
          <div className="relative shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              className="inline-flex min-h-[40px] items-center justify-between gap-2 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] px-3.5 py-2 text-xs font-semibold text-[#062B52] transition hover:bg-slate-100 hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-[#1261A8]"
            >
              <span>Switch Case ({cases.length})</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-72 sm:w-80 rounded-xl border border-[#D9E2EC] bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95">
                <span className="block px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Land Parcel Case
                </span>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {cases.map((c) => {
                    const isSelected = c.id === selectedCase.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onSelectCase(c);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full flex-col items-start rounded-lg p-2.5 text-left text-xs transition ${
                          isSelected
                            ? "bg-[#EAF3FC] text-[#1261A8]"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-bold">{c.id}</span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-[#1261A8]" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#062B52] truncate max-w-full">
                          {c.projectTitle}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {c.khasraNumber} • {c.area} • {c.village}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AcquisitionCaseHeader;
