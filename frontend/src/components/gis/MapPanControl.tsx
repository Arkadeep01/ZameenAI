import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
} from "lucide-react";

interface MapPanControlProps {
  defaultCenter?: [number, number];
  className?: string;
}

const PAN_STEP = 120;

export default function MapPanControl({
  defaultCenter = [25.3353, 82.984],
  className = "",
}: MapPanControlProps) {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement>(null);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prevent map dragging/zooming when interacting with the control
  useEffect(() => {
    const el = containerRef.current;

    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }

    return () => {
      stopContinuousPan();
    };
  }, []);

  const pan = (dx: number, dy: number) => {
    map.panBy([dx, dy], {
      animate: true,
      duration: 0.25,
    });
  };

  const stopContinuousPan = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const startContinuousPan = (dx: number, dy: number) => {
    stopContinuousPan();

    // Move immediately on click/press
    pan(dx, dy);

    // Continue moving when the button is held
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        pan(dx, dy);
      }, 150);
    }, 320);
  };

  const handleRecenter = () => {
    map.flyTo(defaultCenter, 16, {
      animate: true,
      duration: 0.6,
    });
  };

  return (
    <div
      ref={containerRef}
      className={`absolute left-3 top-16 z-[1000] select-none sm:top-1/2 sm:-translate-y-1/2 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full border border-slate-200/90 bg-white/95 p-1 shadow-lg backdrop-blur-md transition-all hover:shadow-xl">
        {/* Subtle grid background guides */}
        <div className="pointer-events-none absolute inset-2 rounded-full border border-dashed border-slate-200/90" />

        <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-slate-100" />

        <div className="pointer-events-none absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-slate-100" />

        {/* NORTH / UP */}
        <button
          type="button"
          aria-label="Pan Up (North)"
          title="Pan Up (North)"
          onPointerDown={() => startContinuousPan(0, -PAN_STEP)}
          onPointerUp={stopContinuousPan}
          onPointerLeave={stopContinuousPan}
          onPointerCancel={stopContinuousPan}
          className="group absolute left-1/2 top-0.5 flex h-7 w-8 -translate-x-1/2 cursor-pointer flex-col items-center justify-center rounded-t-full pt-0.5 text-red-600 transition-colors hover:bg-red-50/90 active:scale-90"
        >
          <span className="text-[11px] font-bold leading-none transition-transform group-hover:-translate-y-0.5">
            ▲
          </span>

          <span className="text-[8px] font-extrabold uppercase leading-none tracking-tight text-red-700">
            N
          </span>
        </button>

        {/* SOUTH / DOWN */}
        <button
          type="button"
          aria-label="Pan Down (South)"
          title="Pan Down (South)"
          onPointerDown={() => startContinuousPan(0, PAN_STEP)}
          onPointerUp={stopContinuousPan}
          onPointerLeave={stopContinuousPan}
          onPointerCancel={stopContinuousPan}
          className="group absolute bottom-0.5 left-1/2 flex h-7 w-8 -translate-x-1/2 cursor-pointer flex-col items-center justify-center rounded-b-full pb-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0c3b5d] active:scale-90"
        >
          <ChevronDown
            size={15}
            strokeWidth={2.5}
            className="transition-transform group-hover:translate-y-0.5"
          />

          <span className="text-[8px] font-bold uppercase leading-none tracking-tight text-slate-400">
            S
          </span>
        </button>

        {/* WEST / LEFT */}
        <button
          type="button"
          aria-label="Pan Left (West)"
          title="Pan Left (West)"
          onPointerDown={() => startContinuousPan(-PAN_STEP, 0)}
          onPointerUp={stopContinuousPan}
          onPointerLeave={stopContinuousPan}
          onPointerCancel={stopContinuousPan}
          className="group absolute left-0.5 top-1/2 flex h-8 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-full pl-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0c3b5d] active:scale-90"
        >
          <ChevronLeft
            size={15}
            strokeWidth={2.5}
            className="transition-transform group-hover:-translate-x-0.5"
          />
        </button>

        {/* EAST / RIGHT */}
        <button
          type="button"
          aria-label="Pan Right (East)"
          title="Pan Right (East)"
          onPointerDown={() => startContinuousPan(PAN_STEP, 0)}
          onPointerUp={stopContinuousPan}
          onPointerLeave={stopContinuousPan}
          onPointerCancel={stopContinuousPan}
          className="group absolute right-0.5 top-1/2 flex h-8 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-full pr-0.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0c3b5d] active:scale-90"
        >
          <ChevronRight
            size={16}
            strokeWidth={2.5}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </button>

        {/* CENTER / RECENTER */}
        <button
          type="button"
          aria-label="Recenter View"
          title="Recenter View"
          onClick={handleRecenter}
          className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-slate-100/95 text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-200 hover:text-[#0c3b5d] active:scale-90"
        >
          <Crosshair size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
