"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface MessageDTO {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  replyTo: { id: string; authorName: string; body: string } | null;
  reactions: { authorName: string; emoji: string }[];
}

// Fixed set rather than a full emoji keyboard — a single tap beats a
// searchable picker for a friend-group chat, and a consistent set renders
// the same across everyone's devices.
const REACTION_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function groupReactions(
  reactions: { authorName: string; emoji: string }[],
  myName: string | null
): { emoji: string; count: number; mine: boolean }[] {
  const byEmoji = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (r.authorName === myName) cur.mine = true;
    byEmoji.set(r.emoji, cur);
  }
  return [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}

interface TeamDTO {
  logoUrl: string | null;
  player: { name: string } | null;
}

const NAME_KEY = "chatDisplayName";
const POLL_MS = 6_000;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// A stable, deliberately dark-ish palette (rather than a raw HSL-from-
// hash) — keeps white initials readable against every entry regardless of
// name, instead of occasionally landing on a hue too light for that
// contrast. Independent of the app's own theme colors on purpose, so
// avatars stay recognizable across both themes.
const AVATAR_COLORS = [
  "#c0392b", "#d35400", "#16a085", "#2980b9", "#8e44ad",
  "#27ae60", "#e74c3c", "#2c3e50", "#e67e22", "#1abc9c",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// The actual chat UI — message list, input, name picker — with no opinion
// about how much space it's given. Used both by the standalone /chat page
// (sized via .chat-viewport) and TabNav's draggable chat sheet (sized via
// its drag height), so all of the fetching/sending/naming logic lives here
// once instead of twice.
export default function ChatContent() {
  const [name, setName] = useState<string | null>(null);
  const [poolNames, setPoolNames] = useState<string[]>([]);
  const [teamLogoByName, setTeamLogoByName] = useState<Map<string, string>>(
    new Map()
  );
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageDTO | null>(null);
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Closes the open reaction picker on an outside click. A ref-based check
  // rather than a full-viewport backdrop overlay: the chat sheet wrapper
  // (TabNav's draggable container) sets `will-change: transform` for the
  // drag animation, which makes it the containing block for any
  // `position: fixed` descendant — so a "fixed inset-0" backdrop nested in
  // here only ever covers the sheet's own box, not the real viewport.
  useEffect(() => {
    if (!openPickerFor) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerFor(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPickerFor]);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR/render
    setName(stored);
  }, []);

  useEffect(() => {
    fetch("/api/teams", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: { teams: TeamDTO[] }) => {
        const names = d.teams
          .map((t) => t.player?.name)
          .filter((n): n is string => Boolean(n));
        setPoolNames(names);

        const logos = new Map<string, string>();
        for (const t of d.teams) {
          if (t.player && t.logoUrl) logos.set(t.player.name, t.logoUrl);
        }
        setTeamLogoByName(logos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        const data: { messages: MessageDTO[] } = await res.json();
        const el = listRef.current;
        if (el) {
          stickToBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }
        setMessages(data.messages);
      } catch {
        // Best-effort — chat isn't on the critical path.
      } finally {
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const saveName = (newName: string) => {
    localStorage.setItem(NAME_KEY, newName);
    setName(newName);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !name || sending) return;
    setSending(true);
    setDraft("");
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, body: text, replyToId }),
      });
      const data: { message: MessageDTO } = await res.json();
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, data.message]);
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!name) return;
    setOpenPickerFor(null);
    // Optimistic — flip it locally now, reconciled by the next poll either
    // way, so a slow/failed request doesn't leave the tap feeling ignored.
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const already = m.reactions.some(
          (r) => r.authorName === name && r.emoji === emoji
        );
        const reactions = already
          ? m.reactions.filter(
              (r) => !(r.authorName === name && r.emoji === emoji)
            )
          : [...m.reactions, { authorName: name, emoji }];
        return { ...m, reactions };
      })
    );
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, emoji }),
      });
    } catch {
      // Best-effort — next poll reconciles either way.
    }
  };

  return (
    <div className="flex h-full flex-col py-2">
      <div className="mb-2 flex shrink-0 items-center justify-between px-4">
        <h2 className="text-sm font-bold text-chalk">Messages</h2>
        {/*
          A native <select> rather than a custom dropdown — no text input
          means none of the iOS autofill/keyboard-toolbar issues earlier
          chat inputs ran into, and it gets a real native picker for free.
          Falls back to including the current name as its own option if
          it's somehow not in the pool list (e.g. a name set before this
          existed), so the pill never shows something other than what's
          actually selected.

          It's invisible and laid on top of a plain, purely visual pill
          instead of being the visible pill itself: a native select's own
          closed-state width is sized to fit its WIDEST option (e.g.
          "Christopher Alexander"), not the selected value — so a short
          name like "Cole" would otherwise sit inside a pill padded out
          with a large empty gap no matter how the select is styled. The
          visible pill below sizes itself to the selected name alone; the
          select just has to sit exactly on top of it to stay tappable and
          keep the real native picker on open.
        */}
        <div className="relative inline-flex max-w-[9rem] items-center gap-1 rounded-full border border-line bg-panel-2 py-1 pl-3 pr-7 text-xs font-medium text-chalk">
          <span className="truncate" aria-hidden="true">
            {name ?? "Pick your name"}
          </span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-chalk-faint"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
          <select
            value={name ?? ""}
            onChange={(e) => saveName(e.target.value)}
            aria-label="Your name"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
          >
            <option value="" disabled>
              Pick your name
            </option>
            {(name && !poolNames.includes(name) ? [name, ...poolNames] : poolNames).map(
              (n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-chalk-faint">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-chalk-faint">
            No messages yet. Say hi.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const logoUrl = teamLogoByName.get(m.authorName);
              return (
                <div key={m.id} className="flex items-start gap-2.5">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 shrink-0 rounded-full bg-panel-2 object-contain p-0.5"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: avatarColor(m.authorName) }}
                    >
                      {m.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="block w-full rounded-2xl border border-line bg-panel px-3 py-2">
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-base font-bold text-chalk">
                          {m.authorName}
                        </span>
                        <span className="text-sm text-chalk-faint">
                          {timeLabel(m.createdAt)}
                        </span>
                        {name && (
                          <button
                            onClick={() => setReplyingTo(m)}
                            className="text-sm font-semibold text-chalk-faint underline underline-offset-2"
                          >
                            Reply
                          </button>
                        )}
                      </div>

                      {m.replyTo && (
                        <div className="mt-1 rounded-lg border border-line bg-panel-3 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-sm font-semibold text-chalk-faint">
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3 shrink-0"
                            >
                              <path d="M12 6 6 10l6 4M6 10h6a4 4 0 0 1 4 4v1" />
                            </svg>
                            {m.replyTo.authorName}
                          </div>
                          <p className="truncate text-sm text-chalk-faint">
                            {m.replyTo.body}
                          </p>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap break-words text-base text-chalk">
                        {m.body}
                      </p>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {groupReactions(m.reactions, name).map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => toggleReaction(m.id, r.emoji)}
                          disabled={!name}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                            r.mine
                              ? "border-led bg-led-bg text-led"
                              : "border-line bg-panel-2 text-chalk-faint"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.count}</span>
                        </button>
                      ))}
                      {name && (
                        <div
                          className="relative"
                          ref={openPickerFor === m.id ? pickerRef : undefined}
                        >
                          <button
                            onClick={() =>
                              setOpenPickerFor((cur) =>
                                cur === m.id ? null : m.id
                              )
                            }
                            aria-label="Add reaction"
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-panel-2 text-sm leading-none text-chalk-faint"
                          >
                            +
                          </button>
                          {openPickerFor === m.id && (
                            <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-1 rounded-full border border-line bg-panel px-2 py-1 shadow-lg">
                              {REACTION_EMOJI.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className="text-base leading-none"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {replyingTo && (
        <div className="mx-4 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-led">
              Replying to {replyingTo.authorName}
            </div>
            <div className="truncate text-sm text-chalk-faint">
              {replyingTo.body}
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="shrink-0 px-1 text-chalk-faint"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        autoComplete="off"
        className="mt-2 flex shrink-0 items-center gap-2 px-4"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder={name ? "Message..." : "Pick a name to chat"}
          disabled={!name}
          // iOS Safari largely ignores the literal string "off" for fields
          // it heuristically decides look like a name/message field — a
          // known, deliberate override — but tends to respect unrecognized
          // values it has no special-cased behavior for.
          autoComplete="not-autofillable"
          name="chat-message-draft"
          className="flex-1 rounded-full border border-line bg-search-bg px-4 py-2.5 text-sm text-chalk outline-none focus:border-led disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!name || !draft.trim() || sending}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-led text-pill-text transition-transform active:scale-90 disabled:opacity-40"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M3.5 10h11M10.5 5.5 16 10l-5.5 4.5" />
          </svg>
        </button>
      </form>
    </div>
  );
}
