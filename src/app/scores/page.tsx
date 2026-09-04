"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const WINNING_SCORE = 19;
const POLL_MS = 30_000;

interface PlayerDTO {
  id: string;
  name: string;
  venmoUsername: string | null;
}

interface TeamDTO {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string | null;
  player: PlayerDTO | null;
}

interface GameDTO {
  id: string;
  homeTeam: TeamDTO;
  awayTeam: TeamDTO;
  homeScore: number;
  awayScore: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "FINAL";
  statusDetail: string | null;
  startTime: string | null;
}

interface ScoresResponse {
  seasonYear: number;
  weekNumber: number;
  week: { games: GameDTO[] } | null;
  synced: boolean;
}

function TeamLine({
  team,
  score,
  status,
  isWinningSide,
}: {
  team: TeamDTO;
  score: number;
  status: GameDTO["status"];
  isWinningSide: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
        isWinningSide
          ? "bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-950"
          : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt=""
            width={28}
            height={28}
            className="shrink-0"
            unoptimized
          />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {team.name}
          </div>
          <div className="truncate text-xs text-neutral-500">
            {team.player ? team.player.name : "Unassigned"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isWinningSide && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {status === "FINAL" ? "Winner \u{1F3C6}" : "At 19!"}
          </span>
        )}
        <span
          className={`text-lg font-bold tabular-nums ${
            isWinningSide ? "text-emerald-700 dark:text-emerald-400" : ""
          }`}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

function statusLabel(game: GameDTO): string {
  if (game.status === "SCHEDULED" && game.startTime) {
    return new Date(game.startTime).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return game.statusDetail || game.status;
}

function GameCard({ game }: { game: GameDTO }) {
  const homeAt19 = game.homeScore === WINNING_SCORE;
  const awayAt19 = game.awayScore === WINNING_SCORE;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-500">
        <span
          className={
            game.status === "IN_PROGRESS" ? "text-red-600 dark:text-red-400" : ""
          }
        >
          {game.status === "IN_PROGRESS" && "\u{1F534} "}
          {statusLabel(game)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <TeamLine
          team={game.awayTeam}
          score={game.awayScore}
          status={game.status}
          isWinningSide={awayAt19}
        />
        <TeamLine
          team={game.homeTeam}
          score={game.homeScore}
          status={game.status}
          isWinningSide={homeAt19}
        />
      </div>
    </div>
  );
}

export default function ScoresPage() {
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [games, setGames] = useState<GameDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async (year?: number, week?: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year != null) params.set("year", String(year));
      if (week != null) params.set("week", String(week));
      const res = await fetch(`/api/scores?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load scores");
      const data: ScoresResponse = await res.json();
      setSeasonYear(data.seasonYear);
      setWeekNumber(data.weekNumber);
      setGames(data.week?.games ?? []);
      setLastUpdated(new Date());
      setError(
        data.synced
          ? null
          : "Couldn't reach the live score feed. Showing last known data."
      );
    } catch {
      setError("Couldn't refresh scores. Showing last known data.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  // Initial load — let the server pick a sensible default week.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount, setState happens after the await
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for live updates once we know which week we're looking at.
  useEffect(() => {
    if (seasonYear == null || weekNumber == null) return;
    const id = setInterval(() => load(seasonYear, weekNumber), POLL_MS);
    return () => clearInterval(id);
  }, [seasonYear, weekNumber, load]);

  const changeWeek = (delta: number) => {
    if (seasonYear == null || weekNumber == null) return;
    const next = Math.min(Math.max(weekNumber + delta, 1), 18);
    setLoading(true);
    load(seasonYear, next);
  };

  const selectWeek = (week: number) => {
    if (seasonYear == null) return;
    setLoading(true);
    load(seasonYear, week);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => changeWeek(-1)}
          disabled={weekNumber == null || weekNumber <= 1}
          className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium disabled:opacity-30 dark:border-white/10"
          aria-label="Previous week"
        >
          ←
        </button>
        <select
          value={weekNumber ?? ""}
          onChange={(e) => selectWeek(Number(e.target.value))}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-neutral-900"
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Week {w}
              {seasonYear ? ` — ${seasonYear}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => changeWeek(1)}
          disabled={weekNumber == null || weekNumber >= 18}
          className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium disabled:opacity-30 dark:border-white/10"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </div>
      )}

      {loading && !games ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          Loading scores...
        </div>
      ) : games && games.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-500">
          No games found for this week yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {games?.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}

      {lastUpdated && (
        <div className="mt-4 text-center text-[11px] text-neutral-400">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
