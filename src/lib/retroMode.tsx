"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

interface RetroContextValue {
  retro: boolean;
  toggle: () => void;
}

const RetroContext = createContext<RetroContextValue | null>(null);

const BOOT_FLICKER_MS = 450;

function applyRetro(retro: boolean) {
  document.documentElement.dataset.retro = String(retro);
  localStorage.setItem("retroMode", String(retro));
  // CRT power-on flicker, only when switching retro ON (see the
  // .crt-boot keyframes in globals.css) — turning it off is a plain,
  // instant switch back to the normal theme, not a "power-down" moment.
  if (retro) {
    document.documentElement.classList.add("crt-boot");
    setTimeout(() => {
      document.documentElement.classList.remove("crt-boot");
    }, BOOT_FLICKER_MS);
  }
}

// Several components (the header, the tab bar, Scores, Pot) need to branch
// their actual JSX — not just a CSS variable — on retro mode, so this is a
// context rather than each consumer independently re-reading the DOM the
// way ThemeToggle does: everything subscribed has to re-render together the
// instant the toggle flips, not just whichever component happens to poll
// next.
export function RetroModeProvider({ children }: { children: React.ReactNode }) {
  const [retro, setRetro] = useState(false);

  // useLayoutEffect (not useEffect) so this commits before the browser
  // paints the first frame. RETRO_INIT_SCRIPT in layout.tsx has already
  // stamped the real value onto <html> before hydration even starts —
  // reading it here just brings this state in sync before anything is
  // drawn, the same reasoning SplashScreen's own skip check relies on.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the blocking init script's DOM attribute, not derivable during render
    setRetro(document.documentElement.dataset.retro === "true");
  }, []);

  const toggle = () => {
    setRetro((prev) => {
      const next = !prev;
      applyRetro(next);
      return next;
    });
  };

  return <RetroContext.Provider value={{ retro, toggle }}>{children}</RetroContext.Provider>;
}

export function useRetroMode(): boolean {
  return useContext(RetroContext)?.retro ?? false;
}

export function useRetroToggle(): () => void {
  return useContext(RetroContext)?.toggle ?? (() => {});
}

// Shared styling for the retro header's top row of four tabs (Original
// App / + Home Screen / Refresh / Announcements) — each of those buttons
// lives in its own component (RetroToggle, AddToHomeScreen, RefreshButton,
// AnnouncementBell) and takes a `variant="tab"` prop to render this instead
// of its normal icon-button form, so the underlying state/logic isn't
// duplicated.
export const RETRO_TAB_CLASS =
  "flex flex-1 items-center justify-center border-r border-line px-1 py-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-chalk last:border-r-0 active:bg-panel-3";
