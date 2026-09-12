"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type Platform = "ios" | "android";

const STEPS: Record<Platform, { label: string; steps: string[] }> = {
  ios: {
    label: "iPhone",
    steps: [
      'Tap the "•••" in Safari.',
      'Tap the Share icon (square with an arrow) in the toolbar.',
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" in the top right.',
    ],
  },
  android: {
    label: "Android",
    steps: [
      "Tap the three-dot menu in the top right.",
      'Tap "Add to Home screen" (or "Install app").',
      'Tap "Add" / "Install" to confirm.',
    ],
  },
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "android";
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "android";
}

export default function AddToHomeScreen() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("android");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads navigator.userAgent, unavailable during SSR/render
    setPlatform(detectPlatform());
    setMounted(true);
  }, []);

  const hidden = pathname?.startsWith("/admin");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="How to add to home screen"
        aria-hidden={hidden}
        tabIndex={hidden ? -1 : undefined}
        className={`shrink-0 rounded-full border border-line bg-panel-3 p-1.5 text-chalk-dim transition-transform active:scale-90 ${
          hidden ? "invisible pointer-events-none" : ""
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <path d="M7.5 7.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="14.3" r="0.9" fill="currentColor" />
        </svg>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-line bg-panel p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-chalk">Add to Home Screen</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1 text-chalk-faint transition-transform active:scale-90"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 flex gap-1.5">
                {(Object.keys(STEPS) as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      platform === p
                        ? "bg-led text-[#08150e]"
                        : "bg-panel-3 text-chalk-faint"
                    }`}
                  >
                    {STEPS[p].label}
                  </button>
                ))}
              </div>

              <div className="mt-3 text-xs text-chalk-dim">
                <div className="mb-1.5 font-semibold text-chalk-faint">
                  {STEPS[platform].label}
                </div>
                <ol className="list-decimal space-y-1.5 pl-4">
                  {STEPS[platform].steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
