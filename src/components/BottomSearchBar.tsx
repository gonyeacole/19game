"use client";

// Anchored just above TabNav (which is 4.625rem tall, plus the home
// indicator safe area) so the two form one continuous bottom bar, like
// Kalshi's search-above-tabs layout, instead of sitting in the page flow.
export default function BottomSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div
      className="fixed inset-x-0 z-20 bg-field px-4 pb-3 pt-2"
      style={{ bottom: "calc(4.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto max-w-lg">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-chalk-faint"
        >
          <circle cx="8.5" cy="8.5" r="5.5" />
          <line x1="16.5" y1="16.5" x2="12.8" y2="12.8" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-line bg-panel-2 py-3 pl-11 pr-4 text-sm text-chalk placeholder:text-chalk-faint"
        />
      </div>
    </div>
  );
}
