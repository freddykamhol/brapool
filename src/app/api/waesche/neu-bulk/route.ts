import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import type { Prisma } from "@prisma/client";

type WaescheKategorie = "HOSE" | "POLO" | "SWEATJACKE" | "SOFTSHELLJACKE" | "HARDSHELLJACKE";
type WaescheStatus = "EINGELAGERT" | "UMLAUF" | "DEFEKT_REPARATUR" | "DEFEKT_ENTSORGT";

type NewItem = {
  barcode: string;
  kategorie: WaescheKategorie;
  groesse: string;
  cws: boolean;
};

type IncomingItem = Partial<NewItem> & { [key: string]: unknown };

function isKategorie(value: unknown): value is WaescheKategorie {
  return (
    value === "HOSE" ||
    value === "POLO" ||
    value === "SWEATJACKE" ||
    value === "SOFTSHELLJACKE" ||
    value === "HARDSHELLJACKE"
  );
}

function norm(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
}

async function nextSystemId(tx: Prisma.TransactionClient): Promise<number> {
  const max = await tx.waesche.findFirst({
    orderBy: { systemId: "desc" },
    select: { systemId: true },
  });
  const next = (max?.systemId ?? 999) + 1; // startet bei 1000
  if (next > 9999) throw new Error("SystemID Overflow (>9999).");
  return next;
}

// POST { items: [{barcode,kategorie,groesse,cws?}] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

  const mapped: Array<{ barcode: string; kategorie: unknown; groesse: string; cws: boolean }> = items
    .map((x: IncomingItem) => ({
      barcode: norm(x?.barcode),
      kategorie: x?.kategorie,
      groesse: norm(x?.groesse),
      cws: Boolean(x?.cws),
    }));

  const cleaned: NewItem[] = mapped
    .filter((x) => Boolean(x.barcode && x.kategorie && x.groesse))
    .filter((x): x is NewItem => isKategorie(x.kategorie));

  if (!cleaned.length) {
    return NextResponse.json({ ok: false, error: "Keine gültigen neuen Einträge übergeben." }, { status: 400 });
  }

  // Duplikate im Request entfernen
  const map = new Map<string, NewItem>();
  for (const it of cleaned) map.set(it.barcode, it);
  const unique = Array.from(map.values());

  const now = new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Prüfen: welche existieren schon?
      const existing = await tx.waesche.findMany({
        where: { barcode: { in: unique.map((u) => u.barcode) } },
        select: { barcode: true },
      });
      const existsSet = new Set(existing.map((e) => e.barcode));
      const toCreate = unique.filter((u) => !existsSet.has(u.barcode));

      let currentId = await nextSystemId(tx);

      // Einzelcreates (weil systemId manuell)
      const createdRows = [];
      for (const it of toCreate) {
        const row = await tx.waesche.create({
          data: {
            systemId: currentId++,
            barcode: it.barcode,
            kategorie: it.kategorie,
            groesse: it.groesse,
            cws: Boolean(it.cws),
            status: "EINGELAGERT" as WaescheStatus,
            eingelagertAm: now,
          },
          select: { systemId: true, barcode: true },
        });
        createdRows.push(row);
      }

      // Summary Log
      if (createdRows.length > 0) {
        await tx.waescheLog.create({
          data: {
            type: "EINLAGERUNG_SUMMARY",
            severity: "GRUEN",
            message: `${createdRows.length} neue Wäschestücke am ${now.toLocaleString("de-DE")} angelegt & eingelagert.`,
          },
        });
      }

      return { createdRows, skippedExisting: unique.length - toCreate.length };
    });

    return NextResponse.json({ ok: true, ...created });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Bulk-Anlage fehlgeschlagen." },
      { status: 500 },
    );
  }
}
