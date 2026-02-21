import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { normalizeBarcodeForMatch, matchIncomingBarcodes } from "../../../lib/barcode";

function normalizeBarcodes(input: string[]): string[] {
  const set = new Set<string>();
  for (const raw of input) {
    const s = normalizeBarcodeForMatch(raw ?? "");
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

  const allRows = await prisma.waesche.findMany({
    select: { barcode: true },
  });
  const { matched, missing } = matchIncomingBarcodes(barcodes, allRows);
  const matchedBarcodes = matched.map((m) => m.barcode);

  // vorhandene: auf eingelagert setzen
  const now = new Date();
  const updated = await prisma.waesche.updateMany({
    where: { barcode: { in: matchedBarcodes } },
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
