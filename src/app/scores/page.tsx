"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import WeekScroller from "@/components/WeekScroller";
import Skeleton from "@/components/Skeleton";
import SearchBar from "@/components/SearchBar";
import { leagueGothic } from "@/lib/fonts";
import { useRetroMode } from "@/lib/retroMode";

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

// The sheet's raw situation text reads "3rd & 9 at MIN 26" — swap the
// "at" for a middot to match the compact ticker style.
function formatSituation(situation: string): string {
  return situation.replace(/ at /i, " · ");
}

// Day + kickoff time for a scheduled game, condensed onto one line for
// retro's flat row (normal mode's centerLines() below splits the same
// info across two stacked lines instead).
function scheduledLabel(game: GameDTO): string | null {
  if (!game.startTime) return null;
  const date = new Date(game.startTime);
  const timeZone = "America/Chicago";
  const weekday = date.toLocaleString(undefined, { weekday: "short", timeZone });
  const time = date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  });
  return `${weekday} ${time}`;
}

/* ---------- Normal theme: card-based layout ---------- */

// If both teams somehow trigger a highlight at once, a win/hit-19 takes
// priority over a watch score for which color the card's shine matches.
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
  showNames,
}: {
  team: TeamDTO;
  score: number;
  status: GameDTO["status"];
  reverse?: boolean;
  showNames: boolean;
}) {
  const highlight = rowHighlight(score, status);

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
          className={`${leagueGothic.className} block w-20 truncate text-center text-xs uppercase leading-none text-chalk`}
          style={{ fontWeight: 700 }}
        >
          {team.name.split(" ").at(-1)}
        </span>
        {showNames && (
          <span className="mt-0.5 max-w-full truncate rounded-full bg-panel-3 px-2 py-0.5 text-[10px] leading-none text-chalk-faint">
            {team.player ? team.player.name : "Unassigned"}
          </span>
        )}
      </div>
      {status !== "SCHEDULED" && (
        <div
          className={`${leagueGothic.className} text-[40px] leading-none tabular-nums ${
            highlight ? TEXT_COLOR[highlight] : "text-chalk"
          }`}
          style={{ fontWeight: 700 }}
        >
          {score}
        </div>
      )}
    </div>
  );
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

function GameCard({ game, showNames }: { game: GameDTO; showNames: boolean }) {
  const awayHasBall = game.possession != null && game.possession === game.awayTeam.abbreviation;
  const homeHasBall = game.possession != null && game.possession === game.homeTeam.abbreviation;
  const { line1, line2 } = centerLines(game);
  const highlight = cardHighlight(
    rowHighlight(game.awayScore, game.status),
    rowHighlight(game.homeScore, game.status)
  );

  const card = (
    <div
      className={`flex items-center gap-4 rounded-xl border bg-panel p-3 ${
        highlight ? "border-transparent" : "border-line"
      }`}
    >
      <TickerSide
        team={game.awayTeam}
        score={game.awayScore}
        status={game.status}
        showNames={showNames}
      />
      <div className="relative w-28 shrink-0 text-center">
        {awayHasBall && <PossessionTriangle side="left" />}
        {homeHasBall && <PossessionTriangle side="right" />}
        <div className="whitespace-nowrap text-sm font-extrabold leading-tight text-chalk">
          {line1}
        </div>
        {line2 && <div className="truncate text-[10px] leading-tight text-chalk">{line2}</div>}
      </div>
      <TickerSide
        team={game.homeTeam}
        score={game.homeScore}
        status={game.status}
        reverse
        showNames={showNames}
      />
    </div>
  );

  if (!highlight) return card;

  return <div className={`rounded-xl p-px shine-border shine-${highlight}`}>{card}</div>;
}

/* ---------- Retro theme: flat teletext vidiprinter row ---------- */

// Hand-built from a small pixel grid (not an image asset) so it's a
// transparent-background block that drops cleanly next to the team name's
// text, rather than a photo with a white square around it.
const FOOTBALL_OUTLINE_ROWS: [number, number, number][] = [
  [0, 5, 8],
  [1, 3, 10],
  [2, 2, 11],
  [3, 1, 12],
  [4, 1, 12],
  [5, 2, 11],
  [6, 3, 10],
  [7, 5, 8],
];
const FOOTBALL_BODY_ROWS: [number, number, number][] = [
  [1, 4, 9],
  [2, 3, 10],
  [3, 2, 11],
  [4, 2, 11],
  [5, 3, 10],
  [6, 4, 9],
];
const FOOTBALL_LACE_CELLS: [number, number][] = [
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [2, 9],
  [3, 9],
  [4, 9],
  [5, 9],
  [3, 6],
  [3, 7],
  [4, 6],
  [4, 7],
];

