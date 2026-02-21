import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "./app/lib/session";

async function isValidSession(req: NextRequest) {
  return Boolean(await getSessionFromRequest(req));
}

export async function proxy(req: NextRequest) {
  const ok = await isValidSession(req);
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/einlagern/:path*",
    "/ausgeben/:path*",
    "/datenbank/:path*",
    "/benutzer/:path*",
    "/api/users/:path*",
    "/api/logs/:path*",
  ],
};
