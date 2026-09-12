import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const authed = adminPassword != null && cookie === adminPassword;

  if (authed) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/players")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/players/:path*"],
};
