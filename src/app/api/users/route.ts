import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function makeTempPassword() {
  return randomBytes(9).toString("base64url");
}

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    select: { id: true, vorname: true, nachname: true, email: true, userId: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const vorname = typeof body?.vorname === "string" ? body.vorname.trim() : "";
    const nachname = typeof body?.nachname === "string" ? body.nachname.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!vorname || !nachname || !email || !userId) {
      return NextResponse.json({ ok: false, error: "Vorname/Nachname/Email/UserID sind Pflicht." }, { status: 400 });
    }

    const tempPw = makeTempPassword();
    const hash = await bcrypt.hash(tempPw, 10);

    const u = await prisma.user.create({
      data: { vorname, nachname, email, userId, password: hash },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: u.id });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return NextResponse.json({ ok: false, error: "UserID oder Email existiert bereits." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "POST user fehlgeschlagen" }, { status: 500 });
  }
}