import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { profiles, sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "csa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

export async function createSession(userId: string) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  const now = Math.floor(Date.now() / 1000);
  await getDb().insert(sessions).values({ id: crypto.randomUUID(), tokenHash: await hashToken(token), userId, expiresAt: now + SESSION_TTL_SECONDS, createdAt: now });
  return { token, maxAge: SESSION_TTL_SECONDS };
}

export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
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
