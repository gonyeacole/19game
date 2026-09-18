"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ChatContent from "@/components/ChatContent";

const TABS = [
  {
    href: "/scores",
    label: "Scores",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="10" rx="1.5" />
        <line x1="10" y1="3" x2="10" y2="13" />
        <circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="8" r="1" fill="currentColor" stroke="none" />
        <line x1="6" y1="16" x2="6" y2="18" />
        <line x1="14" y1="16" x2="14" y2="18" />
      </svg>
    ),
  },
  {
    href: "/teams",
    label: "Teams",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.5 2.3 3 4.4 1.4 8l2.5 1.5 1.6-1.2V17a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8.3l1.6 1.2L18.6 8 17 4.4l-3.5-2.1-1.7 1.2a2.3 2.3 0 0 1-3.6 0Z" />
        <text x="10" y="14.2" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="var(--color-panel-2)">
          7
        </text>
      </svg>
    ),
  },
  {
    href: "/pot",
    label: "Pot",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M6 6 L7.2 3.5 L12.8 3.5 L14 6 Q17 9.5 17 13 Q17 17.5 10 17.5 Q3 17.5 3 13 Q3 9.5 6 6 Z" />
        <text x="10" y="13.3" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="var(--color-panel-2)">
          $
        </text>
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="10" cy="10" r="4.8" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <g fill="currentColor" stroke="none">
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(0 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(45 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(90 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(135 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(180 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(225 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(270 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(315 10 10)" />
        </g>
      </svg>
    ),
  },
] as const;

interface MessageDTO {
  id: string;
  authorName: string;
  body: string;
}

// Nobody logs in as a regular viewer, so "unread" is tracked per-browser
// via localStorage rather than server-side per-user state — same pattern
// as AnnouncementBell.
const SEEN_KEY = "lastSeenMessageId";
const POLL_MS = 15_000;

const COLLAPSED_HEIGHT = 60;
const EXPANDED_RATIO = 0.6; // fraction of the viewport height when swiped open, keyboard closed
const KEYBOARD_TOP_MARGIN = 60; // px left visible above the sheet once the keyboard is open
const DRAG_TAP_THRESHOLD = 6; // px of movement below which a drag counts as a tap
const SNAP_MS = 220;

function ChatSheet() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(COLLAPSED_HEIGHT);
  // Real touch input can fire pointer events faster than React re-renders
  // (they can land in the same event-loop turn as the state update that's
  // supposed to gate or inform the next one), so pointer handlers read
  // these refs instead of the state/closure versions — always current,
  // unlike a value closed over from a stale render.
  const heightRef = useRef(COLLAPSED_HEIGHT);
  const setHeightTracked = (next: number) => {
    heightRef.current = next;
    setHeight(next);
  };
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const [expandedHeight, setExpandedHeight] = useState(480);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(COLLAPSED_HEIGHT);
  const draggedRef = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    const update = () => {
      setViewportHeight(window.innerHeight);
      setExpandedHeight(Math.round(window.innerHeight * EXPANDED_RATIO));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // The keyboard only ever opens from an input inside the expanded sheet,
  // so this doubly serves as "hide the tab row too while typing" (same
  // data-keyboard-open attribute/CSS rule ChatPage's standalone version
  // uses) and "keep the sheet itself above the keyboard" by shrinking its
  // resting height by the same amount.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height);
      setKeyboardInset(inset);
      document.documentElement.dataset.keyboardOpen =
        inset > 40 ? "true" : "false";
    };
    vv.addEventListener("resize", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      delete document.documentElement.dataset.keyboardOpen;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        const data: { messages: MessageDTO[] } = await res.json();
        setMessages(data.messages);

        const seenId = localStorage.getItem(SEEN_KEY);
        const seenIndex = seenId
          ? data.messages.findIndex((m) => m.id === seenId)
          : -1;
        setUnreadCount(
          seenIndex === -1
            ? data.messages.length
            : data.messages.length - 1 - seenIndex
        );
      } catch {
        // Best-effort — the preview isn't on the critical path.
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // While the keyboard is open, filling most of the space above it (rather
  // than staying capped at the normal 60%-of-screen resting height minus
  // the keyboard) matters far more than leaving the underlying page
  // peeking through — the user is actively typing, not browsing.
  const effectiveExpandedHeight =
    keyboardInset > 0
      ? Math.max(COLLAPSED_HEIGHT, viewportHeight - keyboardInset - KEYBOARD_TOP_MARGIN)
      : expandedHeight;

  // Snap to the resting height for whichever state we're in, whenever it's
  // not the user's own finger actively controlling height.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the live drag height to the target resting state (expanded/collapsed/keyboard-adjusted), not derivable during render
    if (!dragging) setHeightTracked(expanded ? effectiveExpandedHeight : COLLAPSED_HEIGHT);
  }, [expanded, effectiveExpandedHeight, dragging]);

  // Collapse on navigating to a different tab, and mark the latest message
  // seen the moment it's actually opened (not just tapped).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local UI state in response to a route change, not derivable during render
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!expanded) return;
    const latest = messages[messages.length - 1];
    if (latest) localStorage.setItem(SEEN_KEY, latest.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the badge as a side effect of the sheet being opened, not derivable during render
    setUnreadCount(0);
  }, [expanded, messages]);

  if (pathname === "/chat") return null;

  const latest = messages[messages.length - 1];

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = heightRef.current;
    draggedRef.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = dragStartYRef.current - e.clientY; // positive = finger moved up
    draggedRef.current = Math.max(draggedRef.current, Math.abs(delta));
    const next = Math.min(
      effectiveExpandedHeight,
      Math.max(COLLAPSED_HEIGHT, dragStartHeightRef.current + delta)
    );
    setHeightTracked(next);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (draggedRef.current < DRAG_TAP_THRESHOLD) {
      setExpanded((prev) => !prev);
      return;
    }
    const midpoint = (COLLAPSED_HEIGHT + effectiveExpandedHeight) / 2;
    setExpanded(heightRef.current > midpoint);
  };

  return (
    <div
      style={{
        height,
        transition: dragging ? "none" : `height ${SNAP_MS}ms ease-out`,
      }}
      className="mx-auto flex max-w-lg flex-col overflow-hidden rounded-t-2xl bg-field"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="shrink-0 touch-none select-none bg-led px-4 pb-2.5 pt-2 text-pill-text"
      >
        <div className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-pill-text/40" />
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
            <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H9l-3.6 3v-3H4.5A1.5 1.5 0 0 1 3 11.5Z" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold">Chat</span>
              {!expanded && unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pill-text px-1 text-[10px] font-bold text-led">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {!expanded && (
              <p className="truncate text-xs text-pill-text/80">
                {latest ? `${latest.authorName}: ${latest.body}` : "No messages yet"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatContent />
      </div>
    </div>
  );
}

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20"
      // GPU-layer isolation for standalone iOS (see git history, 78b0727).
      style={{ transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}
      aria-label="Primary"
    >
      <ChatSheet />
      <div className="safe-bottom border-t border-line bg-field">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
            const className = `flex flex-col items-center gap-1 pb-1 pt-1 text-xs font-semibold transition-colors ${
              active ? "text-led" : "text-icon"
            }`;
            return (
              <li key={tab.href}>
                <Link href={tab.href} className={className}>
                  <span className="h-6 w-6">{tab.icon}</span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
