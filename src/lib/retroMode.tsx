"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

interface RetroContextValue {
  retro: boolean;
  toggle: () => void;
}

const RetroContext = createContext<RetroContextValue | null>(null);

function applyRetro(retro: boolean) {
  document.documentElement.dataset.retro = String(retro);
  localStorage.setItem("retroMode", String(retro));
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
