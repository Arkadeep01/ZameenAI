import React from "react";
import { Construction } from "lucide-react";
import PageHeader from "./PageHeader";
import type { Crumb } from "./Breadcrumbs";
import { surface } from "./portalStyles";

interface ComingSoonPageProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
}

/**
 * Shared shell for Citizen Portal sections that are routed and reachable but
 * whose data is not yet exposed. Deliberately renders no fabricated content
 * and makes no API calls — it only states the current status honestly.
 */
export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  description = "This service is being prepared by the Department of Land Resources and will be available here shortly.",
  breadcrumbs,
}) => {
  return (
    <div className="w-full min-w-0 bg-[#F4F8FB] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="w-full min-w-0 space-y-5 sm:space-y-6">
        <PageHeader
          title={title}
          subtitle={description}
          /* "Home" is injected by <Breadcrumbs />; pages only supply the trail. */
          breadcrumbs={breadcrumbs ?? [{ label: title }]}
        />

        <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${surface}`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3FC] text-[#1261A8]">
            <Construction size={26} aria-hidden="true" />
          </div>

          <h2 className="mt-4 text-base font-bold text-[#062B52] sm:text-lg">
            Coming Soon
          </h2>

          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#607089]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
