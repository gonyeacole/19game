"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the blocking init script's DOM attribute, not derivable during render
    setTheme((document.documentElement.dataset.theme as Theme) || "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark mode"
      className="shrink-0 rounded-full border border-line bg-panel-3 p-1.5 text-chalk-dim transition-transform active:scale-90"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4">
          <circle cx="10" cy="10" r="3.5" />
          <line x1="10" y1="1.5" x2="10" y2="3.5" />
          <line x1="10" y1="16.5" x2="10" y2="18.5" />
          <line x1="1.5" y1="10" x2="3.5" y2="10" />
          <line x1="16.5" y1="10" x2="18.5" y2="10" />
          <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
          <line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
          <line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
          <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 2a8 8 0 1 0 8 9.5A6.5 6.5 0 0 1 10 2Z" />
        </svg>
      )}
    </button>
  );
}
