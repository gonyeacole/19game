"use client";

import { useEffect, useState } from "react";
import { leagueGothic } from "@/lib/fonts";

// Matches the app icon's green/near-black — literal hex rather than the
// theme's --color-* tokens so the splash looks the same in light or dark
// mode, like a fixed brand screen rather than themed UI.
const SPLASH_GREEN = "#00dd94";
const SPLASH_BLACK = "#0a0a0a";

// Every character is laid out in its final position from the very first
// frame (nothing ever reflows) and revealed purely via opacity/transform/
// filter — compositor-only properties a phone's GPU can animate at 60fps.
// An earlier version grew a wrapper's `width` to reveal each letter, which
// triggers real layout on every step and reads as janky/"blocky" — this
// avoids that class of jank entirely.
const CHARS = ["1", "9", "L", "e", "a", "g", "u", "e"];
const LEAGUE_START_INDEX = 2; // "L" — "1" and "9" appear together before it

const CHAR_DURATION_MS = 700;
const LETTER_STAGGER_MS = 90;
// League starts slightly before "19" finishes settling — a touch of overlap
// reads as one continuous, fluid motion rather than two separate steps.
const LEAGUE_START_DELAY_MS = 550;
// A very smooth, gentle deceleration (easeOutExpo-ish).
const SMOOTH_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function delayFor(index: number): number {
  if (index < LEAGUE_START_INDEX) return 0;
  return LEAGUE_START_DELAY_MS + (index - LEAGUE_START_INDEX) * LETTER_STAGGER_MS;
}

const REVEAL_DONE_MS = delayFor(CHARS.length - 1) + CHAR_DURATION_MS;
const HOLD_MS = 550; // full "19League" held once fully revealed
const FADE_MS = 550; // whole screen fading out

type Phase = "pre" | "visible" | "out" | "done";

// One-time brand splash on a cold app open (root layout only mounts this
// once per real page load — client-side tab navigation never remounts it,
// so switching tabs never re-triggers it).
export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("pre");

  // A tick after mount so the browser paints the "pre" (hidden) state
  // first — flipping straight to "visible" in the same frame would skip
  // every character's enter transition entirely.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("visible"));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "visible") return;
    const t = setTimeout(() => setPhase("out"), REVEAL_DONE_MS + HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  const visible = phase !== "pre";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{
        backgroundColor: SPLASH_GREEN,
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ${SMOOTH_EASE}`,
      }}
    >
      <div
        className={`${leagueGothic.className} whitespace-nowrap text-6xl uppercase leading-none tracking-wide`}
        style={{ fontWeight: 700 }}
      >
        {CHARS.map((ch, i) => (
          <span
            key={i}
            className="inline-block"
            style={{
              color: SPLASH_BLACK,
              opacity: visible ? 1 : 0,
              filter: visible ? "blur(0px)" : "blur(8px)",
              transform: visible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.9)",
              transition: [
                `opacity ${CHAR_DURATION_MS}ms ${SMOOTH_EASE} ${delayFor(i)}ms`,
                `filter ${CHAR_DURATION_MS}ms ${SMOOTH_EASE} ${delayFor(i)}ms`,
                `transform ${CHAR_DURATION_MS}ms ${SMOOTH_EASE} ${delayFor(i)}ms`,
              ].join(", "),
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
