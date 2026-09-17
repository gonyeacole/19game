import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const NAME_MAX = 24;
const BODY_MAX = 500;

// Public chat — no login system, so anyone can read and post. Only the last
// 100 messages are returned; this is a friend-group pool chat, not an
// archive.
export async function GET() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(req: NextRequest) {
  const { authorName, body } = (await req.json()) as {
    authorName?: string;
    body?: string;
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

  const message = await prisma.message.create({
    data: { authorName: name, body: text },
  });
  return NextResponse.json({ message });
}
