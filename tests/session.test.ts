import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  hashToken,
  SESSION_LIFETIME_SECONDS,
  validateSession,
} from "@/lib/auth/session";
import { findOrCreateUser } from "@/lib/auth/users";
import { sessions } from "@/lib/db/schema";
import { createTestDb } from "./helpers";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;
let t: TestDb;
let userId: string;
const T0 = 1_800_000_000;

beforeAll(async () => {
  t = await createTestDb();
  userId = (await findOrCreateUser(t.db, { sub: "sub-1", email: "a@example.test" })).id;
});
afterAll(() => t.dispose());

async function storedExpiry(token: string) {
  const row = await t.d1
    .prepare("select expires_at from sessions where token_hash = ?")
    .bind(await hashToken(token))
    .first<{ expires_at: number }>();
  return row?.expires_at;
}

describe("sessions", () => {
  it("creates a session that validates and stores only the token hash", async () => {
    const token = await createSession(t.db, userId, T0);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect((await validateSession(t.db, token, T0 + 1))?.id).toBe(userId);

    const rows = await t.db.select().from(sessions);
    expect(JSON.stringify(rows).includes(token)).toBe(false);
  });

  it("treats missing, tampered and unknown tokens as signed out", async () => {
    const token = await createSession(t.db, userId, T0);
    expect(await validateSession(t.db, undefined, T0)).toBeNull();
    expect(await validateSession(t.db, "", T0)).toBeNull();
    expect(await validateSession(t.db, token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), T0)).toBeNull();
    expect(await validateSession(t.db, "not-a-token", T0)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const justBefore = await createSession(t.db, userId, T0);
    expect(await validateSession(t.db, justBefore, T0 + SESSION_LIFETIME_SECONDS - 1)).not.toBeNull();
    const atExpiry = await createSession(t.db, userId, T0);
    expect(await validateSession(t.db, atExpiry, T0 + SESSION_LIFETIME_SECONDS)).toBeNull();
    const longAfter = await createSession(t.db, userId, T0);
    expect(await validateSession(t.db, longAfter, T0 + SESSION_LIFETIME_SECONDS + 1000)).toBeNull();
  });

  it("does not renew in the first half of the lifetime", async () => {
    const token = await createSession(t.db, userId, T0);
    await validateSession(t.db, token, T0 + SESSION_LIFETIME_SECONDS / 2 - 10);
    expect(await storedExpiry(token)).toBe(T0 + SESSION_LIFETIME_SECONDS);
  });

  it("renews after half the lifetime has passed", async () => {
    const token = await createSession(t.db, userId, T0);
    const later = T0 + SESSION_LIFETIME_SECONDS / 2 + 10;
    expect(await validateSession(t.db, token, later)).not.toBeNull();
    expect(await storedExpiry(token)).toBe(later + SESSION_LIFETIME_SECONDS);
    expect(await validateSession(t.db, token, T0 + SESSION_LIFETIME_SECONDS + 10)).not.toBeNull();
  });

  it("sign-out deletes the row so the old token stops working", async () => {
    const token = await createSession(t.db, userId, T0);
    await deleteSession(t.db, token);
    expect(await storedExpiry(token)).toBeUndefined();
    expect(await validateSession(t.db, token, T0 + 1)).toBeNull();
  });

  it("revokes every session of a user", async () => {
    const a = await createSession(t.db, userId, T0);
    const b = await createSession(t.db, userId, T0);
    await deleteUserSessions(t.db, userId);
    expect(await validateSession(t.db, a, T0 + 1)).toBeNull();
    expect(await validateSession(t.db, b, T0 + 1)).toBeNull();
  });
});

describe("users", () => {
  it("identifies a user by Google subject, not email", async () => {
    const first = await findOrCreateUser(t.db, { sub: "sub-2", email: "old@example.test" });
    const again = await findOrCreateUser(t.db, { sub: "sub-2", email: "new@example.test" });
    expect(again.id).toBe(first.id);
    expect(again.email).toBe("new@example.test");
    const other = await findOrCreateUser(t.db, { sub: "sub-3", email: "new@example.test" });
    expect(other.id).not.toBe(first.id);
  });
});
