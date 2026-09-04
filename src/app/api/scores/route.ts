import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { syncWeekScores } from "@/lib/scores/sync";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);
  const weekNumber = Number(searchParams.get("week") ?? defaults.week);

  if (!Number.isFinite(seasonYear) || !Number.isFinite(weekNumber)) {
    return NextResponse.json({ error: "Invalid year or week" }, { status: 400 });
  }

  let synced = true;
  try {
    await syncWeekScores(seasonYear, weekNumber);
  } catch (err) {
    console.error("ESPN sync failed:", err);
    synced = false;
    // Fall through and serve whatever is already in the DB — the UI can
    // still show stale data with a "couldn't refresh" indicator.
  }

  const week = await prisma.week.findUnique({
    where: { seasonYear_weekNumber: { seasonYear, weekNumber } },
    include: {
      games: {
        orderBy: { startTime: "asc" },
        include: {
          homeTeam: { include: { player: true } },
          awayTeam: { include: { player: true } },
        },
      },
    },
  });

  return NextResponse.json({
    seasonYear,
    weekNumber,
    week,
    synced,
  });
}
