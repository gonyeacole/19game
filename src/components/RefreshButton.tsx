"use client";

export default function RefreshButton() {
  const refresh = () => {
    // Pages fetch their data client-side, so right after reload the page is
    // briefly just the loading skeleton — much shorter than the scrolled-down
    // content you were just looking at. The browser's own scroll-restoration
    // then leaves the viewport parked in that now-empty space until you
    // scroll it yourself. Reset to the top before reloading so it doesn't.
    window.scrollTo(0, 0);
    window.location.reload();
  };

  return (
    <button
      onClick={refresh}
      aria-label="Refresh page"
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-led/30 bg-led-bg px-3 py-1.5 text-led transition-transform active:scale-90"
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
      <span className="text-xs font-bold">Refresh</span>
    </button>
  );
}
