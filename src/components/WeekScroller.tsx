"use client";

const MIN_WEEK = 1;
const MAX_WEEK = 18;

export default function WeekScroller({
  weekNumber,
  onSelect,
}: {
  weekNumber: number | null;
  onSelect: (week: number) => void;
}) {
  const current = weekNumber ?? MIN_WEEK;

  const goTo = (week: number) => {
    if (week < MIN_WEEK || week > MAX_WEEK) return;
    onSelect(week);
  };

  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        onClick={() => goTo(current - 1)}
        disabled={current <= MIN_WEEK}
        aria-label="Previous week"
        className="shrink-0 rounded-full border border-line bg-panel-3 p-2.5 text-chalk-dim disabled:opacity-30"
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

      <div className="flex-1 rounded-full border border-line bg-panel-3 py-2.5 text-center text-sm font-semibold text-chalk-dim">
        Week {current}
      </div>

      <button
        onClick={() => goTo(current + 1)}
        disabled={current >= MAX_WEEK}
        aria-label="Next week"
        className="shrink-0 rounded-full border border-line bg-panel-3 p-2.5 text-chalk-dim disabled:opacity-30"
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
