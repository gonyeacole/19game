import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const ADMIN_COOKIE = "admin_session";

function isAdmin(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return adminPassword != null && cookie === adminPassword;
}

// Public — the announcement bell in the header reads this on every page,
// not just /admin.
export async function GET() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: { message: message.trim() },
  });
  return NextResponse.json({ announcement });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.announcement.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
