import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "brapool_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 60;
export const SESSION_EXPIRES_IN = "30m";

export type SessionPayload = {
  uid: string;
  userId: string;
  name: string;
};

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET fehlt/zu kurz (mind. 16 Zeichen)");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload, expiresIn: string = SESSION_EXPIRES_IN) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.uid !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return { uid: payload.uid, userId: payload.userId, name: payload.name };
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p.startsWith(`${name}=`)) continue;
    const v = p.slice(name.length + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  const token = getCookieValue(req.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return null;
  return verifySession(token);
}
