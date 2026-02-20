import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function makePassword() {
  return randomBytes(10).toString("base64url");
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

  return { host, port, user, pass, from };
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const u = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, vorname: true, nachname: true, userId: true },
    });

    if (!u) return NextResponse.json({ ok: false, error: "User nicht gefunden." }, { status: 404 });

    const pw = makePassword();
    const hash = await bcrypt.hash(pw, 10);

    await prisma.user.update({ where: { id }, data: { password: hash } });

    const smtp = getSmtp();

    // Note: 465 = SMTPS (secure true), 587 = STARTTLS (secure false)
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
      // Helps with many providers for STARTTLS
      requireTLS: smtp.port === 587,
    });

    // Quick connectivity check (gives real error reason in server console)
    await transporter.verify();

    const subject = "BRApool – Neues Passwort";
    const text = [
      `Hallo ${u.vorname} ${u.nachname},`,
      "",
      "für deinen BRApool-Zugang wurde ein neues Passwort erstellt:",
      "",
      `UserID: ${u.userId}`,
      `Passwort: ${pw}`,
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

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    const msg = String((e as any)?.message ?? "Reset+Mail fehlgeschlagen");
    console.error("[reset-password]", msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}