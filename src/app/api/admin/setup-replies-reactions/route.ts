import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ADMIN_COOKIE = "admin_session";

function isAdmin(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return adminPassword != null && cookie === adminPassword;
}

// One-time-use endpoint to add the replyToId column to production — same
// reason as setup-messages/setup-game-columns: "prisma migrate deploy" only
// ever reaches the local DATABASE_URL, never Turso. Safe to hit more than
// once (ALTER TABLE ADD COLUMN errors are swallowed when the column already
// exists, since SQLite has no ADD COLUMN IF NOT EXISTS).
//
// The reaction feature this endpoint originally also set up a table for
// (first "Reaction", later "MessageReaction") has been added and removed
// more than once; any such table left over in production from an earlier
// round is unused and harmless. Kept at its original path/name rather than
// renamed, since /api/messages/route.ts already self-heals this same column
// via withChatSchemaRetry — this manual endpoint is a redundant fallback at
// this point, not load-bearing.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("duplicate column")) throw err;
  }
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Message_replyToId_idx" ON "Message"("replyToId")`
  );

  return NextResponse.json({ ok: true });
}