function footballRows(rows: [number, number, number][], fill: string) {
  return rows.map(([row, start, end]) => (
    <rect key={`${fill}-${row}`} x={start} y={row} width={end - start + 1} height={1} fill={fill} />
  ));
}

// Possession indicator for the retro Scores row — a pixel-art football
// (the normal theme's GameCard uses its own PossessionTriangle instead).
function PossessionFootball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 8" aria-hidden className={`inline-block h-[0.65em] w-[1.2em] align-middle ${className ?? ""}`}>
      {footballRows(FOOTBALL_OUTLINE_ROWS, "#000000")}
      {footballRows(FOOTBALL_BODY_ROWS, "#8a4b23")}
      {FOOTBALL_LACE_CELLS.map(([row, col]) => (
        <rect key={`lace-${row}-${col}`} x={col} y={row} width={1} height={1} fill="#ffffff" />
      ))}
    </svg>
  );
}

function GameRowSkeleton() {
  return (
    <div className="flex items-center gap-2 border-b border-dotted border-chalk-faint py-3">
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-10 shrink-0" />
      <Skeleton className="h-4 flex-1" />
    </div>
  );
}

// A plain "AWAY @ HOME" row — a real teletext vidiprinter table, not a
// broadcast-style card. No logos, no box, no border accent: just the
// character grid, a thin dotted rule underneath, and the score (or "@"
// for a game that hasn't kicked off yet) in the middle.
function GameRow({
  game,
  showNames,
  awayFlash,
  homeFlash,
}: {
  game: GameDTO;
  showNames: boolean;
  awayFlash: boolean;
  homeFlash: boolean;
}) {
  // Retro only highlights an actual 19 — "watch" (12/16, a normal-mode-only
  // nod to scores that could become 19) is dropped back to plain chalk
  // here, unlike GameCard below which still colors all three.
  const rawAwayHighlight = rowHighlight(game.awayScore, game.status);
  const rawHomeHighlight = rowHighlight(game.homeScore, game.status);
  const awayHighlight = rawAwayHighlight === "watch" ? null : rawAwayHighlight;
  const homeHighlight = rawHomeHighlight === "watch" ? null : rawHomeHighlight;
  const awayHasBall = game.possession != null && game.possession === game.awayTeam.abbreviation;
  const homeHasBall = game.possession != null && game.possession === game.homeTeam.abbreviation;
  const showScore = game.status !== "SCHEDULED";

  return (
    <div
      className="flex items-center gap-2 border-b border-dotted border-chalk-faint py-3 text-lg uppercase"
      title={game.situation ? formatSituation(game.situation) : undefined}
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate text-venmo">
          {game.awayTeam.name.split(" ").at(-1)}
          {awayHasBall && <PossessionFootball className="ml-1" />}
        </span>
        {showNames && (
          <span className="block truncate text-[10px] normal-case leading-tight text-chalk-faint">
            {game.awayTeam.player ? game.awayTeam.player.name : "Unassigned"}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 tabular-nums">
        <div className="flex items-center gap-1">
          {showScore ? (
            <>
              <span className={`${awayHighlight ? TEXT_COLOR[awayHighlight] : "text-chalk"} ${awayFlash ? "score-flash" : ""}`}>
                {game.awayScore}
              </span>
              <span className="text-chalk-faint">-</span>
              <span className={`${homeHighlight ? TEXT_COLOR[homeHighlight] : "text-chalk"} ${homeFlash ? "score-flash" : ""}`}>
                {game.homeScore}
              </span>
            </>
          ) : (
            <span className="text-chalk">@</span>
          )}
        </div>
        {game.status === "IN_PROGRESS" && game.statusDetail && (
          <span className="whitespace-nowrap text-[10px] normal-case leading-none text-led">
            {game.statusDetail}
          </span>
        )}
        {game.status === "SCHEDULED" && scheduledLabel(game) && (
          <span className="whitespace-nowrap text-[10px] normal-case leading-none text-led">
            {scheduledLabel(game)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 text-right">
        <span className="block truncate text-venmo">
          {homeHasBall && <PossessionFootball className="mr-1" />}
          {game.homeTeam.name.split(" ").at(-1)}
        </span>
        {showNames && (
          <span className="block truncate text-[10px] normal-case leading-tight text-chalk-faint">
            {game.homeTeam.player ? game.homeTeam.player.name : "Unassigned"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ScoresPage() {
  const retro = useRetroMode();
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [games, setGames] = useState<GameDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  // Off by default; once someone flips it on, remember that choice across
  // refreshes and future visits.
  const [showNames, setShowNames] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, not derivable during render
    setShowNames(localStorage.getItem("scoresShowNames") === "true");
  }, []);
  const toggleShowNames = () => {
    setShowNames((v) => {
      const next = !v;
      localStorage.setItem("scoresShowNames", String(next));
      return next;
    });
  };
  // All three sections start expanded; collapsing one just hides its list
  // of games below the header, same idea as the Pot tab's payment-status
  // disclosure.
  const [expandedStatuses, setExpandedStatuses] = useState<Set<GameDTO["status"]>>(
    new Set(["IN_PROGRESS", "SCHEDULED", "FINAL"])
  );
  const toggleSection = (status: GameDTO["status"]) => {
    setExpandedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };
  const inFlight = useRef(false);
  const gamesRef = useRef<GameDTO[] | null>(null);
  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  // Retro's score bug briefly flashes a score that just changed, so a
  // live-poll update is noticeable without re-reading the whole row. Keyed
  // by "<gameId>:home"/"<gameId>:away" rather than just the game id, since
  // the two sides can update independently. prevScoresRef holds the last
  // seen values across polls (a ref, not state — it's only ever read/written
  // inside load(), never rendered directly), compared against each new
  // fetch to find deltas; the first load populates it with nothing to
  // compare against, so nothing flashes on initial mount.
  const prevScoresRef = useRef<Map<string, { home: number; away: number }>>(new Map());
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());
  const FLASH_MS = 700;

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
      const newGames = data.week?.games ?? [];
      const nextFlash = new Set<string>();
      for (const g of newGames) {
        const prev = prevScoresRef.current.get(g.id);
        if (prev) {
          if (prev.away !== g.awayScore) nextFlash.add(`${g.id}:away`);
          if (prev.home !== g.homeScore) nextFlash.add(`${g.id}:home`);
        }
        prevScoresRef.current.set(g.id, { home: g.homeScore, away: g.awayScore });
      }
      if (nextFlash.size > 0) {
        setFlashKeys(nextFlash);
        setTimeout(() => setFlashKeys(new Set()), FLASH_MS);
      }
      setSeasonYear(data.seasonYear);
      setWeekNumber(data.weekNumber);
      setGames(newGames);
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
  // Whichever status section renders first (usually "Live") gets the
  // names toggle tacked onto its header row, so there's only one control
  // rather than repeating it per section.
  const firstVisibleStatus = (["IN_PROGRESS", "SCHEDULED", "FINAL"] as const).find(
    (status) => filteredGames?.some((g) => g.status === status)
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
        <div className={retro ? "flex flex-col" : "flex flex-col gap-3"}>
          {/* A full NFL week has 16 games (fewer once bye weeks start) —
              matching that count avoids the large layout shift a smaller
              placeholder count would cause once real data loads. */}
          {Array.from({ length: 16 }).map((_, i) =>
            retro ? <GameRowSkeleton key={i} /> : <GameCardSkeleton key={i} />
          )}
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
            const expanded = expandedStatuses.has(status);
            return (
              <div key={status} className={`flex flex-col ${retro ? "gap-1.5" : "gap-3"}`}>
                <div
                  className={`flex items-center justify-between ${
                    status === "IN_PROGRESS" ? "" : retro ? "mt-3" : "mt-2"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(status)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${
                      retro ? "text-chalk" : "text-chalk-faint"
                    }`}
                  >
                    {retro ? (
                      // Reverse video, like a real teletext category box —
                      // a solid block with cutout (background-colored)
                      // text, instead of plain colored text on the page's
                      // own black background. Green, matching the header's
                      // own "League" green rather than white.
                      <span className="bg-led px-1.5 py-0.5 text-pill-text">
                        {STATUS_SECTION_LABEL[status]}
                      </span>
                    ) : (
                      STATUS_SECTION_LABEL[status]
                    )}
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-3 w-3 transition-transform duration-200 ${
                        expanded ? "rotate-180" : ""
                      }`}
                    >
                      <path d="M5 8l5 5 5-5" />
                    </svg>
                  </button>
                  {status === firstVisibleStatus && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showNames}
                      onClick={toggleShowNames}
                      className="flex items-center gap-1.5"
                    >
                      <span className="text-[11px] font-semibold text-chalk/50">
                        Show names
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          showNames ? "bg-win" : "bg-panel-3"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            showNames ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>
                  )}
                </div>
                {expanded &&
                  (retro ? (
                    <div className="flex flex-col">
                      {gamesForStatus.map((g) => (
                        <GameRow
                          key={g.id}
                          game={g}
                          showNames={showNames}
                          awayFlash={flashKeys.has(`${g.id}:away`)}
                          homeFlash={flashKeys.has(`${g.id}:home`)}
                        />
                      ))}
                    </div>
                  ) : (
                    gamesForStatus.map((g) => (
                      <GameCard key={g.id} game={g} showNames={showNames} />
                    ))
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
