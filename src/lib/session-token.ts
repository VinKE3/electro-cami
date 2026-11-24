import { SignJWT, jwtVerify } from "jose";

const fallbackSecret = "electro-cami-secret-key-super-secure-2026-production";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  console.warn(
    "[electro-cami] AUTH_SECRET no está definido en producción; usando clave de respaldo."
  );
}

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || fallbackSecret
);

export const COOKIE_NAME = "electro_cami_session";

export interface SessionPayload {
  userId: number;
  name: string;
  username: string;
  role: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 días para que el papá no tenga que loguearse todos los días en el celular
    .sign(SECRET_KEY);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
