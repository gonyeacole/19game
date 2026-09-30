"use client";

import { useEffect, useState } from "react";

// A classic terminal spinner — cycles through the same four characters an
// old CLI progress indicator would, instead of a smooth bouncing-dots
// animation. Retro-only; the rest of the app keeps the bouncing dots.
const FRAMES = ["|", "/", "-", "\\"];
const FRAME_MS = 120;

export default function AsciiSpinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span aria-hidden="true" className="inline-block w-3 text-center text-chalk">
      {FRAMES[frame]}
    </span>
  );
}
