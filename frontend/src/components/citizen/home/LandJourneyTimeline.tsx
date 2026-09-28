import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import StatusBadge from "../../common/StatusBadge";
import { Check, ArrowRight, Calendar } from "lucide-react";

export interface JourneyStage {
  id: string;
  name: string;
  status: "completed" | "current" | "upcoming";
  stageNumber: number;
}

const DEFAULT_STAGES: JourneyStage[] = [
  { id: "s1", name: "Proposal", status: "completed", stageNumber: 1 },
  { id: "s2", name: "Land Identified", status: "completed", stageNumber: 2 },
  { id: "s3", name: "Notification", status: "completed", stageNumber: 3 },
  { id: "s4", name: "Verification", status: "completed", stageNumber: 4 },
  { id: "s5", name: "Award", status: "completed", stageNumber: 5 },
  { id: "s6", name: "Compensation", status: "current", stageNumber: 6 },
  { id: "s7", name: "Payment", status: "upcoming", stageNumber: 7 },
  { id: "s8", name: "Possession", status: "upcoming", stageNumber: 8 },
  { id: "s9", name: "R&R", status: "upcoming", stageNumber: 9 },
];

interface LandJourneyTimelineProps {
  stages?: JourneyStage[];
  currentStageTitle?: string;
  currentStageDescription?: string;
  lastUpdated?: string;
  caseId?: string;
}

