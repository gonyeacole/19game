import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ADMIN_COOKIE = "admin_session";

function isAdmin(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return adminPassword != null && cookie === adminPassword;
}

async function addColumnIfMissing(column: string) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Game" ADD COLUMN "${column}" TEXT`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("duplicate column")) throw err;
  }
}

// One-time-use endpoint to add the situation/possession columns to Game in
// production — same reason as setup-announcements: "prisma migrate deploy"
// only ever reaches the local DATABASE_URL, never Turso. Safe to hit more
// than once (ALTER TABLE ADD COLUMN errors are swallowed when the column
// already exists, since SQLite has no ADD COLUMN IF NOT EXISTS).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await addColumnIfMissing("situation");
  await addColumnIfMissing("possession");

  return NextResponse.json({ ok: true });
}
