"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import WeekScroller from "@/components/WeekScroller";
import Skeleton from "@/components/Skeleton";
import SearchBar from "@/components/SearchBar";
import { leagueGothic } from "@/lib/fonts";

const WINNING_SCORE = 19;
const WATCH_SCORES = [12, 16];
const POLL_MS = 30_000;
// Poll faster while a game is live so on-screen clock/situation data lags
// the sheet's own updates by less — doesn't help once we've caught up to
// its ~1-minute refresh cadence, just shrinks the wait to catch the next one.
const LIVE_POLL_MS = 15_000;

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
  situation: string | null;
  possession: string | null;
  startTime: string | null;
}

interface ScoresResponse {
  seasonYear: number;
  weekNumber: number;
  week: { games: GameDTO[] } | null;
  synced: boolean;
}

// Live games first, then upcoming, then final games pushed to the bottom.
const STATUS_SECTION_LABEL: Record<GameDTO["status"], string> = {
  IN_PROGRESS: "Live",
  SCHEDULED: "Scheduled",
  FINAL: "Final",
};

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

const BORDER_COLOR: Record<"win" | "hit-live" | "watch", string> = {
  win: "border-win",
  "hit-live": "border-led",
  watch: "border-live",
};

// If both teams somehow trigger a highlight at once, a win/hit-19 takes
// priority over a watch score for which color outlines the card.
function cardHighlight(
  a: "win" | "hit-live" | "watch" | null,
  b: "win" | "hit-live" | "watch" | null
): "win" | "hit-live" | "watch" | null {
  for (const h of [a, b]) {
    if (h === "win" || h === "hit-live") return h;
  }
  return a ?? b;
}

