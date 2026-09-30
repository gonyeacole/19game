"use client";

import { RETRO_TAB_CLASS, useRetroMode, useRetroToggle } from "@/lib/retroMode";

// A little CRT-shaped button, mirroring ThemeToggle's own button pattern —
// flips the whole app between the normal theme and the Ceefax/teletext
// retro theme. variant="tab" is only ever rendered from inside the retro
// header itself, so it's always going "back" — the label doesn't need the
// same retro-state branching the icon form's aria-label does.
export default function RetroToggle({ variant = "icon" }: { variant?: "icon" | "tab" }) {
  const retro = useRetroMode();
  const toggle = useRetroToggle();

  if (variant === "tab") {
    return (
      <button onClick={toggle} className={RETRO_TAB_CLASS}>
        Original App
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={retro}
      aria-label={retro ? "Switch to normal view" : "Switch to retro view"}
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
        <rect x="2.5" y="4" width="15" height="10" rx="1.2" />
        <line x1="7" y1="17" x2="13" y2="17" />
        <line x1="10" y1="14" x2="10" y2="17" />
      </svg>
    </button>
  );
}
