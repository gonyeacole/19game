import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Returns all 32 teams with their assigned player (if any), so the UI can
// render every team whether or not it's been claimed yet.
export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { player: true },
  });
  return NextResponse.json({ teams });
}

interface UpsertBody {
  teamId: string;
  name: string;
  venmoUsername?: string | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as UpsertBody;

  if (!body.teamId || !body.name?.trim()) {
    return NextResponse.json(
      { error: "teamId and name are required" },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({ where: { id: body.teamId } });
  if (!team) {
    return NextResponse.json({ error: "Unknown team" }, { status: 404 });
  }

  const player = await prisma.player.upsert({
    where: { teamId: body.teamId },
    update: {
      name: body.name.trim(),
      venmoUsername: body.venmoUsername?.trim() || null,
    },
    create: {
      teamId: body.teamId,
      name: body.name.trim(),
      venmoUsername: body.venmoUsername?.trim() || null,
    },
  });

  return NextResponse.json({ player });
}

export async function DELETE(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  await prisma.player.deleteMany({ where: { teamId } });
  return NextResponse.json({ ok: true });
}