function PossessionTriangle({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-y-transparent ${
        side === "left"
          ? "-left-1.5 border-r-[7px] border-r-chalk"
          : "-right-1.5 border-l-[7px] border-l-chalk"
      }`}
    />
  );
}

function TickerSide({
  team,
  score,
  status,
  reverse,
}: {
  team: TeamDTO;
  score: number;
  status: GameDTO["status"];
  reverse?: boolean;
}) {
  const highlight = rowHighlight(score, status);
  // Highlights (win/hit-19, watch 12/16) only call out the score — the
  // team name always stays its normal color.
  const scoreColor = highlight ? TEXT_COLOR[highlight] : "text-chalk";
  const nameColor = "text-chalk";

  return (
    <div
      className={`flex min-w-0 flex-1 items-center justify-start gap-2 ${reverse ? "flex-row-reverse" : ""}`}
    >
      <div className="flex w-20 shrink-0 flex-col items-center gap-1">
        {team.logoUrl ? (
          <Image src={team.logoUrl} alt="" width={36} height={36} unoptimized />
        ) : (
          <div className="h-9 w-9 rounded-full bg-panel-3" />
        )}
        <span
          className={`${leagueGothic.className} block w-20 truncate text-center text-xs uppercase leading-none ${nameColor}`}
          style={{ fontWeight: 700 }}
        >
          {team.name.split(" ").at(-1)}
        </span>
        <span className="mt-0.5 max-w-full truncate rounded-full bg-panel-3 px-2 py-0.5 text-[10px] leading-none text-chalk-faint">
          {team.player ? team.player.name : "Unassigned"}
        </span>
      </div>
      {status !== "SCHEDULED" && (
        <div
          className={`${leagueGothic.className} text-[40px] leading-none tabular-nums ${scoreColor}`}
          style={{ fontWeight: 700 }}
        >
          {score}
        </div>
      )}
    </div>
  );
}

// The sheet's raw situation text reads "3rd & 9 at MIN 26" — swap the
// "at" for a middot to match the compact two-part ticker style.
function formatSituation(situation: string): string {
  return situation.replace(/ at /i, " · ");
}

function centerLines(game: GameDTO): { line1: string; line2: string | null } {
  if (game.status === "SCHEDULED" && game.startTime) {
    const date = new Date(game.startTime);
    const timeZone = "America/Chicago";
    return {
      line1: date.toLocaleString(undefined, { weekday: "short", timeZone }),
      line2: date.toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone,
      }),
    };
  }
  // The sheet's own situation text for a finished game (e.g. "Game Over")
  // varies and isn't ours to control — show a consistent label instead.
  if (game.status === "FINAL") return { line1: "Final", line2: null };
  return {
    line1: game.statusDetail || game.status,
    line2: game.situation ? formatSituation(game.situation) : null,
  };
}

// Mirrors TickerSide's stacked logo/name/player-name column plus the score
// box so the skeleton's height matches the real card — a flatter skeleton
// here previously rendered noticeably shorter than loaded content, causing
// a layout jump even when the placeholder count was right.
function SkeletonSide({ reverse }: { reverse?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}
    >
      <div className="flex w-20 shrink-0 flex-col items-center gap-1">
        <Skeleton className="h-9 w-9" rounded="rounded-full" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="mt-0.5 h-[14px] w-16" rounded="rounded-full" />
      </div>
      <Skeleton className="h-10 w-6" />
    </div>
  );
}

function GameCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-panel p-3">
      <SkeletonSide />
      <div className="flex w-28 shrink-0 flex-col items-center gap-1.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <SkeletonSide reverse />
    </div>
  );
}

function GameCard({ game }: { game: GameDTO }) {
  const awayHasBall = game.possession != null && game.possession === game.awayTeam.abbreviation;
  const homeHasBall = game.possession != null && game.possession === game.homeTeam.abbreviation;
  const { line1, line2 } = centerLines(game);
  const highlight = cardHighlight(
    rowHighlight(game.awayScore, game.status),
    rowHighlight(game.homeScore, game.status)
  );
  const borderColor = highlight ? BORDER_COLOR[highlight] : "border-line";

  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-panel p-3 ${borderColor}`}>
      <TickerSide team={game.awayTeam} score={game.awayScore} status={game.status} />
      <div className="relative w-28 shrink-0 text-center">
        {awayHasBall && <PossessionTriangle side="left" />}
        {homeHasBall && <PossessionTriangle side="right" />}
        <div className="whitespace-nowrap text-sm font-extrabold leading-tight text-chalk">
          {line1}
        </div>
        {line2 && <div className="truncate text-[10px] leading-tight text-chalk">{line2}</div>}
      </div>
      <TickerSide team={game.homeTeam} score={game.homeScore} status={game.status} reverse />
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
  const [query, setQuery] = useState("");
  const inFlight = useRef(false);
  const gamesRef = useRef<GameDTO[] | null>(null);
  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

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

  // Poll for live updates once we know which week we're looking at. Uses a
  // self-rescheduling timeout (rather than setInterval) so the delay can
  // shrink to LIVE_POLL_MS on each tick once a game in the week goes live.
  useEffect(() => {
    if (seasonYear == null || weekNumber == null) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const hasLiveGame = gamesRef.current?.some((g) => g.status === "IN_PROGRESS") ?? false;
      timeoutId = setTimeout(tick, hasLiveGame ? LIVE_POLL_MS : POLL_MS);
    };
    const tick = async () => {
      await load(seasonYear, weekNumber);
      if (!cancelled) scheduleNext();
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [seasonYear, weekNumber, load]);

  const selectWeek = (week: number) => {
    if (seasonYear == null) return;
    setLoading(true);
    load(seasonYear, week);
  };

  const q = query.trim().toLowerCase();
  const matchesTeam = (team: TeamDTO) =>
    team.name.toLowerCase().includes(q) ||
    team.abbreviation.toLowerCase().includes(q) ||
    (team.player?.name.toLowerCase().includes(q) ?? false);
  // Grouped by status below (live, then scheduled, then final), so no
  // separate sort is needed here — each group keeps the API's kickoff-time
  // order.
  const filteredGames = games?.filter(
    (g) => !q || matchesTeam(g.homeTeam) || matchesTeam(g.awayTeam)
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <WeekScroller weekNumber={weekNumber} onSelect={selectWeek} loading={loading} />

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search for teams or owners"
      />

      {error && (
        <div className="mb-3 rounded-lg bg-caution-bg px-3 py-2 text-xs text-caution">
          {error}
        </div>
      )}

      {loading && !games ? (
        <div className="flex flex-col gap-3">
          {/* A full NFL week has 16 games (fewer once bye weeks start) —
              matching that count avoids the large layout shift a smaller
              placeholder count would cause once real data loads. */}
          {Array.from({ length: 16 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredGames && filteredGames.length === 0 ? (
        <div className="py-10 text-center text-sm text-chalk-faint">
          {games && games.length > 0
            ? `No games match "${query}".`
            : "No games found for this week yet."}
        </div>
      ) : (
        <div
          className={`flex flex-col gap-3 transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}
        >
          {(["IN_PROGRESS", "SCHEDULED", "FINAL"] as const).map((status) => {
            const gamesForStatus = filteredGames?.filter((g) => g.status === status);
            if (!gamesForStatus || gamesForStatus.length === 0) return null;
            return (
              <div key={status} className="flex flex-col gap-3">
                <div
                  className={`text-[11px] font-bold uppercase tracking-wide text-chalk-faint ${
                    status === "IN_PROGRESS" ? "" : "mt-2"
                  }`}
                >
                  {STATUS_SECTION_LABEL[status]}
                </div>
                {gamesForStatus.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            );
          })}
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
