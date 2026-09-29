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

// The sheet's raw situation text reads "3rd & 9 at MIN 26" — swap the
// "at" for a middot to match the compact broadcast-bug style.
function formatSituation(situation: string): string {
  return situation.replace(/ at /i, " · ");
}

// The scorebug's two center pills: a colored "down & distance" (or
// day/status) pill on top, a white clock/time pill underneath. Unlike the
// old two-line center column, the bottom pill is dropped entirely once
// there's nothing meaningful to put in it (FINAL, or a live game with no
// situation data yet) rather than leaving it visually empty.
function scorebugPills(game: GameDTO): { top: string; bottom: string | null } {
  if (game.status === "FINAL") return { top: "FINAL", bottom: null };
  if (game.status === "SCHEDULED" && game.startTime) {
    const date = new Date(game.startTime);
    const timeZone = "America/Chicago";
    return {
      top: date.toLocaleString(undefined, { weekday: "short", timeZone }).toUpperCase(),
      bottom: date.toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone,
      }),
    };
  }
  return {
    top: game.situation ? formatSituation(game.situation) : game.statusDetail || "LIVE",
    bottom: game.situation ? game.statusDetail || null : null,
  };
}

// Mirrors ScorebugSide's logo-panel + score + optional name-pill so the
// skeleton's height matches the real bar — a flatter skeleton here
// previously rendered noticeably shorter than loaded content, causing a
// layout jump even when the placeholder count was right.
function SkeletonSide({ reverse }: { reverse?: boolean }) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}>
      <Skeleton className="h-12 w-12 shrink-0" rounded="rounded-lg" />
      <Skeleton className="h-9 w-10" />
    </div>
  );
}

function GameCardSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-panel p-2.5">
      <SkeletonSide />
      <Skeleton className="h-10 w-20 shrink-0" rounded="rounded-full" />
      <SkeletonSide reverse />
    </div>
  );
}

// A broadcast score bug is always a dark graphic overlay, regardless of
// whether the game itself is being watched in a bright room or a dark
// one — there's no "light mode" version of it. This card (and its
// ScorebugSide halves) intentionally use fixed dark hex values rather
// than the theme's panel/chalk tokens, the same way SplashScreen uses a
// fixed brand color instead of theme tokens: the app's light/dark toggle
// switches the rest of the UI, but this one component stays a dark bug
// either way, so its white score digits and light labels always have
// something dark to sit on.
function ScorebugSide({
  team,
  score,
  status,
  highlight,
  hasBall,
  showNames,
  reverse,
}: {
  team: TeamDTO;
  score: number;
  status: GameDTO["status"];
  highlight: "win" | "hit-live" | "watch" | null;
  hasBall: boolean;
  showNames: boolean;
  reverse?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${reverse ? "flex-row-reverse" : ""}`}>
      <div
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#262626] to-[#151515] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
          hasBall ? "ring-2 ring-[#e08a3c]" : ""
        }`}
      >
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-8 w-8 object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-[#1d1d1d]" />
        )}
      </div>
      <div className={`flex min-w-0 flex-col ${reverse ? "items-end" : "items-start"}`}>
        {status !== "SCHEDULED" && (
          <div
            className={`${leagueGothic.className} text-[34px] leading-none tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] ${
              highlight ? TEXT_COLOR[highlight] : "text-white"
            }`}
            style={{ fontWeight: 700 }}
          >
            {score}
          </div>
        )}
        <span className={`${leagueGothic.className} truncate text-[10px] uppercase leading-none text-[#9c9c98]`}>
          {team.abbreviation}
        </span>
        {showNames && (
          <span className="mt-0.5 max-w-full truncate rounded-full bg-[#262626] px-2 py-0.5 text-[10px] leading-none text-[#b8b8b5]">
            {team.player ? team.player.name : "Unassigned"}
          </span>
        )}
      </div>
    </div>
  );
}

function GameCard({ game, showNames }: { game: GameDTO; showNames: boolean }) {
  const awayHasBall = game.possession != null && game.possession === game.awayTeam.abbreviation;
  const homeHasBall = game.possession != null && game.possession === game.homeTeam.abbreviation;
  const awayHighlight = rowHighlight(game.awayScore, game.status);
  const homeHighlight = rowHighlight(game.homeScore, game.status);
  const highlight = cardHighlight(awayHighlight, homeHighlight);
  const { top, bottom } = scorebugPills(game);

  const card = (
    <div
      className={`relative flex items-center gap-2 overflow-hidden rounded-lg border bg-gradient-to-b from-[#1d1d1d] via-[#151515] to-[#1d1d1d] p-2.5 ${
        highlight ? "border-transparent" : "border-[#363636]"
      }`}
    >
      {/* A faint diagonal gloss streak — the one bit of the broadcast-bug's
          reflective sheen worth keeping at this size; the full logo-panel
          bevels and chamfered corners didn't survive being shrunk down to
          a mobile list row, so this is a simplified take rather than a
          literal recreation. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />

      <ScorebugSide
        team={game.awayTeam}
        score={game.awayScore}
        status={game.status}
        highlight={awayHighlight}
        hasBall={awayHasBall}
        showNames={showNames}
      />

      <div className="relative z-10 flex w-24 shrink-0 flex-col items-center gap-1">
        <div className="whitespace-nowrap rounded-full bg-live px-2.5 py-0.5 text-[11px] font-bold uppercase leading-tight text-white shadow-sm">
          {top}
        </div>
        {bottom && (
          <div className="whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold leading-tight text-[#111] shadow-sm">
            {bottom}
          </div>
        )}
      </div>

      <ScorebugSide
        team={game.homeTeam}
        score={game.homeScore}
        status={game.status}
        highlight={homeHighlight}
        hasBall={homeHasBall}
        showNames={showNames}
        reverse
      />
    </div>
  );

  if (!highlight) return card;

  return <div className={`rounded-lg p-px shine-border shine-${highlight}`}>{card}</div>;
}

export default function ScoresPage() {
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
            const expanded = expandedStatuses.has(status);
            return (
              <div key={status} className="flex flex-col gap-3">
                <div
                  className={`flex items-center justify-between ${
                    status === "IN_PROGRESS" ? "" : "mt-2"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(status)}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-chalk-faint"
                  >
                    {STATUS_SECTION_LABEL[status]}
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
                  gamesForStatus.map((g) => (
                    <GameCard key={g.id} game={g} showNames={showNames} />
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
