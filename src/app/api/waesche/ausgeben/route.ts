import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { matchIncomingBarcodes, normalizeBarcodeForMatch } from "../../../lib/barcode";

function normalizeBarcodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<string>();
  for (const raw of input) {
    const s = normalizeBarcodeForMatch(typeof raw === "string" ? raw : "");
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

  // Welche existieren? (auch match auf führende 0 bei numerischen Codes)
  const allRows = await prisma.waesche.findMany({
    select: { barcode: true, kategorie: true, groesse: true },
  });
  const { matched, missing } = matchIncomingBarcodes(barcodes, allRows);
  const matchedBarcodes = matched.map((m) => m.barcode);

  const now = new Date();

  // Vorhandene: auf UMLAUF setzen + Felder schreiben
  const updated = await prisma.waesche.updateMany({
    where: { barcode: { in: matchedBarcodes } },
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
    for (const e of matched) {
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
