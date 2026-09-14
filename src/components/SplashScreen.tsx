"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { leagueGothic } from "@/lib/fonts";

// Matches the app icon's green/near-black — literal hex rather than the
// theme's --color-* tokens so the splash looks the same in light or dark
// mode, like a fixed brand screen rather than themed UI.
const SPLASH_GREEN = "#00dd94";
const SPLASH_BLACK = "#0a0a0a";

const LEAGUE_LETTERS = "League".split("");
// Must match the Tailwind duration-500 class on the "19" span below — the
// letter reveal can't start until that scale/opacity transition finishes.
const ENTER_TRANSITION_MS = 500;
const LETTER_STAGGER_MS = 140; // gap between each "League" letter appearing
const HOLD_MS = 500; // full "19League" held once fully revealed
const FADE_MS = 450; // whole screen fading out

type Phase = "pre" | "entering" | "revealing" | "hold" | "out" | "done";

// One-time brand splash on a cold app open (root layout only mounts this
// once per real page load — client-side tab navigation never remounts it,
// so switching tabs never re-triggers it). Sequence: "19" scales/fades in
// alone and centered, then "League"'s letters fade in one at a time to its
// right (smoothly re-centering the whole mark as it grows), then a brief
// hold, then the whole screen fades out.
export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("pre");
  const [revealedCount, setRevealedCount] = useState(0);
  const [letterWidths, setLetterWidths] = useState<number[] | null>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Measure the pixel width of "League" after each additional letter, in
  // the real splash font, so the reveal wrapper's width can be transitioned
  // smoothly instead of jumping — waiting for the font to finish loading
  // first avoids measuring against a fallback font's (different) widths.
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled || !measureRef.current) return;
      const widths = LEAGUE_LETTERS.map((_, i) => {
        measureRef.current!.textContent = LEAGUE_LETTERS.slice(0, i + 1).join("");
        return measureRef.current!.getBoundingClientRect().width;
      });
      setLetterWidths(widths);
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    } else {
      measure();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // A tick after mount so the browser paints the "pre" (scaled-down,
  // transparent) state first — flipping straight to "entering" in the same
  // frame would skip the enter transition entirely.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("entering"));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "entering") return;
    const t = setTimeout(() => setPhase("revealing"), ENTER_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealing" || !letterWidths || revealedCount >= LEAGUE_LETTERS.length) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), LETTER_STAGGER_MS);
    return () => clearTimeout(t);
  }, [phase, revealedCount, letterWidths]);

  useEffect(() => {
    if (phase !== "revealing" || !letterWidths || revealedCount < LEAGUE_LETTERS.length) return;
    const t = setTimeout(() => setPhase("hold"), 0);
    return () => clearTimeout(t);
  }, [phase, revealedCount, letterWidths]);

  useEffect(() => {
    if (phase !== "hold") return;
    const t = setTimeout(() => setPhase("out"), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  const wrapperWidth = revealedCount === 0 ? 0 : (letterWidths?.[revealedCount - 1] ?? 0);
  const nineteenVisible = phase !== "pre";

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-[450ms] ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: SPLASH_GREEN }}
    >
      <span
        ref={measureRef}
        aria-hidden
        className={`${leagueGothic.className} pointer-events-none whitespace-nowrap text-6xl uppercase leading-none tracking-wide`}
        style={{ fontWeight: 700, position: "absolute", left: -9999, top: 0 }}
      />
      <div className="flex items-center">
        <span
          className={`${leagueGothic.className} whitespace-nowrap text-6xl uppercase leading-none tracking-wide transition-all duration-500 ease-out ${
            nineteenVisible ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
          style={{ fontWeight: 700, color: SPLASH_BLACK }}
        >
          19
        </span>
        <span
          className="inline-block overflow-hidden whitespace-nowrap transition-[width] duration-200 ease-out"
          style={{ width: wrapperWidth }}
        >
          <span
            className={`${leagueGothic.className} whitespace-nowrap text-6xl uppercase leading-none tracking-wide`}
            style={{ fontWeight: 700, color: SPLASH_BLACK }}
          >
            {LEAGUE_LETTERS.map((letter, i) => (
              <span
                key={i}
                className="inline-block transition-opacity duration-200 ease-out"
                style={{ opacity: revealedCount > i ? 1 : 0 }}
              >
                {letter}
              </span>
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}
