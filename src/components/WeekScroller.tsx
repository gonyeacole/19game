"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target (document.body) is unavailable during SSR/render
    setMounted(true);
  }, []);

  const goTo = (week: number) => {
    if (loading || week < MIN_WEEK || week > MAX_WEEK) return;
    onSelect(week);
  };

  return (
    <>
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

        <button
          onClick={() => setOpen(true)}
          disabled={loading}
          className="flex-1 rounded-full border border-line bg-panel-3 py-2.5 text-center text-sm font-semibold text-chalk-dim transition-opacity disabled:opacity-50"
        >
          <span className={loading ? "opacity-50" : ""}>Week {current}</span>
        </button>

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

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-line bg-panel p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-chalk">Select Week</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1 text-icon transition-transform active:scale-90"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {ALL_WEEKS.map((week) => (
                  <button
                    key={week}
                    onClick={() => {
                      goTo(week);
                      setOpen(false);
                    }}
                    className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                      week === current ? "bg-led text-pill-text" : "bg-panel-3 text-chalk-dim"
                    }`}
                  >
                    {week}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
