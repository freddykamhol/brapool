import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    session: {
      uid: session.uid,
      userId: session.userId,
      name: session.name,
    },
  });
}
