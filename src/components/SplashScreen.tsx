"use client";

import { useEffect, useState } from "react";
import { leagueGothic } from "@/lib/fonts";

// Matches the app icon's green/near-black — literal hex rather than the
// theme's --color-* tokens so the splash looks the same in light or dark
// mode, like a fixed brand screen rather than themed UI.
const SPLASH_GREEN = "#00dd94";
const SPLASH_BLACK = "#0a0a0a";

const HOLD_MS = 900;
const FADE_MS = 400;

// One-time brand splash on a cold app open (root layout only mounts this
// once per real page load — client-side tab navigation never remounts it,
// so switching tabs never re-triggers it).
export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "done">("in");

  useEffect(() => {
    // A tick after mount so the browser paints the "in" (scaled-down,
    // transparent) state first — flipping straight to "hold" in the same
    // frame would skip the enter transition entirely.
    const raf = requestAnimationFrame(() => setPhase("hold"));
    return () => cancelAnimationFrame(raf);
  }, []);

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

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-[400ms] ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: SPLASH_GREEN }}
    >
      <span
        className={`${leagueGothic.className} text-6xl uppercase leading-none tracking-wide transition-all duration-500 ease-out ${
          phase === "in" ? "scale-50 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{ fontWeight: 700, color: SPLASH_BLACK }}
      >
        19League
      </span>
    </div>
  );
}
