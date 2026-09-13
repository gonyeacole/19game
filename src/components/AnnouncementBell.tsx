"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AnnouncementDTO {
  id: string;
  message: string;
  createdAt: string;
}

// Nobody logs in as a regular viewer, so "unread" is tracked per-browser
// via localStorage rather than server-side per-user state.
const SEEN_KEY = "lastSeenAnnouncementId";
const POLL_MS = 60_000;

export default function AnnouncementBell() {
  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target (document.body) is unavailable during SSR/render
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        const data: { announcements: AnnouncementDTO[] } = await res.json();
        setAnnouncements(data.announcements);

        const seenId = localStorage.getItem(SEEN_KEY);
        const seenIndex = seenId
          ? data.announcements.findIndex((a) => a.id === seenId)
          : -1;
        setUnreadCount(seenIndex === -1 ? data.announcements.length : seenIndex);
      } catch {
        // Best-effort — announcements aren't on the critical path.
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const openPanel = () => {
    setOpen(true);
    setUnreadCount(0);
    if (announcements[0]) {
      localStorage.setItem(SEEN_KEY, announcements[0].id);
    }
  };

  return (
    <>
      <button
        onClick={openPanel}
        aria-label="Announcements"
        className="relative shrink-0 rounded-full border border-line bg-panel-3 p-1.5 text-chalk-dim transition-transform active:scale-90"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M5.5 8.5a4.5 4.5 0 0 1 9 0c0 3.2 1 4.3 1.3 4.7a.5.5 0 0 1-.4.8H4.6a.5.5 0 0 1-.4-.8c.3-.4 1.3-1.5 1.3-4.7Z" />
          <path d="M8.3 15.5a1.7 1.7 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-led text-[10px] font-bold text-pill-text">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
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
                <h3 className="text-sm font-bold text-chalk">Announcements</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1 text-icon transition-transform active:scale-90"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 max-h-96 overflow-y-auto">
                {announcements.length === 0 ? (
                  <div className="py-6 text-center text-sm text-chalk-faint">
                    No announcements yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {announcements.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-lg border border-led/20 bg-led-bg p-3"
                      >
                        <p className="whitespace-pre-wrap text-sm text-chalk">
                          {a.message}
                        </p>
                        <div className="mt-1.5 text-xs text-chalk-faint">
                          {new Date(a.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
