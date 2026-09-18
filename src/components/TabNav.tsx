"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

function ChatBar() {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const latest = messages[messages.length - 1];

  return (
    <Link
      href="/chat"
      onClick={() => {
        if (latest) localStorage.setItem(SEEN_KEY, latest.id);
      }}
      className="mx-auto flex max-w-lg items-center gap-2.5 rounded-t-2xl bg-led px-4 py-2.5 text-pill-text transition-transform active:scale-[0.98]"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H9l-3.6 3v-3H4.5A1.5 1.5 0 0 1 3 11.5Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">Chat</span>
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pill-text px-1 text-[10px] font-bold text-led">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-pill-text/80">
          {latest ? `${latest.authorName}: ${latest.body}` : "No messages yet"}
        </p>
      </div>
    </Link>
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
      {pathname !== "/chat" && <ChatBar />}
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
