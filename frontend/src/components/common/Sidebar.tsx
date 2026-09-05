import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Clock3,
  ClipboardCheck,
  Map,
  ShieldCheck,
  Workflow,
  MapPinned,
  BarChart3,
  History,
  Settings,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", to: "/citizen/dashboard", icon: LayoutDashboard },
  { name: "Document Digitization", to: "/citizen/document-digitization", icon: FileText },
  { name: "Processing Queue", to: "/citizen/processing-queue", icon: Clock3 },
  { name: "Review Center", to: "/citizen/review-center", icon: ClipboardCheck },
  { name: "Land Records", to: "/citizen/land-records", icon: Map },
  { name: "Validation & Anomalies", to: "/citizen/validation-anomalies", icon: ShieldCheck },
  { name: "Acquisition Workflow", to: "/citizen/acquisition-workflow", icon: Workflow },
  { name: "GIS Map", to: "/citizen/gis-map", icon: MapPinned },
  { name: "Reports & Analytics", to: "/citizen/reports-analytics", icon: BarChart3 },
  { name: "Audit Logs", to: "/citizen/audit-logs", icon: History },
  { name: "Settings", to: "/citizen/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-60 flex-col bg-[#06254A] text-white transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <li key={item.name}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white/90 text-[#03045e] shadow-sm"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    size={17}
                    strokeWidth={2}
                    className={isActive ? "text-[#03045e]" : "text-blue-200"}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;