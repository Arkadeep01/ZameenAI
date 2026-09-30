import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleCheck, ExternalLink } from "lucide-react";
import { GreetingHeader, PortalCard } from "../components/portal/PortalLayout";
import { notifications } from "../features/deskValidator/deskValidatorData";
import { useDeskValidator } from "../features/deskValidator/DeskValidatorStore";
import { GovStrip } from "../features/deskValidator/deskValidatorUi";

export const Route = createFileRoute("/desk-validator/notifications")({
  component: DeskValidatorNotifications,
});

function DeskValidatorNotifications() {
  const navigate = useNavigate();
  const { selectCase } = useDeskValidator();

  const open = (caseId: string) => () => {
    selectCase(caseId);
    navigate({ to: "/desk-validator/workspace" });
  };

  return (
    <>
      <GovStrip />

      <GreetingHeader
        eyebrow="System & Help • Alert Center"
        title="Statutory Notifications & Alert Center"
        subtitle="Operational alerts for assigned high-priority records, survey discrepancies, and CALA workflow progression."
      />
      <div className="space-y-3">
        {notifications.map((n) => (
          <PortalCard key={n.title} className={n.urgent ? "!border-amber-300 !bg-amber-50/40" : ""}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                  {n.urgent && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                  {n.title}
                  <span className="font-mono text-[11px] font-medium text-slate-400">{n.time}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.desc}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={open("LA-2026-00128")} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Open Case <ExternalLink size={12} /></button>
                {n.urgent && <CircleCheck size={18} className="text-slate-300" />}
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
