"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { leagueGothic, teletext } from "@/lib/fonts";
import { useRetroMode } from "@/lib/retroMode";

// Matches the app icon's green/near-black — literal hex rather than the
// theme's --color-* tokens so the splash looks the same in light or dark
// mode, like a fixed brand screen rather than themed UI.
const SPLASH_GREEN = "#00dd94";
const SPLASH_BLACK = "#0a0a0a";

// Retro splash — a black terminal screen with a blinking cursor typing out
// "19 LEAGUE" then, after a pause simulating pressing Enter, "RETRO WEEK"
// on a second line, in the same green as the header's own "League" text
// (--color-led) — a completely different animation from the normal
// splash's fade/slide, not just a font swap.
const RETRO_GREEN = "#00ff00";
const RETRO_LINE_1 = "19 LEAGUE";
const RETRO_LINE_2 = "RETRO WEEK";
const RETRO_CHAR_MS = 190; // per-character typing speed
const RETRO_ENTER_PAUSE_MS = 800; // extra pause simulating pressing Enter between lines
const RETRO_TOTAL_CHARS = RETRO_LINE_1.length + RETRO_LINE_2.length;
const RETRO_REVEAL_DONE_MS = RETRO_TOTAL_CHARS * RETRO_CHAR_MS + RETRO_ENTER_PAUSE_MS;
const RETRO_HOLD_MS = 1500; // fully-typed text held on screen before fading out

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

// The actual show/skip decision (and the localStorage read/write behind it)
// happens in SPLASH_INIT_SCRIPT in layout.tsx, which runs before the browser
// paints anything — this component just reads the result off <html> rather
// than redoing that check itself. Redoing it here would also be wrong, not
// just redundant: SPLASH_INIT_SCRIPT already stamped "now" as the last-open
// time by the time this runs, so a second independent check would always
// see an ~instant gap and conclude "skip" even on a genuine first visit.
function shouldSkipSplash(): boolean {
  return document.documentElement.dataset.splash === "skip";
}

// A solid block, not a font glyph — Bedstead's Unicode coverage can't be
// counted on to include a cursor-shaped character, so this blinks via CSS
// instead of relying on the font to render one.
function RetroCursor() {
  return <span aria-hidden className="retro-cursor ml-0.5 inline-block align-middle" style={{ backgroundColor: RETRO_GREEN }} />;
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
  const retro = useRetroMode();
  const [phase, setPhase] = useState<Phase>("pre");
  const leagueRef = useRef<HTMLSpanElement>(null);
  const nineteenRef = useRef<HTMLSpanElement>(null);
  const [typedCount, setTypedCount] = useState(0);
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

  // Retro's typewriter reveal — one character per tick, with an extra pause
  // right after "19 LEAGUE" finishes to simulate hitting Enter before
  // "RETRO WEEK" starts. A plain incrementing counter (not the fixed-layout,
  // CSS-delay approach the normal animation above uses) since this is a
  // handful of characters shown once, briefly — reflow cost doesn't matter
  // here the way it would for a 60fps-critical animation.
  useEffect(() => {
    if (!retro || phase !== "visible") return;
    let cancelled = false;
    let count = 0;
    const tick = () => {
      if (cancelled) return;
      count++;
      setTypedCount(count);
      if (count >= RETRO_TOTAL_CHARS) return;
      const delay = count === RETRO_LINE_1.length ? RETRO_ENTER_PAUSE_MS : RETRO_CHAR_MS;
      setTimeout(tick, delay);
    };
    const t = setTimeout(tick, RETRO_CHAR_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [retro, phase]);

  useEffect(() => {
    if (phase !== "visible") return;
    const revealDoneMs = retro ? RETRO_REVEAL_DONE_MS : REVEAL_DONE_MS;
    const holdMs = retro ? RETRO_HOLD_MS : HOLD_MS;
    const t = setTimeout(() => setPhase("out"), revealDoneMs + holdMs);
    return () => clearTimeout(t);
  }, [phase, retro]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  const visible = phase !== "pre";

  if (retro) {
    const line1Visible = Math.min(typedCount, RETRO_LINE_1.length);
    const line2Visible = Math.max(0, typedCount - RETRO_LINE_1.length);
    const line2Started = line2Visible > 0;

    return (
      <div
        id="splash-root"
        className="fixed inset-0 z-40 flex items-center justify-center"
        style={{
          backgroundColor: "#000000",
          opacity: phase === "out" ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ${SMOOTH_EASE}`,
        }}
      >
        <div
          className={`${teletext.className} flex flex-col items-center gap-2 text-center text-4xl uppercase leading-none tracking-wide`}
          style={{ color: RETRO_GREEN, fontWeight: 700 }}
        >
          <div>
            {RETRO_LINE_1.slice(0, line1Visible)}
            {!line2Started && <RetroCursor />}
          </div>
          <div>
            {RETRO_LINE_2.slice(0, line2Visible)}
            {line2Started && <RetroCursor />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="splash-root"
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
