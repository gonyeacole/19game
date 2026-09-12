import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { WINNING_SCORE } from "@/lib/pool";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";

// A team's game history for the season, one row per already-synced game —
// weeks nobody has opened the Scores tab for yet simply won't have a row,
// same lazy-sync behavior as the rest of the app.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);

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
