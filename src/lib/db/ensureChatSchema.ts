import { prisma } from "@/lib/db/prisma";

// "prisma migrate deploy" can't reach Turso in production (see
// setup-messages/setup-game-columns route comments), so this schema change
// only exists locally until someone remembers to run the matching
// /api/admin/setup-replies-reactions endpoint by hand. Rather than leaving
// chat broken in production until that happens, the messages/reactions
// routes below call this to self-heal: run the same migration inline, once
// per warm serverless instance, the first time a query actually fails
// because the column/table isn't there yet.
let ensured = false;

export async function ensureChatSchema() {
  if (ensured) return;

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT`);
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

  ensured = true;
}

const MISSING_SCHEMA = /no such table:\s*"?Reaction"?|no such column.*replyToId/i;

// Runs `fn`; if it fails specifically because the reply/reaction schema
// isn't there yet, ensures it and retries once. Any other error (bad input,
// a real DB outage, etc.) passes straight through.
export async function withChatSchemaRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!MISSING_SCHEMA.test(message)) throw err;
    await ensureChatSchema();
    return await fn();
  }
}
