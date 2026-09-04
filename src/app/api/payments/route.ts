import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureWeek } from "@/lib/db/weeks";
import { WEEKLY_DUE } from "@/lib/pool";
import { getDefaultSeasonAndWeek } from "@/lib/nflWeek";

// Returns the $10 due status for every player for a given week, creating
// unpaid Payment rows on the fly so the list always covers all 32 players.
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const defaults = getDefaultSeasonAndWeek();
  const seasonYear = Number(searchParams.get("year") ?? defaults.seasonYear);
  const weekNumber = Number(searchParams.get("week") ?? defaults.week);

  const week = await ensureWeek(seasonYear, weekNumber);

  const players = await prisma.player.findMany({
    include: { team: true },
    orderBy: { name: "asc" },
  });

  await Promise.all(
    players.map((player) =>
      prisma.payment.upsert({
        where: { playerId_weekId: { playerId: player.id, weekId: week.id } },
        update: {},
        create: {
          playerId: player.id,
          weekId: week.id,
          amount: WEEKLY_DUE,
          paid: false,
        },
      })
    )
  );

  const payments = await prisma.payment.findMany({
    where: { weekId: week.id },
    include: { player: { include: { team: true } } },
    orderBy: { player: { name: "asc" } },
  });

  return NextResponse.json({ seasonYear, weekNumber, week, payments });
}

interface PatchBody {
  playerId: string;
  weekId: string;
  paid: boolean;
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as PatchBody;
  if (!body.playerId || !body.weekId || typeof body.paid !== "boolean") {
    return NextResponse.json(
      { error: "playerId, weekId, and paid are required" },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.upsert({
    where: {
      playerId_weekId: { playerId: body.playerId, weekId: body.weekId },
    },
    update: {
      paid: body.paid,
      paidDate: body.paid ? new Date() : null,
    },
    create: {
      playerId: body.playerId,
      weekId: body.weekId,
      amount: WEEKLY_DUE,
      paid: body.paid,
      paidDate: body.paid ? new Date() : null,
    },
  });

  return NextResponse.json({ payment });
}
