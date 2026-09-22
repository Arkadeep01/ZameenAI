import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface ServiceCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
}

export default function ServiceCard({
  icon,
  title,
  description,
  action,
}: ServiceCardProps) {
  return (
    <button
      type="button"
      className="group flex min-w-0 items-center gap-3.5 rounded-xl border border-slate-200/90 bg-[#f8fafc] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-md cursor-pointer"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-[#174b69] shadow-xs transition-transform group-hover:scale-105">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-bold text-[#173c56]">
          {title}
        </strong>

        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#174b69]">
        <span>{action}</span>
        <ChevronRight
          size={15}
          className="transition-transform group-hover:translate-x-1"
        />
      </div>
    </button>
  );
}
