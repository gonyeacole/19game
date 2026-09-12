import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Public roster list — deliberately excludes Venmo usernames, unlike the
// admin-only /api/players, since anyone can view the Teams tab.
export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { player: true },
  });

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      abbreviation: t.abbreviation,
      logoUrl: t.logoUrl,
      player: t.player ? { id: t.player.id, name: t.player.name } : null,
    })),
  });
}
