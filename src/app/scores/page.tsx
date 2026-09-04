"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const WINNING_SCORE = 19;
const WATCH_SCORES = [12, 16];
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

function rowHighlight(score: number, status: GameDTO["status"]): "win" | "hit-live" | "watch" | null {
  if (score === WINNING_SCORE) return status === "FINAL" ? "win" : "hit-live";
  if (status === "IN_PROGRESS" && WATCH_SCORES.includes(score)) return "watch";
  return null;
}

const TEXT_COLOR: Record<"win" | "hit-live" | "watch", string> = {
  win: "text-win",
  "hit-live": "text-led",
  watch: "text-live",
};

function TeamLine({
  team,
  score,
  status,
}: {
  team: TeamDTO;
  score: number;
  status: GameDTO["status"];
}) {
  const highlight = rowHighlight(score, status);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2">
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
          <div className="h-7 w-7 shrink-0 rounded-full bg-panel-3" />
        )}
        <div className="min-w-0">
          <div
            className={`truncate text-sm font-semibold ${highlight ? TEXT_COLOR[highlight] : "text-chalk"}`}
          >
            {team.name}
          </div>
          <div className="truncate text-xs text-chalk-faint">
            {team.player ? team.player.name : "Unassigned"}
          </div>
        </div>
      </div>
      <span
        className={`shrink-0 text-lg font-bold tabular-nums ${highlight ? TEXT_COLOR[highlight] : "text-chalk"}`}
      >
        {score}
      </span>
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
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-chalk-faint">
        {game.status === "IN_PROGRESS" && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-live" />
        )}
        <span className={game.status === "IN_PROGRESS" ? "text-live" : ""}>
          {statusLabel(game)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <TeamLine team={game.awayTeam} score={game.awayScore} status={game.status} />
        <TeamLine team={game.homeTeam} score={game.homeScore} status={game.status} />
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          onClick={() => changeWeek(-1)}
          disabled={weekNumber == null || weekNumber <= 1}
          className="rounded-full border border-line px-3 py-2 text-sm font-medium text-chalk disabled:opacity-30"
          aria-label="Previous week"
        >
          ←
        </button>
        <select
          value={weekNumber ?? ""}
          onChange={(e) => selectWeek(Number(e.target.value))}
          className="rounded-full border border-line bg-panel-3 px-4 py-2 text-sm font-semibold text-chalk"
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
          className="rounded-full border border-line px-3 py-2 text-sm font-medium text-chalk disabled:opacity-30"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      <div className="mb-3 flex items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-chalk-dim">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-led shadow-[0_0_6px_var(--color-led)]" />
          On it
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-live shadow-[0_0_6px_var(--color-live)]" />
          On track
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-caution-bg px-3 py-2 text-xs text-caution">
          {error}
        </div>
      )}

      {loading && !games ? (
        <div className="py-10 text-center text-sm text-chalk-faint">
          Loading scores...
        </div>
      ) : games && games.length === 0 ? (
        <div className="py-10 text-center text-sm text-chalk-faint">
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
        <div className="mt-4 text-center text-[11px] text-chalk-faint">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
