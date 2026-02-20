import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const logs = await prisma.waescheLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      type: true,
      severity: true,
      message: true,
      createdAt: true,
      waescheSystemId: true,
    },
  });

  return NextResponse.json({ ok: true, logs });
}