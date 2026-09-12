"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import WeekScroller from "@/components/WeekScroller";
import Skeleton from "@/components/Skeleton";
import { venmoPayLink, WEEKLY_DUE } from "@/lib/pool";

const TEAM_COUNT = 32;

interface TeamDTO {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string | null;
  player: { id: string; name: string; venmoUsername: string | null } | null;
}

interface Draft {
  name: string;
  venmoUsername: string;
}

interface PaymentDTO {
  id: string;
  playerId: string;
  weekId: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  won: boolean;
  player: {
    id: string;
    name: string;
    venmoUsername: string | null;
    team: { id: string; name: string; abbreviation: string; logoUrl: string | null };
  };
}

interface PaymentsResponse {
  seasonYear: number;
  weekNumber: number;
  week: { id: string };
  payments: PaymentDTO[];
}

function PlayerCardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
      <Skeleton className="mt-2 h-7 w-16 rounded-full" />
    </div>
  );
}

function PlayerSetup() {
  const [teams, setTeams] = useState<TeamDTO[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/players", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { teams: TeamDTO[] }) => {
        setTeams(data.teams);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const team of data.teams) {
            if (!next[team.id]) {
              next[team.id] = {
                name: team.player?.name ?? "",
                venmoUsername: team.player?.venmoUsername ?? "",
              };
            }
          }
          return next;
        });
      });

  useEffect(() => {
    load();
  }, []);

  const assignedCount = useMemo(
    () => teams?.filter((t) => t.player).length ?? 0,
    [teams]
  );

  const updateDraft = (teamId: string, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }));
  };

  const save = async (teamId: string) => {
    const draft = drafts[teamId];
    if (!draft?.name.trim()) return;
    setSavingId(teamId);
    try {
      await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          name: draft.name,
          venmoUsername: draft.venmoUsername || null,
        }),
      });
      await load();
      setSavedId(teamId);
      setTimeout(() => setSavedId((id) => (id === teamId ? null : id)), 1500);
    } finally {
      setSavingId(null);
    }
  };

  const clear = async (teamId: string) => {
    setSavingId(teamId);
    try {
      await fetch(`/api/players?teamId=${teamId}`, { method: "DELETE" });
      setDrafts((prev) => ({ ...prev, [teamId]: { name: "", venmoUsername: "" } }));
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-sm text-chalk-dim">
          Assign a player, name, and Venmo username to each of the 32 teams.{" "}
          <span className="font-semibold text-chalk">{assignedCount}/32 assigned.</span>
        </p>
      </div>

      {!teams ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: TEAM_COUNT }).map((_, i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {teams.map((team) => {
            const draft = drafts[team.id] ?? { name: "", venmoUsername: "" };
            const dirty =
              draft.name !== (team.player?.name ?? "") ||
              draft.venmoUsername !== (team.player?.venmoUsername ?? "");
            return (
              <div
                key={team.id}
                className="rounded-xl border border-line bg-panel p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  {team.logoUrl ? (
                    <Image
                      src={team.logoUrl}
                      alt=""
                      width={24}
                      height={24}
                      unoptimized
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-panel-3" />
                  )}
                  <span className="text-sm font-semibold text-chalk">{team.name}</span>
                  <span className="text-xs text-chalk-faint">
                    {team.abbreviation}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(team.id, "name", e.target.value)}
                    placeholder="Player name"
                    className="flex-1 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-chalk placeholder:text-chalk-faint"
                  />
                  <input
                    value={draft.venmoUsername}
                    onChange={(e) =>
                      updateDraft(team.id, "venmoUsername", e.target.value)
                    }
                    placeholder="Venmo username"
                    className="flex-1 rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-sm text-chalk placeholder:text-chalk-faint"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => save(team.id)}
                    disabled={!dirty || !draft.name.trim() || savingId === team.id}
                    className="rounded-full bg-win px-3 py-1.5 text-xs font-bold text-pill-text transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
                  >
                    {savingId === team.id ? "Saving..." : "Save"}
                  </button>
                  {team.player && (
                    <button
                      onClick={() => clear(team.id)}
                      disabled={savingId === team.id}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-chalk-dim transition-transform active:scale-95"
                    >
                      Clear
                    </button>
                  )}
                  {savedId === team.id && (
                    <span className="text-xs font-medium text-win">
                      Saved ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-9 rounded-full" />
      </div>
    </div>
  );
}

function Payments() {
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (year?: number, week?: number) => {
    const params = new URLSearchParams();
    if (year != null) params.set("year", String(year));
    if (week != null) params.set("week", String(week));
    const res = await fetch(`/api/payments?${params.toString()}`, {
      cache: "no-store",
    });
    const data: PaymentsResponse = await res.json();
    setSeasonYear(data.seasonYear);
    setWeekNumber(data.weekNumber);
    setPayments(data.payments);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState happens after the await
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectWeek = (week: number) => {
    if (seasonYear == null) return;
    setLoading(true);
    load(seasonYear, week);
  };

  const togglePaid = async (payment: PaymentDTO) => {
    setBusyId(payment.id);
    const next = !payment.paid;
    setPayments(
      (prev) =>
        prev?.map((p) =>
          p.id === payment.id
            ? { ...p, paid: next, paidDate: next ? new Date().toISOString() : null }
            : p
        ) ?? null
    );
    try {
      await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: payment.playerId,
          weekId: payment.weekId,
          paid: next,
        }),
      });
    } finally {
      setBusyId(null);
    }
  };

  const toggleWon = async (payment: PaymentDTO) => {
    setBusyId(payment.id);
    const next = !payment.won;
    setPayments(
      (prev) => prev?.map((p) => (p.id === payment.id ? { ...p, won: next } : p)) ?? null
    );
    try {
      await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: payment.playerId,
          weekId: payment.weekId,
          won: next,
        }),
      });
    } finally {
      setBusyId(null);
    }
  };

  const paidCount = payments?.filter((p) => p.paid).length ?? 0;
  const winners = payments?.filter((p) => p.won) ?? [];

  return (
    <div>
      <WeekScroller weekNumber={weekNumber} onSelect={selectWeek} loading={loading} />

      {payments && (
        <div className="mb-4 text-center text-sm text-chalk-dim">
          {paidCount}/{payments.length} paid this week
          {winners.length > 0 && (
            <div className="mt-1 text-win">
              🏆 {winners.map((w) => w.player.name).join(", ")} won this week
            </div>
          )}
        </div>
      )}

      {loading && !payments ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: TEAM_COUNT }).map((_, i) => (
            <PaymentRowSkeleton key={i} />
          ))}
        </div>
      ) : payments && payments.length === 0 ? (
        <div className="py-10 text-center text-sm text-chalk-faint">
          No players set up yet. Add players under Player Setup.
        </div>
      ) : (
        <div
          className={`flex flex-col gap-2 transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}
        >
          {payments?.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                p.paid
                  ? "border-transparent bg-win-bg shadow-[inset_0_0_0_1px_rgba(78,203,140,0.25)]"
                  : "border-line bg-panel"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-chalk">{p.player.name}</div>
                <div className="truncate text-xs text-chalk-faint">
                  {p.player.team.name}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!p.paid && p.player.venmoUsername && (
                  <a
                    href={venmoPayLink({
                      username: p.player.venmoUsername,
                      amount: WEEKLY_DUE,
                      note: `NFL Pool Week ${weekNumber}`,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-venmo px-3 py-1.5 text-xs font-bold text-white transition-transform active:scale-95"
                  >
                    Pay Venmo
                  </a>
                )}
                <button
                  onClick={() => togglePaid(p)}
                  disabled={busyId === p.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                    p.paid
                      ? "bg-win text-pill-text"
                      : "border border-line text-chalk-dim"
                  }`}
                >
                  {p.paid ? "Paid ✓" : "Mark paid"}
                </button>
                <button
                  onClick={() => toggleWon(p)}
                  disabled={busyId === p.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                    p.won
                      ? "bg-led text-pill-text"
                      : "border border-line text-chalk-dim"
                  }`}
                >
                  {p.won ? "Won 🏆" : "Mark won"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [section, setSection] = useState<"players" | "payments">("players");

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex justify-center gap-2">
        {(["players", "payments"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all active:scale-95 ${
              section === s
                ? "bg-led text-pill-text"
                : "border border-line text-chalk-dim"
            }`}
          >
            {s === "players" ? "Player Setup" : "Payments"}
          </button>
        ))}
      </div>

      {section === "players" ? <PlayerSetup /> : <Payments />}
    </div>
  );
}
