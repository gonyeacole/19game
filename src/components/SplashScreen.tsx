"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
// avoids that class of jank entirely. "19" additionally slides in from a
// measured offset via `transform: translateX`, another compositor-only
// property, so it can start dead-center on screen and glide into its final
// spot alongside "League" without ever touching layout either.
const NINETEEN = ["1", "9"];
const LEAGUE_LETTERS = ["L", "e", "a", "g", "u", "e"];

const CHAR_DURATION_MS = 700;
const LETTER_STAGGER_MS = 90;
// League starts slightly before "19" finishes settling — a touch of overlap
// reads as one continuous, fluid motion rather than two separate steps.
const LEAGUE_START_DELAY_MS = 550;
// A very smooth, gentle deceleration (easeOutExpo-ish).
const SMOOTH_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const REVEAL_DONE_MS =
  LEAGUE_START_DELAY_MS + (LEAGUE_LETTERS.length - 1) * LETTER_STAGGER_MS + CHAR_DURATION_MS;
const SLIDE_DURATION_MS = REVEAL_DONE_MS - LEAGUE_START_DELAY_MS;
const HOLD_MS = 550; // full "19League" held once fully revealed
const FADE_MS = 550; // whole screen fading out

type Phase = "pre" | "visible" | "out" | "done";

function charStyle(delay: number, visible: boolean): React.CSSProperties {
  return {
    color: SPLASH_BLACK,
    opacity: visible ? 1 : 0,
    filter: visible ? "blur(0px)" : "blur(8px)",
    transform: visible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.9)",
    transition: [
      `opacity ${CHAR_DURATION_MS}ms ${SMOOTH_EASE} ${delay}ms`,
      `filter ${CHAR_DURATION_MS}ms ${SMOOTH_EASE} ${delay}ms`,
      `transform ${CHAR_DURATION_MS}ms ${SMOOTH_EASE} ${delay}ms`,
    ].join(", "),
  };
}

// One-time brand splash on a cold app open (root layout only mounts this
// once per real page load — client-side tab navigation never remounts it,
// so switching tabs never re-triggers it).
export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("pre");
  const leagueRef = useRef<HTMLSpanElement>(null);
  const nineteenRef = useRef<HTMLSpanElement>(null);

  // Positions "19" dead-center (offset right by half of "League"'s width,
  // which compensates for "19" otherwise sitting left-of-center as the
  // first two characters of the full word) using direct DOM writes rather
  // than React state. Relying on React re-renders plus requestAnimationFrame
  // to sequence "paint the offset" then "paint the transition to 0" is
  // fragile — batching can collapse both into a single paint, in which case
  // the browser never actually renders the offset frame and "19" jumps
  // straight to its final spot with nothing to visibly slide from. Forcing
  // a synchronous style read (a reflow) between the two writes below is the
  // standard, reliable way to guarantee the browser commits the first state
  // before the second one is allowed to transition.
  useLayoutEffect(() => {
    const nineteenEl = nineteenRef.current;
    const leagueEl = leagueRef.current;
    if (!nineteenEl || !leagueEl) return;

    const offset = leagueEl.getBoundingClientRect().width / 2;
    nineteenEl.style.transition = "none";
    nineteenEl.style.transform = `translateX(${offset}px)`;
    // Force the browser to apply the line above before continuing — without
    // this read, the assignment just below could be batched together with
    // it and never get painted on its own.
    void nineteenEl.getBoundingClientRect();
    nineteenEl.style.transition = `transform ${SLIDE_DURATION_MS}ms ${SMOOTH_EASE} ${LEAGUE_START_DELAY_MS}ms`;
  }, []);

  // A tick after mount so the browser paints the "pre" (hidden) state
  // first — flipping straight to "visible" in the same frame would skip
  // every character's enter transition entirely.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setPhase("visible");
      nineteenRef.current?.style.setProperty("transform", "translateX(0)");
    });
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
        className={`${leagueGothic.className} flex whitespace-nowrap text-6xl uppercase leading-none tracking-wide`}
        style={{ fontWeight: 700 }}
      >
        <span ref={nineteenRef} className="inline-block">
          {NINETEEN.map((ch, i) => (
            <span key={i} className="inline-block" style={charStyle(0, visible)}>
              {ch}
            </span>
          ))}
        </span>
        <span ref={leagueRef} className="inline-block">
          {LEAGUE_LETTERS.map((ch, i) => (
            <span
              key={i}
              className="inline-block"
              style={charStyle(LEAGUE_START_DELAY_MS + i * LETTER_STAGGER_MS, visible)}
            >
              {ch}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
