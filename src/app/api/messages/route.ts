import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withChatSchemaRetry } from "@/lib/db/ensureChatSchema";

const NAME_MAX = 24;
const BODY_MAX = 500;

// Reactions come back grouped per emoji (count + who reacted) rather than as
// raw rows — the client only ever needs "how many of 🔥" and "did I react",
// and grouping here once is cheaper than every client doing it on every poll.
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

// Public chat — no login system, so anyone can read and post. Only the last
// 100 messages are returned; this is a friend-group pool chat, not an
// archive.
export async function GET() {
  const messages = await withChatSchemaRetry(() =>
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        replyTo: { select: { id: true, authorName: true, body: true } },
        reactions: { select: { emoji: true, authorName: true } },
      },
    })
  );
  return NextResponse.json({
    messages: messages.reverse().map((m) => ({
      id: m.id,
      authorName: m.authorName,
      body: m.body,
      createdAt: m.createdAt,
      replyTo: m.replyTo,
      reactions: groupReactions(m.reactions),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { authorName, body, replyToId } = (await req.json()) as {
    authorName?: string;
    body?: string;
    replyToId?: string;
  };

  const name = authorName?.trim();
  const text = body?.trim();
  if (!name || !text) {
    return NextResponse.json(
      { error: "authorName and body are required" },
      { status: 400 }
    );
  }
  if (name.length > NAME_MAX || text.length > BODY_MAX) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const message = await withChatSchemaRetry(() =>
    prisma.message.create({
      data: { authorName: name, body: text, replyToId: replyToId ?? null },
      include: {
        replyTo: { select: { id: true, authorName: true, body: true } },
        reactions: { select: { emoji: true, authorName: true } },
      },
    })
  );
  return NextResponse.json({
    message: { ...message, reactions: groupReactions(message.reactions) },
  });
}