export const LandJourneyTimeline: React.FC<LandJourneyTimelineProps> = ({
  stages = DEFAULT_STAGES,
  currentStageTitle = "Compensation Assessment",
  currentStageDescription = "Your compensation is currently being assessed.",
  lastUpdated = "18 Sep 2026",
  caseId = "ACQ-2026-00182",
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [lineStarted, setLineStarted] = useState(false);
  const [activeStageIdx, setActiveStageIdx] = useState(-1);
  const [cardVisible, setCardVisible] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  // Dynamically resolve current stage index
  const currentIndex = useMemo(() => {
    const idx = stages.findIndex((s) => s.status === "current");
    if (idx !== -1) return idx;
    const completedIndices = stages
      .map((s, i) => (s.status === "completed" ? i : -1))
      .filter((i) => i !== -1);
    if (completedIndices.length > 0) {
      return completedIndices[completedIndices.length - 1];
    }
    return 0;
  }, [stages]);

  // Scroll trigger via IntersectionObserver & prefers-reduced-motion check
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setHasStarted(true);
      setLineStarted(true);
      setActiveStageIdx(stages.length);
      setCardVisible(true);
      setIsAnimationFinished(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [stages.length]);

  // Sequential stage animation orchestration
  useEffect(() => {
    if (!hasStarted || isAnimationFinished) return;

    const STEP_DURATION = 250; // ms per stage segment
    const START_DELAY = 150; // ms before proposal appears and line starts

    const timers: number[] = [];

    // Stage 0 (Proposal) appears and line starts traveling
    timers.push(
      window.setTimeout(() => {
        setActiveStageIdx(0);
        setLineStarted(true);
      }, START_DELAY),
    );

    // Each subsequent stage up to currentIndex is reached as the line arrives
    for (let i = 1; i <= currentIndex; i++) {
      timers.push(
        window.setTimeout(
          () => {
            setActiveStageIdx(i);
          },
          START_DELAY + i * STEP_DURATION,
        ),
      );
    }

    // Current stage card below appears after reaching the current stage
    const currentReachedTime = START_DELAY + currentIndex * STEP_DURATION;
    timers.push(
      window.setTimeout(() => {
        setCardVisible(true);
      }, currentReachedTime + 200),
    );

    // Mark animation completely finished
    timers.push(
      window.setTimeout(() => {
        setIsAnimationFinished(true);
      }, currentReachedTime + 650),
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [hasStarted, currentIndex, isAnimationFinished]);

  // Total segments in the timeline
  const totalSegments = Math.max(stages.length - 1, 1);
  const targetProgress = currentIndex / totalSegments;
  const totalLineDuration = currentIndex * 250;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="land-journey-heading"
      className="w-full rounded-xl border border-[#D9E2EC] bg-white p-5 sm:p-6 lg:p-7 shadow-xs"
    >
      {/* Subtle single pulse ring keyframe for current stage entrance */}
      <style>{`
        @keyframes currentPulseRingOnce {
          0% {
            box-shadow: 0 0 0 0 rgba(18, 97, 168, 0.45);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(18, 97, 168, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(18, 97, 168, 0);
          }
        }
        .animate-current-ring {
          animation: currentPulseRingOnce 0.8s ease-out 1 forwards;
        }
      `}</style>

      {/* Section Header */}
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E2EC] pb-5 transition-opacity duration-300 ${
          hasStarted ? "opacity-100" : "opacity-95"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="land-journey-heading"
              className="text-lg sm:text-xl font-bold tracking-tight text-[#062B52]"
            >
              YOUR LAND JOURNEY
            </h2>
            <StatusBadge status={`Case ${caseId}`} withIcon={false} />
          </div>
          <p className="mt-1 text-sm text-[#607089]">
            Track what has happened and what comes next.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[#607089]">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
            <Calendar size={13} className="text-slate-500" aria-hidden="true" />
            Last updated: {lastUpdated}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. DESKTOP TIMELINE (Visible on sm/md/lg/xl, hidden on small mobile) */}
      {/* ==================================================================== */}
      <div className="hidden sm:block pt-8 pb-4">
        <div className="relative">
          {/* Base Inactive Gray Connector Line (anchored exactly at center of first & last circle) */}
          <div
            className="absolute top-4 h-0.5 bg-slate-200"
            style={{
              left: `${(0.5 / stages.length) * 100}%`,
              right: `${(0.5 / stages.length) * 100}%`,
            }}
            aria-hidden="true"
          />

          {/* Active Completed Green Progress Line (animates smoothly from LEFT -> RIGHT, stops at current stage) */}
          <div
            className="absolute top-4 h-0.5 bg-[#16855B]"
            style={{
              left: `${(0.5 / stages.length) * 100}%`,
              width: `${(totalSegments / stages.length) * 100}%`,
              transform: `scaleX(${
                isAnimationFinished
                  ? targetProgress
                  : lineStarted
                    ? targetProgress
                    : 0
              })`,
              transformOrigin: "left center",
              transition:
                isAnimationFinished || !lineStarted
                  ? "none"
                  : `transform ${totalLineDuration}ms linear`,
            }}
            aria-hidden="true"
          />

          <ol className="relative z-10 flex w-full justify-between items-start">
            {stages.map((stage, idx) => {
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";
              const isUpcoming = stage.status === "upcoming";
              const isRevealed = isAnimationFinished || activeStageIdx >= idx;

              return (
                <li
                  key={stage.id}
                  className="flex flex-col items-center text-center px-1 flex-1 min-w-0"
                >
                  {/* Step Circle Indicator */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isCompleted
                        ? "bg-[#16855B] text-white shadow-xs"
                        : isCurrent
                          ? `bg-[#062B52] text-white ring-4 ring-blue-100 scale-110 shadow-sm ${
                              !isAnimationFinished && isRevealed
                                ? "animate-current-ring"
                                : ""
                            }`
                          : "border-2 border-slate-300 bg-white text-slate-400"
                    }`}
                    style={{
                      opacity: isUpcoming ? 1 : isRevealed ? 1 : 0,
                      transform: isUpcoming
                        ? undefined
                        : isRevealed
                          ? isCurrent
                            ? "scale(1.1)"
                            : "scale(1)"
                          : "scale(0.8)",
                      transition: isAnimationFinished
                        ? "none"
                        : "opacity 300ms ease-out, transform 300ms ease-out",
                    }}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isCompleted ? (
                      <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                    ) : isCurrent ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        {stage.stageNumber}
                      </span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div
                    className="mt-2.5 space-y-0.5"
                    style={{
                      opacity: isUpcoming ? 1 : isRevealed ? 1 : 0,
                      transform: isUpcoming
                        ? undefined
                        : isRevealed
                          ? "translateY(0)"
                          : "translateY(4px)",
                      transition: isAnimationFinished
                        ? "none"
                        : "opacity 300ms ease-out, transform 300ms ease-out",
                    }}
                  >
                    <p
                      className={`text-xs font-semibold leading-tight truncate px-0.5 ${
                        isCurrent
                          ? "font-bold text-[#062B52]"
                          : isCompleted
                            ? "text-slate-700"
                            : "text-slate-400"
                      }`}
                      title={stage.name}
                    >
                      {stage.name}
                    </p>

                    {isCurrent && (
                      <span className="inline-block rounded bg-[#EAF3FC] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#1261A8]">
                        Current
                      </span>
                    )}
                    {isCompleted && (
                      <span className="block text-[10px] text-[#16855B] font-medium">
                        Done
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MOBILE TIMELINE (Vertical stepper visible on mobile < 640px)     */}
      {/* ==================================================================== */}
      <div className="block sm:hidden pt-5 pb-2">
        <ol className="relative space-y-4 border-l-2 border-slate-200 ml-4 pl-5">
          {/* Active Vertical Completed Green Line on Mobile (animates TOP -> BOTTOM) */}
          <div
            className="absolute -left-[2px] top-2 w-0.5 bg-[#16855B]"
            style={{
              height: "calc(100% - 16px)",
              transform: `scaleY(${
                isAnimationFinished
                  ? targetProgress
                  : lineStarted
                    ? targetProgress
                    : 0
              })`,
              transformOrigin: "top center",
              transition:
                isAnimationFinished || !lineStarted
                  ? "none"
                  : `transform ${totalLineDuration}ms linear`,
            }}
            aria-hidden="true"
          />

          {stages.map((stage, idx) => {
            const isCompleted = stage.status === "completed";
            const isCurrent = stage.status === "current";
            const isUpcoming = stage.status === "upcoming";
            const isRevealed = isAnimationFinished || activeStageIdx >= idx;

            return (
              <li key={stage.id} className="relative">
                {/* Node icon anchored to border-left */}
                <div
                  className={`absolute -left-[31px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isCompleted
                      ? "bg-[#16855B] text-white"
                      : isCurrent
                        ? `bg-[#062B52] text-white ring-4 ring-blue-100 ${
                            !isAnimationFinished && isRevealed
                              ? "animate-current-ring"
                              : ""
                          }`
                        : "border-2 border-slate-300 bg-white text-slate-400"
                  }`}
                  style={{
                    opacity: isUpcoming ? 1 : isRevealed ? 1 : 0,
                    transform: isUpcoming
                      ? undefined
                      : isRevealed
                        ? "scale(1)"
                        : "scale(0.8)",
                    transition: isAnimationFinished
                      ? "none"
                      : "opacity 300ms ease-out, transform 300ms ease-out",
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      {stage.stageNumber}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center justify-between"
                  style={{
                    opacity: isUpcoming ? 1 : isRevealed ? 1 : 0,
                    transform: isUpcoming
                      ? undefined
                      : isRevealed
                        ? "translateY(0)"
                        : "translateY(4px)",
                    transition: isAnimationFinished
                      ? "none"
                      : "opacity 300ms ease-out, transform 300ms ease-out",
                  }}
                >
                  <div className="space-y-0.5">
                    <p
                      className={`text-sm ${
                        isCurrent
                          ? "font-bold text-[#062B52]"
                          : isCompleted
                            ? "font-medium text-slate-700"
                            : "text-slate-400"
                      }`}
                    >
                      {stage.name}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[#1261A8] font-semibold">
                        In progress · Statutory compensation assessment
                      </p>
                    )}
                  </div>

                  {isCurrent ? (
                    <span className="rounded bg-[#EAF3FC] px-2 py-0.5 text-[10px] font-bold text-[#1261A8]">
                      CURRENT
                    </span>
                  ) : isCompleted ? (
                    <span className="text-[11px] text-[#16855B] font-medium">
                      Completed
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Pending</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ==================================================================== */}
      {/* 3. CURRENT STAGE SUMMARY CARD & ACTION (Below Timeline)             */}
      {/* ==================================================================== */}
      <div className="mt-6 rounded-lg border border-[#D9E2EC] bg-[#F6F8FB] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1261A8]">
              CURRENT STAGE
            </span>

            <h3 className="text-base font-bold text-[#062B52] sm:text-lg">
              {currentStageTitle}
            </h3>

            <p className="text-sm text-[#062B52]">
              "{currentStageDescription}"
            </p>

            <p className="text-xs text-[#607089]">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <Link
              to="/citizen/acquisition-status"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#062B52] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1261A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#062B52]"
            >
              <span>View Full Status</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandJourneyTimeline;
