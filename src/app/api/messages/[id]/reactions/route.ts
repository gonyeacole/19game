import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withChatSchemaRetry } from "@/lib/db/ensureChatSchema";

const NAME_MAX = 24;

// Kept small and fixed rather than free-form input — a curated set renders
// consistently across platforms and keeps the picker a single tap, no
// keyboard/search needed.
const ALLOWED_EMOJI = new Set(["👍", "❤️", "😂", "😮", "😢", "🔥"]);

// Toggle: reacting again with the same emoji you already used removes it.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;
  const { authorName, emoji } = (await req.json()) as {
    authorName?: string;
    emoji?: string;
  };

  const name = authorName?.trim();
  if (!name || name.length > NAME_MAX || !emoji || !ALLOWED_EMOJI.has(emoji)) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  await withChatSchemaRetry(async () => {
    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, authorName: name, emoji },
    });
    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, authorName: name, emoji },
      });
    }
  });

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { authorName: true, emoji: true },
  });

  return NextResponse.json({ reactions });
}
