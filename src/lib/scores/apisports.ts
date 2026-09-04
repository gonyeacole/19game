import { NFL_TEAMS } from "../../../prisma/teams";
import type {
  NormalizedGame,
  NormalizedGameStatus,
  ScoreboardParams,
  ScoreProvider,
} from "./types";

// API-Sports' American Football API (https://api-sports.io/documentation/nfl/v1).
// Free tier — capped at ~100 requests/day, so callers should throttle how
// often they actually invoke this (see sync.ts) rather than calling on every
// page load.
const API_SPORTS_BASE_URL = "https://v1.american-football.api-sports.io";
const NFL_LEAGUE_ID = 1;

// API-Sports returns full franchise names ("Kansas City Chiefs"), not the
// abbreviations the rest of the app keys games by — map by name instead.
const ABBR_BY_NAME = new Map(
  NFL_TEAMS.map((t) => [t.name.toLowerCase(), t.abbreviation])
);

interface ApiSportsTeam {
  id: number;
  name: string;
}

interface ApiSportsGameStatus {
  short: string; // e.g. "NS", "Q1"..."Q4", "HT", "FT", "OT"
  long: string;
}

interface ApiSportsGame {
  game: {
    id: number;
    week: string | null;
    date: {
      date: string;
      time: string;
      timestamp: number;
    };
    status: ApiSportsGameStatus;
  };
  teams: {
    home: ApiSportsTeam;
    away: ApiSportsTeam;
  };
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
}

interface ApiSportsResponse {
  response?: ApiSportsGame[];
  errors?: unknown;
}

function mapStatus(short: string): NormalizedGameStatus {
  if (short === "NS" || short === "PST" || short === "CANC") return "SCHEDULED";
  if (short === "FT" || short === "AOT") return "FINAL";
  return "IN_PROGRESS";
}

function abbrFor(team: ApiSportsTeam): string {
  return ABBR_BY_NAME.get(team.name.toLowerCase()) ?? team.name;
}

function toNormalizedGame(g: ApiSportsGame): NormalizedGame {
  return {
    providerGameId: String(g.game.id),
    homeTeamAbbr: abbrFor(g.teams.home),
    awayTeamAbbr: abbrFor(g.teams.away),
    homeScore: g.scores.home.total ?? 0,
    awayScore: g.scores.away.total ?? 0,
    status: mapStatus(g.game.status.short),
    statusDetail: g.game.status.long,
    startTime: new Date(g.game.date.timestamp * 1000).toISOString(),
  };
}

export class ApiSportsScoreProvider implements ScoreProvider {
  constructor(private readonly apiKey: string) {}

  async getWeekScoreboard({
    seasonYear,
    week,
  }: ScoreboardParams): Promise<NormalizedGame[]> {
    const url = new URL(`${API_SPORTS_BASE_URL}/games`);
    url.searchParams.set("league", String(NFL_LEAGUE_ID));
    url.searchParams.set("season", String(seasonYear));
    url.searchParams.set("week", String(week));

    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": this.apiKey },
      // Scores change during game days; never let Next.js cache this.
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(
        `API-Sports scoreboard request failed: ${res.status} ${res.statusText}`
      );
    }

    const data = (await res.json()) as ApiSportsResponse;
    const games = data.response ?? [];

    return games.map(toNormalizedGame);
  }
}
