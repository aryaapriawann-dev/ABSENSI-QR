import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { findUserById, type User } from "./db";

export const SESSION_COOKIE = "absensi_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

// Payload session: "id:role" di-base64. Cukup untuk scaffold + middleware Edge.
export function encodeSession(user: Pick<User, "id" | "role">): string {
  return Buffer.from(`${user.id}:${user.role}`, "utf-8").toString("base64url");
}

export function decodeSession(
  token: string
): { id: number; role: "admin" | "petugas" } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const [idRaw, role] = raw.split(":");
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (role !== "admin" && role !== "petugas") return null;
    return { id, role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  user: Pick<User, "id" | "role">
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const decoded = decodeSession(token);
  if (!decoded) return null;
  return findUserById(decoded.id) ?? null;
}
