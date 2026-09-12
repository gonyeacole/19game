import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { WINNING_SCORE } from "@/lib/pool";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";
import { syncWeekScores } from "@/lib/scores/sync";

const SEASON_WEEKS = 18;

// A team's full-season game history. Syncs every week first (not just
// whichever weeks someone happened to already open on the Scores tab) so
// the Teams dropdown always shows the whole season — cheap in practice
// since the sheet itself is cached for a minute at a time (see sheet.ts),
// so only the first of these 18 calls actually hits the network.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);

  for (let week = 1; week <= SEASON_WEEKS; week++) {
    try {
      await syncWeekScores(seasonYear, week);
    } catch {
      // A single week's sync failing (e.g. not played yet) shouldn't block
      // showing results for the rest of the season.
    }
  }

  const games = await prisma.game.findMany({
    where: {
      week: { seasonYear },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: { week: true, homeTeam: true, awayTeam: true },
    orderBy: { week: { weekNumber: "asc" } },
  });

  const results = games.map((g) => {
    const isHome = g.homeTeamId === teamId;
    const teamScore = isHome ? g.homeScore : g.awayScore;
    const oppScore = isHome ? g.awayScore : g.homeScore;
    const opponent = isHome ? g.awayTeam : g.homeTeam;

    return {
      weekNumber: g.week.weekNumber,
      opponent: { abbreviation: opponent.abbreviation, name: opponent.name },
      isHome,
      teamScore,
      oppScore,
      status: g.status,
      statusDetail: g.statusDetail,
      hitNineteen: g.status === "FINAL" && teamScore === WINNING_SCORE,
    };
  });

  return NextResponse.json({ seasonYear, results });
}
