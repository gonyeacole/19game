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
      className="shrink-0 rounded-full bg-led px-3 py-1.5 text-xs font-bold text-[#08150e] transition-transform active:scale-90"
    >
      Refresh
    </button>
  );
}
