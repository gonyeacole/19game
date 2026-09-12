"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Platform = "ios" | "android" | "chrome";

const STEPS: Record<Platform, { label: string; steps: string[] }> = {
  ios: {
    label: "iPhone / iPad (Safari)",
    steps: [
      'Tap the Share icon (square with an arrow) in the toolbar.',
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" in the top right.',
    ],
  },
  android: {
    label: "Android (Chrome)",
    steps: [
      "Tap the three-dot menu in the top right.",
      'Tap "Add to Home screen" (or "Install app").',
      'Tap "Add" / "Install" to confirm.',
    ],
  },
  chrome: {
    label: "Google Chrome (desktop)",
    steps: [
      "Click the install icon (a monitor with a down arrow) in the address bar — or open the three-dot menu.",
      'Click "Install 19 League..." (or "Cast, save, and share" → "Install page as app").',
      'Click "Install" to confirm.',
    ],
  },
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "chrome";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "chrome";
}

export default function AddToHomeScreen() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("chrome");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads navigator.userAgent, unavailable during SSR/render
    setPlatform(detectPlatform());
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <div className="px-4 pb-4 pt-2 text-center">
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-chalk-faint underline underline-offset-2 transition-transform active:scale-95"
        >
          📲 Want to add 19 League to your home screen?
        </button>
      </div>

      {open && (
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
                      ? "bg-led text-[#1a1200]"
                      : "bg-panel-3 text-chalk-faint"
                  }`}
                >
                  {p === "ios" ? "Safari" : p === "android" ? "Android" : "Chrome"}
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
        </div>
      )}
    </>
  );
}
