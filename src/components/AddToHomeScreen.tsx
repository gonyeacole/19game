"use client";

import { useEffect, useRef, useState } from "react";
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

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for "already added to home screen"
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Chrome/Edge fire this instead of letting the browser show its own install
// UI immediately — preventDefault() + stashing it lets us trigger that same
// native "Install this app? Cancel / Install" dialog from our own button,
// on our own timing. Safari (iOS and desktop) never fires this event at
// all — there is no API for triggering its Add to Home Screen from a page,
// so those browsers always fall back to the manual instructions below.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AddToHomeScreen() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("chrome");
  const [installed, setInstalled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads navigator.userAgent, unavailable during SSR/render
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      deferredPrompt.current = null;
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (pathname?.startsWith("/admin") || installed) return null;

  const handleClick = async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) {
      setOpen(true);
      return;
    }
    // The native dialog itself is the "yes or no" — Chrome renders it, not us.
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPrompt.current = null;
    if (outcome === "accepted") setInstalled(true);
  };

  return (
    <>
      <div className="px-4 pb-4 pt-2 text-center">
        <button
          onClick={handleClick}
          className="text-xs font-medium text-chalk-faint underline underline-offset-2 transition-transform active:scale-95"
        >
          Want to add 19 League to your home screen?
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
