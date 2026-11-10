import { and, eq, gt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/lib/db/schema";

export type Db = DrizzleD1Database<typeof schema>;

export const SESSION_COOKIE = "session";
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

const nowSeconds = () => Math.floor(Date.now() / 1000);

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db: Db, userId: string, now = nowSeconds()) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  await db.insert(schema.sessions).values({
    tokenHash: await hashToken(token),
    userId,
    expiresAt: now + SESSION_LIFETIME_SECONDS,
    createdAt: now,
  });
  return token;
}

export async function validateSession(db: Db, token: string | undefined, now = nowSeconds()) {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const [row] = await db
    .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)));
  if (!row) return null;

  if (row.expiresAt - now < SESSION_LIFETIME_SECONDS / 2) {
    await db
      .update(schema.sessions)
      .set({ expiresAt: now + SESSION_LIFETIME_SECONDS })
      .where(eq(schema.sessions.tokenHash, tokenHash));
  }
  return row.user;
}

export async function deleteSession(db: Db, token: string | undefined) {
  if (!token) return;
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, await hashToken(token)));
}

export async function deleteUserSessions(db: Db, userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

// The database row is the authority on expiry, so the cookie outlives it and is never refreshed by Server Components.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 400 * 24 * 60 * 60,
} as const;
