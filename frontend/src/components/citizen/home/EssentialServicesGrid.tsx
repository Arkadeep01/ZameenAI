import React from "react";
import { Link } from "@tanstack/react-router";
import {
  LandPlot,
  Landmark,
  IndianRupee,
  MapPinned,
  FileText,
  MessageSquareWarning,
  ArrowRight,
} from "lucide-react";

export interface EssentialService {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SERVICES: EssentialService[] = [
  {
    id: "serv-land",
    name: "My Land",
    description: "View your registered land parcels.",
    route: "/citizen/my-land",
    icon: LandPlot,
  },
  {
    id: "serv-acq",
    name: "Acquisition Status",
    description: "Track the progress of your land acquisition.",
    route: "/citizen/acquisition-status",
    icon: Landmark,
  },
  {
    id: "serv-comp",
    name: "Compensation",
    description: "View assessment and payment details.",
    route: "/citizen/compensation",
    icon: IndianRupee,
  },
  {
    id: "serv-map",
    name: "Land Map",
    description: "View your land on the interactive map.",
    route: "/citizen/my-land-map",
    icon: MapPinned,
  },
  {
    id: "serv-docs",
    name: "Documents",
    description: "Access your land and acquisition documents.",
    route: "/citizen/documents",
    icon: FileText,
  },
  {
    id: "serv-grv",
    name: "Support & Grievances",
    description: "Access helpdesk, FAQs, and file grievances.",
    route: "/citizen/support",
    icon: MessageSquareWarning,
  },
];

export const EssentialServicesGrid: React.FC = () => {
  return (
    <section
      aria-labelledby="essential-services-heading"
      className="flex h-full flex-col justify-between rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 shadow-xs"
    >
      <div>
        {/* Header */}
        <div className="border-b border-[#D9E2EC] pb-4">
          <h2
            id="essential-services-heading"
            className="text-lg font-bold tracking-tight text-[#062B52]"
          >
            ESSENTIAL SERVICES
          </h2>
          <p className="mt-0.5 text-xs text-[#607089]">
            Direct access to official citizen land workflows
          </p>
        </div>

        {/* 6 Clean Service Tiles Grid (2 cols on sm, 2 cols on md/lg) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.id}
                to={service.route}
                className="group flex items-start gap-3 rounded-lg border border-[#D9E2EC] bg-white p-3.5 transition hover:border-[#1261A8] hover:bg-[#F9FBFE] hover:shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1261A8]"
              >
                {/* Small Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EAF3FC] text-[#1261A8] group-hover:bg-[#1261A8] group-hover:text-white transition">
                  <Icon size={16} aria-hidden="true" />
                </div>

                {/* Name & One-line explanation */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-bold text-[#062B52] group-hover:text-[#1261A8] transition truncate">
                      {service.name}
                    </h3>
                    <ArrowRight
                      size={13}
                      className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#1261A8] transition shrink-0 ml-1"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-[#607089] line-clamp-1">
                    {service.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-[#D9E2EC] pt-4">
        <p className="text-[11px] text-center text-slate-500">
          All digital land services are legally recognized under the Information Technology Act.
        </p>
      </div>
    </section>
  );
};

export default EssentialServicesGrid;
