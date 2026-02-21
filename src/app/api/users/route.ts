import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { getSessionFromRequest } from "../../lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function isAuthorized(req: Request) {
  return Boolean(await getSessionFromRequest(req));
}

function makeTempPassword() {
  return randomBytes(9).toString("base64url");
}

function getSmtp() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !port || !user || !pass || !from) {
    throw new Error("SMTP ENV fehlt: SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM");
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT ist ungültig.");
  }

  return { host, port, user, pass, from };
}

function formatMailError(e: unknown) {
  const err = e as { code?: string; message?: string };
  const code = err?.code ?? "";
  const msg = err?.message ?? "POST user fehlgeschlagen";
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ESOCKET") {
    return "SMTP-Verbindung fehlgeschlagen (Timeout/Connection). Bitte SMTP_HOST/SMTP_PORT prüfen.";
  }
  return msg;
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
    select: { id: true, vorname: true, nachname: true, email: true, userId: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  let createdUserId: string | null = null;

  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
    }

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
      select: { id: true, userId: true, email: true, vorname: true, nachname: true },
    });
    createdUserId = u.id;

    const smtp = getSmtp();
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
      requireTLS: smtp.port === 587,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        servername: smtp.host,
      },
    });

    const subject = "BRApool – Zugangsdaten";
    const text = [
      `Hallo ${u.vorname} ${u.nachname},`,
      "",
      "dein BRApool-Benutzer wurde angelegt. Deine Zugangsdaten:",
      "",
      `UserID: ${u.userId}`,
      `Passwort: ${tempPw}`,
      "",
      "Bitte melde dich an und ändere das Passwort zeitnah.",
      "",
      "— BRApool",
    ].join("\n");

    const info = await transporter.sendMail({
      from: smtp.from,
      to: u.email,
      subject,
      text,
    });

    return NextResponse.json({ ok: true, id: u.id, messageId: info.messageId });
  } catch (e: unknown) {
    if (createdUserId) {
      try {
        await prisma.user.delete({ where: { id: createdUserId } });
      } catch (rollbackError) {
        console.error("[users/create] rollback failed", rollbackError);
      }
    }

    const msg = formatMailError(e);
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      return NextResponse.json({ ok: false, error: "UserID oder Email existiert bereits." }, { status: 409 });
    }
    console.error("[users/create]", msg, e);
    return NextResponse.json({ ok: false, error: msg || "POST user fehlgeschlagen" }, { status: 500 });
  }
}
