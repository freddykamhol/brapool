import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function normalizeBarcodes(input: string[]): string[] {
  const set = new Set<string>();
  for (const raw of input) {
    const s = (raw ?? "").trim();
    if (!s) continue;
    set.add(s);
  }
  return Array.from(set);
}

// POST { barcodes: string[] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const barcodes = normalizeBarcodes(Array.isArray(body?.barcodes) ? body.barcodes : []);

  if (!barcodes.length) {
    return NextResponse.json({ ok: false, error: "Keine Barcodes übergeben." }, { status: 400 });
  }

  const existing = await prisma.waesche.findMany({
    where: { barcode: { in: barcodes } },
    select: { barcode: true },
  });

  const existingSet = new Set(existing.map((e) => e.barcode));
  const missing = barcodes.filter((b) => !existingSet.has(b));

  // vorhandene: auf eingelagert setzen
  const now = new Date();
  const updated = await prisma.waesche.updateMany({
    where: { barcode: { in: barcodes.filter((b) => existingSet.has(b)) } },
    data: {
      status: "EINGELAGERT",
      eingelagertAm: now,

      // Ausgabe-Felder zurücksetzen
      ausgetragenVon: null,
      ausgegebenAn: null,
      ausgabeDatum: null,
    },
  });

  // Summary Log (grün), wenn was aktualisiert wurde
  if (updated.count > 0) {
    await prisma.waescheLog.create({
      data: {
        type: "EINLAGERUNG_SUMMARY",
        severity: "GRUEN",
        message: `${updated.count} Wäschestücke am ${now.toLocaleString("de-DE")} eingelagert.`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    updatedCount: updated.count,
    missing,
  });
}