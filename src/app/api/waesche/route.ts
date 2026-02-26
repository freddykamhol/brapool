import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export async function GET() {
  const items = await prisma.waesche.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      systemId: true,
      kategorie: true,
      groesse: true,
      cws: true,
      barcode: true,
      status: true,
      bemerkung: true,
      eingelagertAm: true,
      ausgetragenVon: true,
      ausgegebenAn: true,
      ausgabeDatum: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.systemId !== "number") {
    return NextResponse.json({ ok: false, error: "systemId fehlt" }, { status: 400 });
  }

  const systemId: number = body.systemId;

  const data: Prisma.WaescheUpdateInput = {};
  if (body.kategorie) data.kategorie = body.kategorie;
  if (typeof body.groesse === "string") data.groesse = body.groesse.trim();
  if (typeof body.barcode === "string") data.barcode = body.barcode.trim();
  if (typeof body.cws === "boolean") data.cws = body.cws;
  if (body.status) data.status = body.status;
  if (typeof body.bemerkung === "string") data.bemerkung = body.bemerkung.trim();

  // optional: wenn du im Modal Ausgabe-Daten bearbeiten willst
  if (typeof body.ausgetragenVon === "string") data.ausgetragenVon = body.ausgetragenVon.trim();
  if (typeof body.ausgegebenAn === "string") data.ausgegebenAn = body.ausgegebenAn.trim();
  data.ausgabeDatum = new Date();

  const updated = await prisma.waesche.update({
    where: { systemId },
    data,
  });

  await prisma.waescheLog.create({
    data: {
      type: "MANUELL",
      severity: "INFO",
      waescheSystemId: updated.systemId,
      message: `Wäschestück ${updated.kategorie} (${updated.groesse}) [${updated.barcode}] wurde bearbeitet.`,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSystemId = searchParams.get("systemId");
  let systemId = rawSystemId ? Number(rawSystemId) : NaN;

  if (!Number.isFinite(systemId)) {
    const body = await req.json().catch(() => null);
    if (body && typeof body.systemId === "number") {
      systemId = body.systemId;
    }
  }

  if (!Number.isFinite(systemId)) {
    return NextResponse.json({ ok: false, error: "systemId fehlt" }, { status: 400 });
  }

  const existing = await prisma.waesche.findUnique({
    where: { systemId },
    select: { systemId: true, barcode: true, kategorie: true, groesse: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Wäschestück nicht gefunden" }, { status: 404 });
  }

  try {
    await prisma.waesche.delete({
      where: { systemId },
    });
  } catch (error) {
    console.error("[waesche/delete] delete failed", error);
    return NextResponse.json({ ok: false, error: "Löschen fehlgeschlagen" }, { status: 500 });
  }

  // Audit logging should never block delete.
  try {
    await prisma.waescheLog.create({
      data: {
        type: "MANUELL",
        severity: "INFO",
        message: `Wäschestück ${existing.kategorie} (${existing.groesse}) [${existing.barcode}] mit System-ID ${existing.systemId} wurde gelöscht.`,
      },
    });
  } catch (error) {
    console.error("[waesche/delete] log create failed", error);
  }

  return NextResponse.json({ ok: true });
}
