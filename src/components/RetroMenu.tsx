"use client";

import { useState } from "react";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import ThemeToggle from "@/components/ThemeToggle";
import RetroToggle from "@/components/RetroToggle";

// Condenses AddToHomeScreen/ThemeToggle/RetroToggle (three separate icon
// buttons) into one burger menu — retro-only. Each button inside keeps its
// own existing behavior unchanged (AddToHomeScreen still opens its own
// modal, RetroToggle still flips the whole app out of retro mode), this
// just changes what's visible before you tap something.
export default function RetroMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="shrink-0 rounded-full border border-line bg-panel-3 p-1.5 text-chalk-dim transition-transform active:scale-90"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="h-4 w-4"
        >
          <line x1="3" y1="5.5" x2="17" y2="5.5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="14.5" x2="17" y2="14.5" />
        </svg>
      </button>

      {open && (
        <>
          {/* Catches a tap anywhere else to close the menu, same pattern as
              AnnouncementBell/AddToHomeScreen's own modal backdrops. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 flex flex-col gap-2 rounded-lg border border-line bg-panel p-2">
            <AddToHomeScreen />
            <ThemeToggle />
            <RetroToggle />
          </div>
        </>
      )}
    </div>
  );
}
