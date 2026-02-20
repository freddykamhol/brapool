import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function normalizeBarcodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const raw of input) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const barcodes = normalizeBarcodes(body?.barcodes);
  const ausgetragenVon = typeof body?.ausgetragenVon === "string" ? body.ausgetragenVon.trim() : "";
  const ausgegebenAn = typeof body?.ausgegebenAn === "string" ? body.ausgegebenAn.trim() : "";

  if (!barcodes.length) {
    return NextResponse.json({ ok: false, error: "Keine Barcodes übergeben." }, { status: 400 });
  }
  if (!ausgetragenVon || !ausgegebenAn) {
    return NextResponse.json(
      { ok: false, error: "Ausgabe durch und Ausgabe an sind Pflichtfelder." },
      { status: 400 }
    );
  }

  // Welche existieren?
  const existing = await prisma.waesche.findMany({
    where: { barcode: { in: barcodes } },
    select: { barcode: true, kategorie: true, groesse: true },
  });

  const existingSet = new Set(existing.map((e) => e.barcode));
  const missing = barcodes.filter((b) => !existingSet.has(b));

  const now = new Date();

  // Vorhandene: auf UMLAUF setzen + Felder schreiben
  const updated = await prisma.waesche.updateMany({
    where: { barcode: { in: barcodes.filter((b) => existingSet.has(b)) } },
    data: {
      status: "UMLAUF",
      ausgetragenVon,
      ausgegebenAn,
      ausgabeDatum: now,
    },
  });

  // Log: rot (Summary mit Mengen)
  if (updated.count > 0) {
    const counts = new Map<string, number>();
    for (const e of existing) {
      const key = `${e.kategorie} ${e.groesse}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const parts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => `${c}x ${k}`);

    await prisma.waescheLog.create({
      data: {
        type: "AUSGABE_SUMMARY",
        severity: "ROT",
        message: `${ausgetragenVon} hat am ${now.toLocaleString("de-DE")} ${parts.join(
          ", "
        )} an ${ausgegebenAn} ausgegeben.`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    updatedCount: updated.count,
    missing,
  });
}