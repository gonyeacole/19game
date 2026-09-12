"use client";

export default function RefreshButton() {
  const refresh = () => {
    // Pages fetch their data client-side, so right after reload the page is
    // briefly just the loading skeleton — much shorter than the scrolled-down
    // content you were just looking at. The browser's own scroll-restoration
    // then leaves the viewport parked in that now-empty space until you
    // scroll it yourself. Reset to the top before reloading so it doesn't.
    // #scroll-main (not the window) is what actually scrolls now.
    document.getElementById("scroll-main")?.scrollTo(0, 0);
    window.location.reload();
  };

  return (
    <button
      onClick={refresh}
      aria-label="Refresh page"
      className="shrink-0 rounded-full border border-line bg-panel-3 p-1.5 text-chalk-dim transition-transform active:scale-90"
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
