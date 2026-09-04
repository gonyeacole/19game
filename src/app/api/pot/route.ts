import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { computeSeasonPot, computeSeasonSummary } from "@/lib/pool";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);

  const weeks = await prisma.week.findMany({
    where: { seasonYear },
    orderBy: { weekNumber: "asc" },
    include: {
      payments: { include: { player: true } },
      games: {
        include: {
          homeTeam: { include: { player: true } },
          awayTeam: { include: { player: true } },
        },
      },
    },
  });

  const weekSummaries = computeSeasonPot(weeks);
  const seasonSummary = computeSeasonSummary(weekSummaries);

  // Attach payment detail (who paid / who hasn't) per week for the UI table.
  const withPayments = weekSummaries.map((summary) => {
    const week = weeks.find((w) => w.id === summary.weekId)!;
    return {
      ...summary,
      payments: week.payments.map((p) => ({
        playerId: p.playerId,
        playerName: p.player.name,
        amount: p.amount,
        paid: p.paid,
        paidDate: p.paidDate,
      })),
    };
  });

  return NextResponse.json({
    seasonYear,
    weeks: withPayments,
    summary: seasonSummary,
  });
}
