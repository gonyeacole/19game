import { NFL_TEAMS } from "../../../prisma/teams";
import { regularSeasonKickoff } from "../nflWeek";
import type {
  NormalizedGame,
  NormalizedGameStatus,
  ScoreboardParams,
  ScoreProvider,
} from "./types";

// A community-maintained Google Sheet that auto-refreshes live NFL scores.
// We read its published CSV export directly (no API key) — Google's own
// servers do the actual scraping, which sidesteps the bot-filtering that
// blocks server-originated requests straight to ESPN (see espn.ts).
const SHEET_ID = "13I01yScA6Hg-lind-KX7ZAykk38eiSYVJxj4YZ2Afro";
const SHEET_GID = "2012782522";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

// Column layout for a regular-season row in the sheet:
// Week, Date, Time, AwayTeam, AwayAbbr, HomeTeam, HomeAbbr, AwayScore,
// HomeScore, Qtr, Clock, Situation, Pos, ScoreText, TotalPoints, O/U,
// Odds, Broadcast, A, H
const COL = {
  WEEK: 0,
  DATE: 1,
  TIME: 2,
  AWAY_ABBR: 4,
  HOME_ABBR: 6,
  AWAY_SCORE: 7,
  HOME_SCORE: 8,
  QTR: 9,
  SITUATION: 11,
};

const KNOWN_ABBRS = new Set<string>(NFL_TEAMS.map((t) => t.abbreviation));

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeAbbr(raw: string | undefined): string | null {
  const abbr = raw?.trim().toUpperCase();
  return abbr && KNOWN_ABBRS.has(abbr) ? abbr : null;
}

function mapStatus(qtr: string): NormalizedGameStatus {
  const q = qtr.trim().toUpperCase();
  if (q === "F" || q === "F/OT" || q === "FINAL") return "FINAL";
  if (q === "" || q === "PRE") return "SCHEDULED";
  return "IN_PROGRESS";
}

// The sheet's dates/times are US game times, but we only have the wall-clock
// numbers (no timezone). Treating them as server-local is imprecise by a few
// hours — fine here, since only the date (for the preseason/regular-season
// split below) and FINAL/score values drive the app's pool logic, not the
// exact kickoff instant.
function parseSheetDate(dateStr: string | undefined, timeStr: string | undefined): Date | null {
  const m = dateStr?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;

  let hours = 0;
  let minutes = 0;
  const t = timeStr?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (t) {
    hours = Number(t[1]) % 12;
    minutes = Number(t[2]);
    if (t[3].toUpperCase() === "PM") hours += 12;
  }

  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), hours, minutes);
}

export class GoogleSheetScoreProvider implements ScoreProvider {
  async getWeekScoreboard({
    seasonYear,
    week,
  }: ScoreboardParams): Promise<NormalizedGame[]> {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `Sheet scoreboard request failed: ${res.status} ${res.statusText}`
      );
    }

    const text = await res.text();
    const rows = parseCsv(text);

    // Preseason weeks reuse the same "Week 1/2/3" labels as regular season
    // weeks in this sheet, so the week number alone can't disambiguate —
    // only rows on/after actual kickoff count as regular season.
    const kickoff = regularSeasonKickoff(seasonYear);

    const games: NormalizedGame[] = [];
    for (const cols of rows) {
      const weekLabel = cols[COL.WEEK]?.trim();
      const match = weekLabel?.match(/^Week (\d+)$/i);
      if (!match || Number(match[1]) !== week) continue;

      const gameDate = parseSheetDate(cols[COL.DATE], cols[COL.TIME]);
      if (!gameDate || gameDate < kickoff) continue;

      const awayAbbr = normalizeAbbr(cols[COL.AWAY_ABBR]);
      const homeAbbr = normalizeAbbr(cols[COL.HOME_ABBR]);
      if (!awayAbbr || !homeAbbr) continue;

      const qtr = cols[COL.QTR] ?? "";

      games.push({
        providerGameId: `${gameDate.toISOString().slice(0, 10)}-${awayAbbr}-${homeAbbr}`,
        homeTeamAbbr: homeAbbr,
        awayTeamAbbr: awayAbbr,
        homeScore: Number(cols[COL.HOME_SCORE]) || 0,
        awayScore: Number(cols[COL.AWAY_SCORE]) || 0,
        status: mapStatus(qtr),
        statusDetail: (cols[COL.SITUATION] ?? qtr).trim(),
        startTime: gameDate.toISOString(),
      });
    }

    return games;
  }
}
