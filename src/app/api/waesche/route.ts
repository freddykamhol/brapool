import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  const items = await prisma.waesche.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      systemId: true,
      kategorie: true,
      groesse: true,
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

  const data: any = {};
  if (body.kategorie) data.kategorie = body.kategorie;
  if (typeof body.groesse === "string") data.groesse = body.groesse.trim();
  if (typeof body.barcode === "string") data.barcode = body.barcode.trim();
  if (body.status) data.status = body.status;
  if (typeof body.bemerkung === "string") data.bemerkung = body.bemerkung.trim();

  // optional: wenn du im Modal Ausgabe-Daten bearbeiten willst
  if (typeof body.ausgetragenVon === "string") data.ausgetragenVon = body.ausgetragenVon.trim();
  if (typeof body.ausgegebenAn === "string") data.ausgegebenAn = body.ausgegebenAn.trim();
  if (typeof body.ausgabeDatum === "string" || body.ausgabeDatum === null) {
    data.ausgabeDatum = body.ausgabeDatum ? new Date(body.ausgabeDatum) : null;
  }

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