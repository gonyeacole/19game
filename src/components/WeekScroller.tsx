"use client";

const MIN_WEEK = 1;
const MAX_WEEK = 18;

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

      <div className="flex-1 rounded-full border border-line bg-panel-3 py-2.5 text-center text-sm font-semibold text-chalk-dim transition-opacity">
        <span className={loading ? "opacity-50" : ""}>Week {current}</span>
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
