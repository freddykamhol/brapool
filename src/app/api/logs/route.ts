import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOGS_PER_PAGE = 10;

type WarnItem = {
  systemId: number;
  kategorie: string;
  groesse: string;
  barcode: string;
  ausgabeDatum: Date | null;
  updatedAt: Date;
};

function getSmtp() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from || !Number.isFinite(port)) return null;
  return { host, port, user, pass, from };
}

async function sendUmlaufWarningMails(items: WarnItem[]) {
  if (!items.length) return;
  const smtp = getSmtp();
  if (!smtp) {
    console.warn("[logs] SMTP env missing, UMLAUF warning mails skipped");
    return;
  }

  const users = await prisma.user.findMany({
    select: { email: true, vorname: true },
    where: { email: { not: "" } },
  });
  const recipients: string[] = users
    .map((u: { email: string }) => u.email.trim())
    .filter((email): email is string => email.length > 0);
  if (!recipients.length) return;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    requireTLS: smtp.port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { servername: smtp.host },
  });

  for (const it of items) {
    const subject = `BRApool Warnung: ${it.kategorie} ${it.groesse} seit 6+ Wochen im Umlauf`;
    const text = [
      "Hallo Team,",
      "",
      "ein Wäschestück ist seit mindestens 6 Wochen im Status UMLAUF.",
      "",
      `Kategorie: ${it.kategorie}`,
      `Größe: ${it.groesse}`,
      `Barcode: ${it.barcode}`,
      "",
      "Bitte prüfen, ob Rückführung oder Nachverfolgung erforderlich ist.",
      "",
      "— BRApool",
    ].join("\n");

    try {
      await transporter.sendMail({
        from: smtp.from,
        to: recipients.join(", "),
        subject,
        text,
      });
    } catch (error) {
      console.error("[logs] umlauf mail send failed", error);
    }
  }
}

async function ensureUmlaufWarnings() {
  const sixWeeksAgo = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.waesche.findMany({
    where: {
      status: "UMLAUF",
      OR: [
        { ausgabeDatum: { lte: sixWeeksAgo } },
        { ausgabeDatum: null, updatedAt: { lte: sixWeeksAgo } },
      ],
    },
    select: {
      systemId: true,
      kategorie: true,
      groesse: true,
      barcode: true,
      ausgabeDatum: true,
      updatedAt: true,
    },
  });

  if (!candidates.length) return;

  const existing = await prisma.waescheLog.findMany({
    where: {
      type: "UMLAUF_WARNUNG",
      waescheSystemId: { in: candidates.map((c) => c.systemId) },
    },
    select: { waescheSystemId: true },
  });
  const existingIds = new Set(existing.map((e) => e.waescheSystemId).filter((x): x is number => typeof x === "number"));
  const fresh = candidates.filter((c) => !existingIds.has(c.systemId));
  if (!fresh.length) return;

  for (const it of fresh) {
    await prisma.waescheLog.create({
      data: {
        type: "UMLAUF_WARNUNG",
        severity: "GELB",
        waescheSystemId: it.systemId,
        message: `Wäschestück ${it.kategorie} (${it.groesse}) mit Barcode ${it.barcode} ist seit über 6 Wochen im Status UMLAUF.`,
      },
    });
  }

  await sendUmlaufWarningMails(fresh);
}

async function cleanupOldLogs() {
  const tenWeeksAgo = new Date(Date.now() - 10 * 7 * 24 * 60 * 60 * 1000);
  await prisma.waescheLog.deleteMany({
    where: { createdAt: { lt: tenWeeksAgo } },
  });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (!ids.length) {
    return NextResponse.json({ ok: false, error: "ids fehlen" }, { status: 400 });
  }

  const deleted = await prisma.waescheLog.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ ok: true, deletedCount: deleted.count });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = LOGS_PER_PAGE;

  await cleanupOldLogs();
  await ensureUmlaufWarnings();

  const [total, logs] = await Promise.all([
    prisma.waescheLog.count(),
    prisma.waescheLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      type: true,
      severity: true,
      message: true,
      createdAt: true,
      waescheSystemId: true,
    },
  }),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return NextResponse.json({ ok: true, logs, page, pages, pageSize, total });
}
