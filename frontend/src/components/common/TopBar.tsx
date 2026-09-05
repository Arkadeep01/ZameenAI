import React, { useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";

interface TopBarProps {
  onMenuClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Hamburger — visible below lg breakpoint */}
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={21} />
          </button>

          {/* ZameenAI Brand (moved here from sidebar) */}
          <div className="flex items-center gap-2">
            <img
              src="/assets/favicon.png"
              alt="ZameenAI"
              className="h-8 w-8 object-contain"
            />

            <div className="leading-tight">
              <div className="flex items-baseline">
                <span className="text-lg font-bold tracking-tight text-[#111827]">
                  Zameen
                </span>
                <span className="text-lg font-bold tracking-tight text-[#1677FF]">
                  AI
                </span>
              </div>

              <p className="hidden text-[10px] text-gray-500 sm:block">
                Bringing Clarity to Land Acquisition and Records
              </p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            type="button"
            className="rounded-lg p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-[#1677FF]"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-lg p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-[#1677FF]"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Divider */}
          <div className="mx-2 hidden h-7 w-px bg-gray-200 sm:block" />

          {/* Citizen Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-gray-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F1FF] text-[#1677FF]">
                <User size={17} />
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-4 text-gray-800">
                  Citizen
                </p>
                <p className="text-[11px] leading-4 text-gray-500">
                  Landowner
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`hidden text-gray-500 transition-transform sm:block ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Citizen
                  </p>
                  <p className="text-xs text-gray-500">Landowner</p>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  <User size={17} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  <Settings size={17} />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={17} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;