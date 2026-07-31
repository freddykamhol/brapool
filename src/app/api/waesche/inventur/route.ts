import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { matchIncomingBarcodes, normalizeBarcodeForMatch } from "@/app/lib/barcode";

function parseBarcodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map(normalizeBarcodeForMatch)
        .filter(Boolean)
    )
  );
}

export async function GET() {
  const items = await prisma.waesche.findMany({
    select: { barcode: true, status: true },
  });
  const total = items.length;
  const umlauf = items.filter((item) => item.status === "UMLAUF").length;

  return NextResponse.json({
    ok: true,
    total,
    umlauf,
    expected: total - umlauf,
    items,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const barcodes = parseBarcodes(body?.barcodes);

  if (!barcodes.length) {
    return NextResponse.json(
      { ok: false, error: "Bitte mindestens einen Barcode scannen." },
      { status: 400 }
    );
  }

  const rows = await prisma.waesche.findMany({
    select: { systemId: true, barcode: true, status: true },
  });
  const { matched, missing } = matchIncomingBarcodes(barcodes, rows);

  if (missing.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Einige Barcodes sind nicht im System vorhanden.",
        missing,
      },
      { status: 400 }
    );
  }

  const scannedIds = matched.map((item) => item.systemId);
  const umlaufScanned = matched.filter((item) => item.status === "UMLAUF").length;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const stored = await tx.waesche.updateMany({
      where: { systemId: { in: scannedIds } },
      data: {
        status: "EINGELAGERT",
        eingelagertAm: now,
        ausgetragenVon: null,
        ausgegebenAn: null,
        ausgabeDatum: null,
      },
    });

    const unclear = await tx.waesche.updateMany({
      where: {
        systemId: { notIn: scannedIds },
        status: { not: "UMLAUF" },
      },
      data: { status: "UNKLAR" },
    });

    await tx.waescheLog.create({
      data: {
        type: "INVENTUR_SUMMARY",
        severity: unclear.count > 0 ? "GELB" : "GRUEN",
        message:
          `Inventur vom ${now.toLocaleString("de-DE")}: ` +
          `${stored.count} gescannt und eingelagert, ${unclear.count} nicht gescannte Teile auf unklar gesetzt. ` +
          `${umlaufScanned} zuvor im Umlauf befindliche Teile wurden durch den Scan zurück ins Lager gebucht.`,
      },
    });

    return { stored: stored.count, unclear: unclear.count };
  });

  return NextResponse.json({
    ok: true,
    scannedCount: result.stored,
    unclearCount: result.unclear,
    umlaufScanned,
    protectedUmlaufCount: rows.filter(
      (item) => item.status === "UMLAUF" && !scannedIds.includes(item.systemId)
    ).length,
  });
}
