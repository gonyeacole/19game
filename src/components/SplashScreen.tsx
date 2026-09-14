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
// "19" additionally slides in from a measured offset via
// `transform: translateX`, another compositor-only property, so it can
// start dead-center on screen and glide into its final spot before
// "League" appears — the two phases run one after another, never
// overlapping, so nothing is sliding and fading at the same time.
const NINETEEN = ["1", "9"];
const LEAGUE_LETTERS = ["L", "e", "a", "g", "u", "e"];

const CHAR_DURATION_MS = 650;
const HOLD_BEFORE_SLIDE_MS = 250; // "19" sits still, fully visible, before it moves
const SLIDE_DURATION_MS = 480; // "19" gliding to its final spot
const LETTER_STAGGER_MS = 80; // gap between each "League" letter appearing
// "League" only starts once "19" has fully finished appearing, pausing, and
// sliding into place — kept as its own named constant (rather than derived
// inline) since the DOM-write effect below needs the same number.
const LEAGUE_START_DELAY_MS = CHAR_DURATION_MS + HOLD_BEFORE_SLIDE_MS + SLIDE_DURATION_MS;
// A very smooth, gentle deceleration (easeOutExpo-ish).
const SMOOTH_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const REVEAL_DONE_MS =
  LEAGUE_START_DELAY_MS + (LEAGUE_LETTERS.length - 1) * LETTER_STAGGER_MS + CHAR_DURATION_MS;
const HOLD_MS = 500; // full "19League" held once fully revealed
const FADE_MS = 500; // whole screen fading out

type Phase = "pre" | "visible" | "out" | "done";

const LAST_OPEN_KEY = "splashLastOpenAt";
const SKIP_WINDOW_MS = 5 * 60 * 1000; // don't replay the splash within 5 minutes of the last open

// True the first time ever (nothing stored yet) or once 5+ minutes have
// passed since the last open; false — skip the splash — otherwise. Always
// stamps "now" as the new last-open time so the window is measured from
// whichever open was most recent, not from the very first one.
function shouldSkipSplash(): boolean {
  try {
    const last = window.localStorage.getItem(LAST_OPEN_KEY);
    const now = Date.now();
    window.localStorage.setItem(LAST_OPEN_KEY, String(now));
    if (last == null) return false;
    const lastOpenAt = Number(last);
    return Number.isFinite(lastOpenAt) && now - lastOpenAt < SKIP_WINDOW_MS;
  } catch {
    // Storage unavailable (private browsing, etc.) — default to showing it.
    return false;
  }
}

function charStyle(delay: number, visible: boolean): React.CSSProperties {
  return {
    color: SPLASH_BLACK,
    opacity: visible ? 1 : 0,
    filter: visible ? "blur(0px)" : "blur(5px)",
    transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.94)",
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
  // Mirrors the skip decision outside of state: the RAF callback below fires
  // asynchronously (after this mount's layout effects, including the one
  // that decides to skip, have already run) and needs a same-tick-readable
  // way to know not to flip the phase back to "visible" and resurrect a
  // splash that was just skipped.
  const skippedRef = useRef(false);

  // Runs before paint so a skip never flashes the green screen even for a
  // frame — SSR/first hydration always render the "pre" state (there's no
  // way to know localStorage during server rendering), and this corrects
  // it synchronously before the browser ever paints that frame.
  useLayoutEffect(() => {
    if (!shouldSkipSplash()) return;
    skippedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time check against localStorage, unavailable during render/SSR
    setPhase("done");
  }, []);

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
    nineteenEl.style.transition = `transform ${SLIDE_DURATION_MS}ms ${SMOOTH_EASE} ${CHAR_DURATION_MS + HOLD_BEFORE_SLIDE_MS}ms`;
  }, []);

  // A tick after mount so the browser paints the "pre" (hidden) state
  // first — flipping straight to "visible" in the same frame would skip
  // every character's enter transition entirely.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (skippedRef.current) return;
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
