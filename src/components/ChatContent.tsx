"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MessageDTO {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface TeamDTO {
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

function NamePickerModal({
  currentName,
  suggestions,
  onSave,
  onClose,
}: {
  currentName: string;
  suggestions: string[];
  onSave: (name: string) => void;
  onClose: (() => void) | null;
}) {
  const [value, setValue] = useState(currentName);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target (document.body) is unavailable during SSR/render
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const trimmed = value.trim();

  // Removing a still-focused input from the DOM (rather than an explicit
  // blur) is a known iOS WebKit keyboard-dismissal glitch — it can leave a
  // stale reservation for the keyboard's space behind. Blurring first, on
  // both paths that unmount this modal, gives WebKit a clean dismissal
  // signal instead.
  const closeAndBlur = (action: () => void) => {
    inputRef.current?.blur();
    action();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
      onClick={() => onClose && closeAndBlur(onClose)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-chalk">
          {currentName ? "Change your name" : "Pick your name"}
        </h3>
        <p className="mt-1 text-xs text-chalk-faint">
          This is how you&apos;ll show up in the group chat. You only need to
          set it once.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) closeAndBlur(() => onSave(trimmed));
          }}
          autoComplete="off"
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            list="chat-name-suggestions"
            // iOS Safari largely ignores the literal string "off" for
            // fields it heuristically decides look like a name field — a
            // known, deliberate override — but tends to respect
            // unrecognized values it has no special-cased behavior for.
            autoComplete="not-autofillable"
            name="chat-display-name"
            className="mt-3 w-full rounded-lg border border-line bg-search-bg px-3 py-2 text-sm text-chalk outline-none focus:border-led"
          />
          <datalist id="chat-name-suggestions">
            {suggestions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <div className="mt-3 flex justify-end gap-2">
            {onClose && (
              <button
                type="button"
                onClick={() => closeAndBlur(onClose)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-chalk-faint"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!trimmed}
              className="rounded-lg bg-led px-4 py-2 text-sm font-bold text-pill-text disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// The actual chat UI — message list, input, name picker — with no opinion
// about how much space it's given. Used both by the standalone /chat page
// (sized via .chat-viewport) and TabNav's draggable chat sheet (sized via
// its drag height), so all of the fetching/sending/naming logic lives here
// once instead of twice.
export default function ChatContent() {
  const [name, setName] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR/render
    setName(stored);
    if (!stored) setShowPicker(true);
  }, []);

  useEffect(() => {
    fetch("/api/teams", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: { teams: TeamDTO[] }) => {
        const names = d.teams
          .map((t) => t.player?.name)
          .filter((n): n is string => Boolean(n));
        setSuggestions(names);
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
    setShowPicker(false);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !name || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, body: text }),
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

  return (
    <div className="flex h-full flex-col px-4 py-2">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-bold text-chalk">Group Chat</h2>
        {name && (
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs font-medium text-placeholder underline underline-offset-2"
          >
            {name} · change name
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl border border-line bg-panel p-3"
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
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const own = m.authorName === name;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${own ? "items-end" : "items-start"}`}
                >
                  {!own && (
                    <span className="px-1 text-[11px] font-semibold text-chalk-faint">
                      {m.authorName}
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      own
                        ? "bg-led text-pill-text"
                        : "bg-panel-3 text-chalk"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                  <span className="px-1 text-[10px] text-chalk-faint">
                    {timeLabel(m.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        autoComplete="off"
        className="mt-2 flex shrink-0 items-center gap-2"
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

      {showPicker && (
        <NamePickerModal
          currentName={name ?? ""}
          suggestions={suggestions}
          onSave={saveName}
          onClose={name ? () => setShowPicker(false) : null}
        />
      )}
    </div>
  );
}
