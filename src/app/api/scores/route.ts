import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { syncWeekScores } from "@/lib/scores/sync";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";

// getDefaultSeasonAndWeek() advances the default week on a flat 7-day timer
// from kickoff, regardless of whether that week's games are actually done —
// so right after Monday Night Football wraps up, the app would otherwise
// keep defaulting to the just-finished week for days, until the following
// Thursday. This bumps the default forward a week early once every game in
// it is FINAL and at least one CST midnight has passed since the last one
// kicked off — "final, and it's a new day" — without disturbing anyone who
// explicitly navigates to a specific week via the picker.
function cstDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function rollPastFinishedWeek(
  seasonYear: number,
  week: number,
  now: Date = new Date()
): Promise<number> {
  if (week >= 18) return week;

  const games = await prisma.game.findMany({
    where: { week: { seasonYear, weekNumber: week } },
    select: { status: true, startTime: true },
  });
  if (games.length === 0) return week; // no schedule synced yet — don't guess

  const allFinal = games.every((g) => g.status === "FINAL");
  if (!allFinal) return week;

  const latestKickoff = games.reduce<Date | null>((latest, g) => {
    if (!g.startTime) return latest;
    return !latest || g.startTime > latest ? g.startTime : latest;
  }, null);
  if (!latestKickoff) return week;

  const rolledOver = cstDateString(now) > cstDateString(latestKickoff);
  return rolledOver ? week + 1 : week;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);
  let weekNumber = Number(searchParams.get("week") ?? defaults.week);

  if (!Number.isFinite(seasonYear) || !Number.isFinite(weekNumber)) {
    return NextResponse.json({ error: "Invalid year or week" }, { status: 400 });
  }

  let synced = true;
  let syncError: string | null = null;
  const trySync = async (week: number, options?: { force?: boolean }) => {
    try {
      await syncWeekScores(seasonYear, week, options);
    } catch (err) {
      console.error("Score sync failed:", err);
      synced = false;
      syncError = err instanceof Error ? err.message : String(err);
      // Fall through and serve whatever is already in the DB — the UI can
      // still show stale data with a "couldn't refresh" indicator.
    }
  };

  // Only auto-adjust when the client asked for "the current week" (no
  // explicit week param, i.e. a fresh app open) — manually browsing to a
  // specific week should always show exactly that week.
  if (searchParams.get("week") == null) {
    const naiveWeek = weekNumber;
    let heldBack = false;

    // getDefaultSeasonAndWeek() picks a week purely from the calendar date
    // (Tue/Wed already count as the next week, by design — see its own
    // comment) — it has no idea whether the previous week's slate actually
    // finished. Force a fresh check of that previous week first: if it's
    // got a game that isn't FINAL yet (a delayed/rescheduled game pushed
    // past the usual Monday-night cutoff, say), stay there instead of
    // skipping ahead of a week that's still actually live.
    if (naiveWeek > 1) {
      await trySync(naiveWeek - 1, { force: true });
      const prevGames = await prisma.game.findMany({
        where: { week: { seasonYear, weekNumber: naiveWeek - 1 } },
        select: { status: true },
      });
      if (prevGames.length > 0 && !prevGames.every((g) => g.status === "FINAL")) {
        weekNumber = naiveWeek - 1;
        heldBack = true;
      }
    }

    if (!heldBack) {
      // The previous week's done (or has no synced data yet) — separately,
      // the naive week itself might already be fully done extra early;
      // force-refresh and nudge forward a week in that case rather than
      // waiting for the calendar to catch up.
      await trySync(weekNumber, { force: true });
      const rolled = await rollPastFinishedWeek(seasonYear, weekNumber);
      if (rolled !== weekNumber) {
        weekNumber = rolled;
        await trySync(weekNumber);
      }
    }
  } else {
    await trySync(weekNumber);
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
    syncError,
  });
}
