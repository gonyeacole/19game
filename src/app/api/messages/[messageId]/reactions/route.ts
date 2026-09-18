import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withChatSchemaRetry } from "@/lib/db/ensureChatSchema";

const NAME_MAX = 24;
// A small fixed set rather than free-entry emoji — keeps the picker a
// one-row tap strip and keeps the stored value predictable.
const ALLOWED_EMOJI = ["👍", "❤️", "😂", "🔥", "😢", "🎉"];

function groupReactions(
  reactions: { emoji: string; authorName: string }[]
): { emoji: string; count: number; authorNames: string[] }[] {
  const byEmoji = new Map<string, string[]>();
  for (const r of reactions) {
    const names = byEmoji.get(r.emoji) ?? [];
    names.push(r.authorName);
    byEmoji.set(r.emoji, names);
  }
  return [...byEmoji.entries()].map(([emoji, authorNames]) => ({
    emoji,
    count: authorNames.length,
    authorNames,
  }));
}

// Toggle: reacting again with the same emoji removes it. The unique
// constraint on (messageId, authorName, emoji) is what makes this safe
// without a transaction — at most one row can ever exist to find/delete.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const { authorName, emoji } = (await req.json()) as {
    authorName?: string;
    emoji?: string;
  };

  const name = authorName?.trim();
  if (!name || name.length > NAME_MAX) {
    return NextResponse.json({ error: "authorName is required" }, { status: 400 });
  }
  if (!emoji || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: "Unsupported emoji" }, { status: 400 });
  }

  const reactions = await withChatSchemaRetry(async () => {
    const existing = await prisma.reaction.findUnique({
      where: { messageId_authorName_emoji: { messageId, authorName: name, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({ data: { messageId, authorName: name, emoji } });
    }

    return prisma.reaction.findMany({
      where: { messageId },
      select: { emoji: true, authorName: true },
    });
  });
  return NextResponse.json({ reactions: groupReactions(reactions) });
}
