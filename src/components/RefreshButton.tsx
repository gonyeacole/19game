"use client";

export default function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      aria-label="Refresh page"
      className="shrink-0 rounded-full border border-line bg-panel-3 p-1.5 text-chalk-dim"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" />
        <polyline points="16.5 3 16.5 6.5 13 6.5" />
      </svg>
    </button>
  );
}
