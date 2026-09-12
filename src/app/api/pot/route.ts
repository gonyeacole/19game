import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { computeSeasonPot, computeSeasonSummary, type PaymentWithPlayerTeam } from "@/lib/pool";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";

const SEASON_WEEKS = 18;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);

  const existingWeeks = await prisma.week.findMany({
    where: { seasonYear },
    orderBy: { weekNumber: "asc" },
    include: {
      payments: { include: { player: { include: { team: true } } } },
      games: true,
    },
  });
  const byWeekNumber = new Map(existingWeeks.map((w) => [w.weekNumber, w]));

  // Show every week 1-18 regardless of whether it's been visited yet, so
  // rollover math and the Pot tab both span the full season.
  const allWeeks = Array.from({ length: SEASON_WEEKS }, (_, i) => {
    const weekNumber = i + 1;
    const existing = byWeekNumber.get(weekNumber);
    if (existing) return existing;
    return {
      id: `virtual-${seasonYear}-${weekNumber}`,
      seasonYear,
      weekNumber,
      payments: [] as PaymentWithPlayerTeam[],
      games: [] as (typeof existingWeeks)[number]["games"],
    };
  });

  const weekSummaries = computeSeasonPot(allWeeks);
  const seasonSummary = computeSeasonSummary(weekSummaries);

  // Attach payment detail (who paid / who hasn't, who won) per week for the
  // UI table.
  const withPayments = weekSummaries.map((summary) => {
    const week = allWeeks.find((w) => w.id === summary.weekId)!;
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
