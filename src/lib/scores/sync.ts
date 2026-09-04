import { prisma } from "@/lib/db/prisma";
import { scoreProvider } from "./index";

/**
 * Fetches the scoreboard for a given week from the active score provider and
 * upserts the Week + Game rows in the DB. Safe to call repeatedly (e.g. on a
 * polling interval) — it's idempotent per provider game id.
 */
export async function syncWeekScores(seasonYear: number, weekNumber: number) {
  const games = await scoreProvider.getWeekScoreboard({
    seasonYear,
    week: weekNumber,
  });

  const week = await prisma.week.upsert({
    where: { seasonYear_weekNumber: { seasonYear, weekNumber } },
    update: {},
    create: { seasonYear, weekNumber },
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
