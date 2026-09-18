"use client";

import { useEffect, useRef } from "react";
import ChatContent from "@/components/ChatContent";

// Standalone fallback for a direct visit to /chat (e.g. a bookmark or
// shared link) — the everyday way in is TabNav's draggable chat sheet,
// which renders the same ChatContent inline over the tab bar instead of
// navigating here.
export default function ChatPage() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The on-screen keyboard shrinks the visual viewport but not 100dvh (dvh
  // only tracks browser chrome, not the keyboard), so without this the
  // input row stays put and ends up hidden underneath the keyboard. Only
  // ever touches a CSS variable on this page's own wrapper. Also hides
  // TabNav while typing (data-keyboard-open, read by globals.css) so the
  // keyboard and chat get the screen to themselves — chat's own height
  // calc drops TabNav's reserved clearance to match, via the same
  // attribute. A 40px threshold (rather than inset > 0) avoids false
  // positives from minor viewport jitter that isn't the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height);
      wrapperRef.current?.style.setProperty("--keyboard-inset", `${inset}px`);
      document.documentElement.dataset.keyboardOpen =
        inset > 40 ? "true" : "false";
    };

    vv.addEventListener("resize", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      delete document.documentElement.dataset.keyboardOpen;
    };
  }, []);

  return (
    <div ref={wrapperRef} className="chat-viewport mx-auto max-w-lg">
      <ChatContent />
    </div>
  );
}
