import type {
  NormalizedGame,
  NormalizedGameStatus,
  ScoreboardParams,
  ScoreProvider,
} from "./types";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team: {
    abbreviation: string;
  };
}

interface EspnStatus {
  type: {
    state: "pre" | "in" | "post";
    completed: boolean;
    detail?: string;
    shortDetail?: string;
  };
}

interface EspnCompetition {
  date: string;
  status: EspnStatus;
  competitors: EspnCompetitor[];
}

interface EspnEvent {
  id: string;
  date: string;
  status: EspnStatus;
  competitions: EspnCompetition[];
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

function mapStatus(state: EspnStatus["type"]["state"]): NormalizedGameStatus {
  switch (state) {
    case "in":
      return "IN_PROGRESS";
    case "post":
      return "FINAL";
    default:
      return "SCHEDULED";
  }
}

function toNormalizedGame(event: EspnEvent): NormalizedGame | null {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const status = competition.status ?? event.status;

  return {
    providerGameId: event.id,
    homeTeamAbbr: home.team.abbreviation,
    awayTeamAbbr: away.team.abbreviation,
    homeScore: Number(home.score ?? 0),
    awayScore: Number(away.score ?? 0),
    status: mapStatus(status.type.state),
    statusDetail: status.type.shortDetail ?? status.type.detail ?? "",
    startTime: competition.date ?? event.date,
  };
}

export class EspnScoreProvider implements ScoreProvider {
  async getWeekScoreboard({
    seasonYear,
    week,
    seasonType = 2,
  }: ScoreboardParams): Promise<NormalizedGame[]> {
    const url = new URL(ESPN_SCOREBOARD_URL);
    url.searchParams.set("week", String(week));
    url.searchParams.set("seasontype", String(seasonType));
    url.searchParams.set("year", String(seasonYear));

    const res = await fetch(url.toString(), {
      // Scores change during game days; never let Next.js cache this.
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(
        `ESPN scoreboard request failed: ${res.status} ${res.statusText}`
      );
    }

    const data = (await res.json()) as EspnScoreboardResponse;
    const events = data.events ?? [];

    return events
      .map(toNormalizedGame)
      .filter((g): g is NormalizedGame => g !== null);
  }
}
