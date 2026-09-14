"use client";

import { useEffect, useRef, useState } from "react";

const MIN_WEEK = 1;
const MAX_WEEK = 18;
const ALL_WEEKS = Array.from({ length: MAX_WEEK - MIN_WEEK + 1 }, (_, i) => MIN_WEEK + i);

export default function WeekScroller({
  weekNumber,
  onSelect,
  loading = false,
}: {
  weekNumber: number | null;
  onSelect: (week: number) => void;
  loading?: boolean;
}) {
  const current = weekNumber ?? MIN_WEEK;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click/tap, like a native dropdown.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const goTo = (week: number) => {
    if (loading || week < MIN_WEEK || week > MAX_WEEK) return;
    onSelect(week);
  };

  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        onClick={() => goTo(current - 1)}
        disabled={loading || current <= MIN_WEEK}
        aria-label="Previous week"
        className="shrink-0 rounded-full border border-line bg-panel-3 p-2.5 text-chalk-dim transition-transform active:scale-90 disabled:opacity-30 disabled:active:scale-100"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="12 4 6 10 12 16" />
        </svg>
      </button>

      <div ref={containerRef} className="relative flex-1">
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={loading}
          className="w-full rounded-full border border-line bg-panel-3 py-2.5 text-center text-sm font-semibold text-chalk-dim transition-opacity disabled:opacity-50"
        >
          <span className={loading ? "opacity-50" : ""}>Week {current}</span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-panel p-1.5 shadow-lg">
            {ALL_WEEKS.map((week) => (
              <button
                key={week}
                onClick={() => {
                  goTo(week);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  week === current ? "bg-led text-pill-text" : "text-chalk-dim"
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => goTo(current + 1)}
        disabled={loading || current >= MAX_WEEK}
        aria-label="Next week"
        className="shrink-0 rounded-full border border-line bg-panel-3 p-2.5 text-chalk-dim transition-transform active:scale-90 disabled:opacity-30 disabled:active:scale-100"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <polyline points="8 4 14 10 8 16" />
        </svg>
      </button>
    </div>
  );
}
