import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ADMIN_COOKIE = "admin_session";

function isAdmin(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return adminPassword != null && cookie === adminPassword;
}

// One-time-use endpoint to add the replyToId column and Reaction table to
// production — same reason as setup-messages/setup-game-columns: "prisma
// migrate deploy" only ever reaches the local DATABASE_URL, never Turso.
// Safe to hit more than once (ALTER TABLE ADD COLUMN errors are swallowed
// when the column already exists, since SQLite has no ADD COLUMN IF NOT
// EXISTS; CREATE TABLE/INDEX IF NOT EXISTS are no-ops on their own).
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

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Reaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "messageId" TEXT NOT NULL,
      "authorName" TEXT NOT NULL,
      "emoji" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Reaction_messageId_idx" ON "Reaction"("messageId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_messageId_authorName_emoji_key" ON "Reaction"("messageId", "authorName", "emoji")`
  );

  return NextResponse.json({ ok: true });
}
