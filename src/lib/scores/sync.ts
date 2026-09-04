import { prisma } from "@/lib/db/prisma";
import { scoreProvider } from "./index";

// The free API-Sports tier caps out around 100 requests/day, but the Scores
// tab polls every 30s while open — so only actually hit the provider at most
// this often per week, and serve cached DB data the rest of the time.
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Fetches the scoreboard for a given week from the active score provider and
 * upserts the Week + Game rows in the DB. Safe to call repeatedly (e.g. on a
 * polling interval) — it's idempotent per provider game id, and throttled
 * against the provider itself so frequent polling doesn't burn API quota.
 */
export async function syncWeekScores(seasonYear: number, weekNumber: number) {
  const existing = await prisma.week.findUnique({
    where: { seasonYear_weekNumber: { seasonYear, weekNumber } },
    include: { games: true },
  });

  const allGamesFinal =
    existing != null &&
    existing.games.length > 0 &&
    existing.games.every((g) => g.status === "FINAL");

  const syncedRecently =
    existing?.lastSyncedAt != null &&
    Date.now() - existing.lastSyncedAt.getTime() < MIN_SYNC_INTERVAL_MS;

  if (existing && (allGamesFinal || syncedRecently)) {
    return { week: existing, games: existing.games };
  }

  const games = await scoreProvider.getWeekScoreboard({
    seasonYear,
    week: weekNumber,
  });

  const week = await prisma.week.upsert({
    where: { seasonYear_weekNumber: { seasonYear, weekNumber } },
    update: { lastSyncedAt: new Date() },
    create: { seasonYear, weekNumber, lastSyncedAt: new Date() },
  });

  const teams = await prisma.team.findMany();
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t]));

  const results = [];
  for (const game of games) {
    const homeTeam = teamByAbbr.get(game.homeTeamAbbr);
    const awayTeam = teamByAbbr.get(game.awayTeamAbbr);
    if (!homeTeam || !awayTeam) {
      console.warn(
        `Skipping game ${game.providerGameId}: unknown team abbreviation(s) ${game.homeTeamAbbr}/${game.awayTeamAbbr}`
      );
      continue;
    }

    const saved = await prisma.game.upsert({
      where: { espnGameId: game.providerGameId },
      update: {
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        statusDetail: game.statusDetail,
        startTime: new Date(game.startTime),
      },
      create: {
        espnGameId: game.providerGameId,
        weekId: week.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        statusDetail: game.statusDetail,
        startTime: new Date(game.startTime),
      },
    });
    results.push(saved);
  }

  return { week, games: results };
}
