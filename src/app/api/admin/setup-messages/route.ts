import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ADMIN_COOKIE = "admin_session";

function isAdmin(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return adminPassword != null && cookie === adminPassword;
}

// One-time-use endpoint to create the Message table in production.
// "prisma migrate deploy" can't reach Turso — Prisma's migrate CLI only
// connects via the schema's DATABASE_URL, not the separate driver adapter
// (TURSO_DATABASE_URL) the app's own Prisma Client uses at runtime — so this
// runs the same statement through that already-working client instead.
// Safe to hit more than once: CREATE TABLE/INDEX IF NOT EXISTS is a no-op if
// they already exist.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Message" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorName" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt")
  `);

  return NextResponse.json({ ok: true });
}
