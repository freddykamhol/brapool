import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { getSessionFromRequest } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) return jsonError("Nicht autorisiert.", 401);

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return jsonError("Alle Felder sind Pflicht.");
  }
  if (newPassword !== confirmPassword) {
    return jsonError("Neues Passwort und Bestätigung stimmen nicht überein.");
  }
  if (newPassword.length < 8) {
    return jsonError("Neues Passwort muss mindestens 8 Zeichen haben.");
  }
  if (newPassword === currentPassword) {
    return jsonError("Neues Passwort muss sich vom aktuellen Passwort unterscheiden.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, password: true },
  });
  if (!user) return jsonError("Benutzer nicht gefunden.", 404);

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return jsonError("Aktuelles Passwort ist falsch.", 401);

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  });

  return NextResponse.json({ ok: true });
}
