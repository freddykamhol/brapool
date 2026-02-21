import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request, userId: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${ip}:${userId.toLowerCase()}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.resetAt <= now) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  attempts.set(key, entry);
}

function clearFailures(key: string) {
  attempts.delete(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!userId || !password) return jsonError("UserID und Passwort sind Pflicht.", 400);

    const key = clientKey(req, userId);
    if (isRateLimited(key)) {
      return jsonError("Zu viele Login-Versuche. Bitte spaeter erneut versuchen.", 429);
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true, userId: true, vorname: true, nachname: true, password: true },
    });

    if (!user) {
      registerFailure(key);
      return jsonError("Ungueltige Zugangsdaten.", 401);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      registerFailure(key);
      return jsonError("Ungueltige Zugangsdaten.", 401);
    }

    clearFailures(key);

    const token = await signSession({
      uid: user.id,
      userId: user.userId,
      name: `${user.vorname} ${user.nachname}`,
    });

    const res = NextResponse.json({ ok: true });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return res;
  } catch (e: unknown) {
    console.error("[auth/login] Fehler", e);
    const details = e instanceof Error ? e.message : "Unbekannter Fehler";
    const message =
      process.env.NODE_ENV === "production"
        ? "Login fehlgeschlagen."
        : `Login fehlgeschlagen: ${details}`;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
