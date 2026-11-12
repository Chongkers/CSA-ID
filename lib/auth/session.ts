import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { profiles, sessions, users } from "@/lib/db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/lib/db/schema";

export type Db = DrizzleD1Database<typeof schema>;
export const SESSION_COOKIE = "csa_session";
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_LIFETIME_SECONDS,
} as const;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createSession(userId: string): Promise<{ token: string; maxAge: number }>;
export function createSession(db: Db, userId: string, now?: number): Promise<string>;
export async function createSession(
  arg1: string | Db,
  arg2?: string,
  arg3?: number,
): Promise<string | { token: string; maxAge: number }> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  if (typeof arg1 === "string") {
    const userId = arg1;
    const now = Math.floor(Date.now() / 1000);
    await getDb().insert(sessions).values({ tokenHash: await hashToken(token), userId, expiresAt: now + SESSION_LIFETIME_SECONDS, createdAt: now });
    return { token, maxAge: SESSION_LIFETIME_SECONDS };
  } else {
    const db = arg1;
    const userId = arg2!;
    const now = arg3 ?? Math.floor(Date.now() / 1000);
    await db.insert(sessions).values({ tokenHash: await hashToken(token), userId, expiresAt: now + SESSION_LIFETIME_SECONDS, createdAt: now });
    return token;
  }
}

export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
}

export async function deleteSession(db: Db, token: string | undefined) {
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
}

export async function deleteUserSessions(db: Db, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function validateSession(db: Db, token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)));
  if (!row) return null;
  if (row.expiresAt - now < SESSION_LIFETIME_SECONDS / 2) {
    await db.update(sessions).set({ expiresAt: now + SESSION_LIFETIME_SECONDS }).where(eq(sessions.tokenHash, tokenHash));
  }
  return row.user;
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const [result] = await getDb()
    .select({ user: users, profile: profiles })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.tokenHash, await hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  return result ?? null;
}
