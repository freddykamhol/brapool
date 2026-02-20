import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "brapool_session";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET fehlt/zu kurz");
  return new TextEncoder().encode(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!userId || !password) return jsonError("UserID und Passwort sind Pflicht.", 400);

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true, userId: true, vorname: true, nachname: true, password: true },
    });

    if (!user) return jsonError("Ungültige Zugangsdaten.", 401);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return jsonError("Ungültige Zugangsdaten.", 401);

    const token = await new SignJWT({
      uid: user.id,
      userId: user.userId,
      name: `${user.vorname} ${user.nachname}`,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secretKey());

    const res = NextResponse.json({ ok: true });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Login fehlgeschlagen" }, { status: 500 });
  }
}