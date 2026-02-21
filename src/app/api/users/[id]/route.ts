import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getSessionFromRequest } from "../../../lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getSessionFromRequest(req))) {
      return jsonError("Nicht autorisiert.", 401);
    }

    const { id } = await ctx.params;
    if (!id) return jsonError("Missing id", 400);

    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Body ist kein gültiges JSON.", 400);

    const vorname = typeof body.vorname === "string" ? body.vorname.trim() : "";
    const nachname = typeof body.nachname === "string" ? body.nachname.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!vorname || !nachname || !email || !userId) {
      return jsonError("Vorname/Nachname/Email/UserID sind Pflicht.", 400);
    }

    await prisma.user.update({
      where: { id },
      data: { vorname, nachname, email, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = String(e instanceof Error ? e.message : "");

    // Prisma unique constraint
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return jsonError("UserID oder Email existiert bereits.", 409);
    }

    return jsonError("PATCH user fehlgeschlagen", 500, msg || undefined);
  }
}
