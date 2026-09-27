import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  Gavel,
} from "lucide-react";
import { AcquisitionStage } from "../../../services/acquisition";

interface AcquisitionTimelineProps {
  stages: AcquisitionStage[];
}

export const AcquisitionTimeline: React.FC<AcquisitionTimelineProps> = ({
  stages,
}) => {
  // Current stage expanded by default, others compact
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};

      stages.forEach((s) => {
        initial[s.id] = s.status === "CURRENT";
      });

      return initial;
    },
  );

  // Current height of the animated timeline line
  const [drawnLineY, setDrawnLineY] = useState(0);

  // Stages that have already been revealed
  const [revealedStageIds, setRevealedStageIds] = useState<Set<string>>(
    new Set(),
  );

  // References for measurements
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const revealedStageIdsRef = useRef<Set<string>>(new Set());

  // Prevent the animation from reversing after completion
  const animationCompletedRef = useRef(false);

  // Total height of timeline up to the last stage node
  const [totalLineHeight, setTotalLineHeight] = useState(0);

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mq.addEventListener("change", handler);

    return () => {
      mq.removeEventListener("change", handler);
    };
  }, []);

  // Scroll-driven progressive reveal
  const updateScrollProgress = useCallback(() => {
    if (!containerRef.current) return;

    const stageIds = stages.map((s) => s.id);

    if (stageIds.length === 0) return;

    const lastStageEl = stageRefs.current[stageIds[stageIds.length - 1]];

    if (!lastStageEl) return;

    const isMobile = window.innerWidth < 640;
    const nodeHalfHeight = isMobile ? 20 : 22;

    const calculatedTotalHeight = lastStageEl.offsetTop + nodeHalfHeight;

    setTotalLineHeight(calculatedTotalHeight);

    /*
     * Once the complete timeline has been revealed,
     * keep everything visible.
     *
     * Scrolling upward will NOT hide anything.
     */
    if (animationCompletedRef.current) {
      setDrawnLineY(calculatedTotalHeight);
      return;
    }

    /*
     * Reduced motion:
     * reveal everything immediately.
     */
    if (prefersReducedMotion) {
      const allSet = new Set(stageIds);

      setRevealedStageIds(allSet);
      revealedStageIdsRef.current = allSet;
      setDrawnLineY(calculatedTotalHeight);

      animationCompletedRef.current = true;

      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    // Activation point: 70% down from viewport top
    const viewportTriggerY = window.innerHeight * 0.7;

    const scrollProgress = viewportTriggerY - containerRect.top;

    let targetLineY = 0;

    if (scrollProgress > 0) {
      targetLineY = Math.min(scrollProgress, calculatedTotalHeight);
    }

    setDrawnLineY(targetLineY);

    /*
     * IMPORTANT:
     * Start with the stages that are already revealed.
     *
     * This prevents stages from disappearing when
     * the user scrolls upward.
     */
    const currentRevealed = revealedStageIdsRef.current;

    const nextRevealed = new Set(currentRevealed);

    stageIds.forEach((id) => {
      const el = stageRefs.current[id];

      if (!el) return;

      const nodeCenter = el.offsetTop + nodeHalfHeight;

      /*
       * Only add stages.
       * Never remove previously revealed stages.
       */
      if (targetLineY >= nodeCenter) {
        nextRevealed.add(id);
      }
    });

    revealedStageIdsRef.current = nextRevealed;
    setRevealedStageIds(nextRevealed);

    /*
     * Once every stage has appeared,
     * permanently complete the animation.
     */
    if (nextRevealed.size === stageIds.length) {
      animationCompletedRef.current = true;
      setDrawnLineY(calculatedTotalHeight);
    }
  }, [stages, prefersReducedMotion]);

  // Scroll listener
  useEffect(() => {
    let animationFrameId: number;

    const onScroll = () => {
      cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        updateScrollProgress();
      });
    };

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    window.addEventListener("resize", onScroll, {
      passive: true,
    });

    // Initial check
    updateScrollProgress();

    return () => {
      cancelAnimationFrame(animationFrameId);

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateScrollProgress]);

  // Recalculate geometry when cards expand/collapse
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollProgress();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollProgress]);

  // Toggle stage expansion
  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  return (
    <section aria-labelledby="timeline-heading" className="w-full space-y-6">
      {/* Section Title & Subtitle */}

      <div className="border-b border-[#D9E2EC] pb-4">
        <h2
          id="timeline-heading"
          className="text-xl font-bold tracking-tight text-[#062B52] sm:text-2xl"
        >
          YOUR ACQUISITION JOURNEY
        </h2>

        <p className="mt-1 text-xs text-[#64748B] sm:text-sm">
          Follow each stage of your land acquisition process.
        </p>
      </div>

      {/* Main Vertical Timeline Container */}

      <div ref={containerRef} className="relative">
        {/* Progressive Timeline Line */}

        <div
          className="absolute left-[25px] z-0 w-[2px] rounded-full bg-[#1261A8] sm:left-[31px]"
          style={{
            top: 0,
            height: `${drawnLineY}px`,
            transition: prefersReducedMotion ? "none" : "height 120ms ease-out",
          }}
          aria-hidden="true"
        />

        {/* Stages List */}

        <div className="relative z-10 space-y-6 sm:space-y-8">
          {stages.map((stage) => {
            const isCompleted = stage.status === "COMPLETED";

            const isCurrent = stage.status === "CURRENT";

            const isUpcoming = stage.status === "UPCOMING";

            const isExpanded = !!expandedStages[stage.id];

            /*
             * A stage stays revealed permanently
             * after it has appeared.
             */
            const isRevealed =
              prefersReducedMotion || revealedStageIds.has(stage.id);

            const formattedStageNum = String(stage.stageNumber).padStart(
              2,
              "0",
            );

            return (
              <div
                key={stage.id}
                id={`timeline-stage-${stage.id}`}
                data-stage-id={stage.id}
                ref={(el) => {
                  stageRefs.current[stage.id] = el;
                }}
                className="relative flex items-start gap-3 pl-2 sm:gap-5 sm:pl-3"
              >
                {/* Stage Timeline Circle */}

                <div className="relative mt-0.5 flex w-9 shrink-0 items-center justify-center sm:w-10">
                  <div
                    aria-current={isCurrent ? "step" : undefined}
                    style={{
                      opacity: isRevealed ? 1 : 0,
                      transform: isRevealed ? "scale(1)" : "scale(0.75)",
                      pointerEvents: isRevealed ? "auto" : "none",
                      transition: prefersReducedMotion
                        ? "none"
                        : isRevealed
                          ? "opacity 250ms ease-out, transform 250ms ease-out"
                          : "opacity 200ms ease-in 100ms, transform 200ms ease-in 100ms",
                    }}
                    className={`flex h-9 w-9 select-none items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 ${
                      isCompleted
                        ? "border-2 border-white bg-[#16855B] text-white shadow-xs ring-2 ring-emerald-200/80"
                        : isCurrent
                          ? "border-2 border-white bg-[#062B52] text-white shadow-md ring-4 ring-blue-200"
                          : "border-2 border-[#1261A8] bg-white text-slate-700 shadow-2xs"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    ) : isCurrent ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    ) : (
                      <span className="text-[11px] font-medium">
                        {stage.stageNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage Card */}

                <div
                  style={{
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed
                      ? "translateY(0)"
                      : "translateY(12px)",
                    pointerEvents: isRevealed ? "auto" : "none",
                    transition: prefersReducedMotion
                      ? "none"
                      : isRevealed
                        ? "opacity 400ms ease-out 220ms, transform 400ms ease-out 220ms, border-color 200ms ease"
                        : "opacity 250ms ease-in, transform 250ms ease-in, border-color 200ms ease",
                  }}
                  className={`min-w-0 flex-1 rounded-xl border shadow-xs ${
                    isCurrent
                      ? "border-[#1261A8] bg-white ring-1 ring-[#1261A8]/25"
                      : isCompleted
                        ? "border-[#D9E2EC] bg-white hover:border-slate-300"
                        : "border-slate-300 bg-white"
                  }`}
                >
                  {/* Card Header */}

                  <div
                    role="button"
                    tabIndex={isRevealed ? 0 : -1}
                    onClick={() => {
                      if (isRevealed) {
                        toggleStage(stage.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (isRevealed && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        toggleStage(stage.id);
                      }
                    }}
                    aria-expanded={isExpanded}
                    className="flex cursor-pointer select-none flex-col gap-2.5 rounded-xl p-4 transition hover:bg-slate-50/50 focus-visible:outline-2 focus-visible:outline-[#1261A8] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          STAGE {formattedStageNum}
                        </span>

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#16855B]">
                            <Check size={12} strokeWidth={2.5} />
                            Completed
                          </span>
                        )}

                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#1261A8]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1261A8]" />
                            CURRENT STAGE
                          </span>
                        )}

                        {isUpcoming && (
                          <span className="rounded border border-transparent bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            Upcoming
                          </span>
                        )}

                        {stage.citizenAction && (
                          <span className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            Action Required
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-base font-bold sm:text-lg ${
                          isCurrent
                            ? "text-[#062B52]"
                            : isCompleted
                              ? "text-slate-800"
                              : "text-slate-600"
                        }`}
                      >
                        {stage.title}
                      </h3>

                      {stage.date && (
                        <p className="flex items-center gap-1.5 text-xs text-[#64748B]">
                          <Clock size={12} className="text-slate-400" />
                          <span>{stage.date}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end text-xs font-semibold text-[#1261A8] sm:self-center">
                      <span>
                        {isExpanded ? "Hide Details" : "View Details"}
                      </span>

                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </div>

                  {/* Stage Short Description */}

                  <div className="px-4 pb-4 text-xs leading-relaxed text-slate-600 sm:px-5 sm:text-sm">
                    {stage.description}
                  </div>

                  {/* Expandable Stage Details */}

                  {isExpanded && (
                    <div className="space-y-4 rounded-b-xl border-t border-slate-100 bg-[#FAFBFD] p-4 sm:p-5">
                      {/* Statutory Basis */}

                      {stage.statutoryReference && (
                        <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#062B52]">
                            <Gavel size={14} className="text-[#1261A8]" />

                            <span>
                              STATUTORY BASIS • {stage.statutoryReference.act}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[#1261A8]">
                            {stage.statutoryReference.section}
                          </p>

                          <p className="text-xs leading-relaxed text-slate-600">
                            {stage.statutoryReference.summary}
                          </p>

                          {stage.statutoryReference.gazetteRef && (
                            <span className="mt-1 inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                              Gazette Ref: {stage.statutoryReference.gazetteRef}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Verification Points */}

                      {stage.verificationPoints &&
                        stage.verificationPoints.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                              STATUTORY VERIFICATION MILESTONES
                            </h4>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {stage.verificationPoints.map((vp) => (
                                <div
                                  key={vp.id}
                                  className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                                    vp.verified
                                      ? "border-emerald-200 bg-white text-slate-800"
                                      : "border-slate-200 bg-white text-slate-400"
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                      vp.verified
                                        ? "bg-[#16855B] text-white"
                                        : "border border-slate-300 text-transparent"
                                    }`}
                                  >
                                    {vp.verified && (
                                      <Check size={10} strokeWidth={3} />
                                    )}
                                  </span>

                                  <div className="leading-tight">
                                    <span>{vp.label}</span>

                                    {vp.timestamp && (
                                      <span className="mt-0.5 block text-[10px] text-slate-400">
                                        Verified: {vp.timestamp}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Official Documents */}

                      {stage.documents && stage.documents.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                            STAGE DOCUMENTS &amp; NOTICES
                          </h4>

                          <div className="space-y-2">
                            {stage.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 items-center justify-center rounded bg-[#EAF3FC] text-[#1261A8]">
                                    <FileText size={16} />
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold text-[#062B52]">
                                      {doc.title}
                                    </p>

                                    <p className="text-[11px] text-slate-500">
                                      {doc.authority} • Issued: {doc.issuedDate}{" "}
                                      • {doc.fileSize}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <Link
                                    to="/citizen/documents"
                                    className="inline-flex min-h-[36px] items-center gap-1 rounded border border-[#D9E2EC] bg-[#F6F8FB] px-3 py-1.5 text-xs font-semibold text-[#1261A8] transition hover:bg-[#EAF3FC]"
                                  >
                                    <span>View Document</span>

                                    <ExternalLink size={12} />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Citizen Action */}

                      {stage.citizenAction && (
                        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/70 p-3.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <AlertCircle size={15} />

                            <span>CITIZEN ACTION REQUIRED</span>
                          </div>

                          <p className="text-xs leading-relaxed text-slate-700">
                            {stage.citizenAction.description}
                          </p>

                          <div className="pt-1">
                            <Link
                              to={
                                stage.citizenAction.actionUrl ||
                                "/citizen/compensation"
                              }
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#062B52] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1261A8]"
                            >
                              <span>{stage.citizenAction.buttonText}</span>

                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* What Happens Next */}

                      {stage.whatHappensNext && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-xs text-[#062B52]">
                          <strong>Next Statutory Event:</strong>{" "}
                          {stage.whatHappensNext}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AcquisitionTimeline;
