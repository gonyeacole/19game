import { NFL_TEAMS } from "../../../prisma/teams";
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
// This is the sheet's raw unfiltered data tab (all 18 weeks, ~330+ rows) —
// not the "Week Filter" tab, which only shows whichever single week a
// dropdown cell is currently set to (shared state we can't control per
// request).
const SHEET_GID = "1227961915";
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
  CLOCK: 10,
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

const ORDINAL_QUARTERS: Record<string, string> = {
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
  "4": "4th",
};

// Label for the quarter an in-progress game is in — shown inside the Live
// pill instead of down/distance/field-position detail, e.g. "4th 13:03".
function quarterLabel(qtr: string, clock: string): string {
  const q = qtr.trim().toUpperCase();
  if (q === "H") return "Halftime";
  const ordinal = ORDINAL_QUARTERS[q] ?? q;
  const time = clock.trim();
  return time && time !== "0:00" ? `${ordinal} ${time}` : ordinal;
}

// NFL schedules are always published in US Eastern time, which is what the
// sheet's Time column holds — convert that wall-clock time to a real UTC
// instant (accounting for EST/EDT) rather than treating the numbers as if
// they were already UTC, which was off by 4-5 hours.
const GAME_TIME_ZONE = "America/New_York";

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month, day, hours, minutes));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  const asUtcIfLocal = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute")
  );
  return new Date(guess.getTime() + (guess.getTime() - asUtcIfLocal));
}

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

  return zonedTimeToUtc(Number(yyyy), Number(mm) - 1, Number(dd), hours, minutes, GAME_TIME_ZONE);
}

// A stable calendar-date slug straight from the sheet's own Date column
// (e.g. "2026-09-09"), used for providerGameId. Deliberately NOT derived
// from the converted UTC instant above — an ET evening game crosses into
// the next UTC day, so basing the id on that would shift it whenever the
// time-zone math changes, creating a duplicate row instead of updating the
// existing one.
function sheetDateSlug(dateStr: string | undefined): string | null {
  const m = dateStr?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// The sheet holds every week in one file, so switching from one week to
// another needs the same bytes — cache them briefly at module scope so
// clicking through several weeks in a row (on a warm server instance)
// doesn't re-download and re-parse the whole thing each time.
const SHEET_CACHE_TTL_MS = 60 * 1000;
let sheetCache: { text: string; fetchedAt: number } | null = null;

async function fetchSheetText(): Promise<string> {
  if (sheetCache && Date.now() - sheetCache.fetchedAt < SHEET_CACHE_TTL_MS) {
    return sheetCache.text;
  }

  const res = await fetch(SHEET_CSV_URL, {
    cache: "no-store",
    headers: {
      // Without a browser-like User-Agent, Google serves this endpoint
      // differently to plain server requests (observed: a 200 response
      // whose body isn't the real CSV, unlike from an actual browser).
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "text/csv,*/*",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Sheet scoreboard request failed: ${res.status} ${res.statusText}`
    );
  }

  const text = await res.text();
  // A real export always contains plain "Week N," rows — if it doesn't, we
  // got redirected to something else (e.g. an HTML sign-in page) instead of
  // CSV, so fail loudly rather than silently returning zero games.
  if (!/^Week \d+,/m.test(text)) {
    throw new Error(
      `Sheet response doesn't look like CSV (first 200 chars): ${text.slice(0, 200)}`
    );
  }

  sheetCache = { text, fetchedAt: Date.now() };
  return text;
}

export class GoogleSheetScoreProvider implements ScoreProvider {
  async getWeekScoreboard({
    seasonYear,
    week,
  }: ScoreboardParams): Promise<NormalizedGame[]> {
    const text = await fetchSheetText();
    const rows = parseCsv(text);

    // Preseason weeks reuse the same "Week 1/2/3" labels as regular season
    // weeks in this sheet, so the week number alone can't disambiguate.
    // Preseason always plays out in August and regular season always starts
    // in September, so September 1st is a safe cutoff — no need for
    // calendar-precise kickoff-date math here, which got the actual season
    // opener wrong by a day when it was tried.
    const kickoff = new Date(Date.UTC(seasonYear, 8, 1));

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
      // Non-null: gameDate above already confirmed cols[COL.DATE] matches
      // this same date pattern.
      const dateSlug = sheetDateSlug(cols[COL.DATE])!;

      const status = mapStatus(qtr);

      games.push({
        providerGameId: `${dateSlug}-${awayAbbr}-${homeAbbr}`,
        homeTeamAbbr: homeAbbr,
        awayTeamAbbr: awayAbbr,
        homeScore: Number(cols[COL.HOME_SCORE]) || 0,
        awayScore: Number(cols[COL.AWAY_SCORE]) || 0,
        status,
        statusDetail:
          status === "IN_PROGRESS"
            ? quarterLabel(qtr, cols[COL.CLOCK] ?? "")
            : (cols[COL.SITUATION] ?? qtr).trim(),
        startTime: gameDate.toISOString(),
      });
    }

    return games;
  }
}
