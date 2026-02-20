import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "brapool_session";

function secretKey() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "");
}

async function isValidSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const ok = await isValidSession(req);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// ✅ Nur diese Pfade sind hinter (app)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/einlagern/:path*",
    "/ausgeben/:path*",
    "/datenbank/:path*",
    "/benutzer/:path*",
  ],
};