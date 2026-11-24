import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  COOKIE_NAME,
  SessionPayload,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

export { COOKIE_NAME, signSessionToken, verifySessionToken };
export type { SessionPayload };

// 1. Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 2. Cookie management
export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(options?: {
  adminOnly?: boolean;
}): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("No autorizado. Inicia sesión nuevamente.");
  }
  if (options?.adminOnly && session.role !== "admin") {
    throw new Error("No tienes permiso para realizar esta acción.");
  }
  return session;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
