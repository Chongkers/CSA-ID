import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { Miniflare } from "miniflare";
import { draftSocialLinks, profiles, publishedProfiles, publishedSocialLinks, reservedSlugs, sessions, users } from "@/lib/db/schema";
import { claimSlug } from "@/lib/profile-data";
import { createSession, SESSION_COOKIE, validateSession } from "@/lib/auth/session";
import { findOrCreateUser } from "@/lib/auth/users";
import { createTestDb } from "./helpers";

const state = vi.hoisted(() => ({ db: null as unknown, kv: null as unknown, current: null as unknown }));
vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("@/lib/cloudflare", () => ({ getBindings: () => ({ KV: state.kv }) }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentAccount: async () => state.current }));

import { DELETE } from "@/app/api/account/route";
import { GET as exportGet } from "@/app/api/profile/export/route";

const ORIGIN = "http://localhost";
const del = (headers: Record<string, string> = { origin: ORIGIN }) => DELETE(new Request(`${ORIGIN}/api/account`, { method: "DELETE", headers }));

let mf: Miniflare;
let kv: KVNamespace;
let t: Awaited<ReturnType<typeof createTestDb>>;
let aliceToken: string;
const ids = { alice: { user: "", profile: "" }, bob: { user: "", profile: "" } };

async function seed(name: "alice" | "bob") {
  const user = await findOrCreateUser(t.db, { sub: `sub-${name}`, email: `${name}@example.test`, name });
  const profile = crypto.randomUUID();
  const avatar = `img/${profile}/avatar/a.webp`, bg = `img/${profile}/background/b.webp`, oldAvatar = `img/${profile}/avatar/old.webp`;
  await t.db.insert(profiles).values({ id: profile, userId: user.id, displayName: name, avatarKey: avatar, backgroundKey: bg, evaluationUrl: "https://forms.example/e", status: "published" });
  await t.db.insert(draftSocialLinks).values({ id: crypto.randomUUID(), profileId: profile, service: "github", url: `https://github.com/${name}`, displayOrder: 0 });
  const claimed = await claimSlug(t.db, user.id, `${name}-id`);
  expect(claimed.ok).toBe(true);
  await t.db.insert(publishedProfiles).values({ profileId: profile, slug: `${name}-id`, displayName: name, role: "r", bio: "", accentColor: "#B5121B", avatarKey: oldAvatar, evaluationUrl: "https://forms.example/e" });
  await t.db.insert(publishedSocialLinks).values({ id: crypto.randomUUID(), profileId: profile, service: "github", url: `https://github.com/${name}`, displayOrder: 0 });
  for (const key of [avatar, bg, oldAvatar]) await kv.put(key, "img");
  const token = await createSession(t.db, user.id);
  ids[name] = { user: user.id, profile };
  return { user, profile, token };
}

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok') } }", kvNamespaces: ["KV"] } as ConstructorParameters<typeof Miniflare>[0]);
  kv = (await mf.getBindings<{ KV: KVNamespace }>()).KV;
  state.kv = kv;
  t = await createTestDb();
  state.db = t.db;
});
afterAll(async () => { await mf.dispose(); await t.dispose(); });
beforeEach(async () => {
  await t.db.delete(users);
  await t.db.delete(reservedSlugs);
  const keys = await kv.list();
  await Promise.all(keys.keys.map((k) => kv.delete(k.name)));
  const alice = await seed("alice");
  aliceToken = alice.token as string;
  await seed("bob");
  state.current = { user: { id: ids.alice.user }, profile: { id: ids.alice.profile } };
});

describe("export", () => {
  it("downloads only the signed-in User's profile and links as JSON", async () => {
    const res = await exportGet();
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const body = await res.json() as { account: { email: string }; profile: { displayName: string; slug: string }; socialLinks: Array<{ url: string }> };
    expect(body.account.email).toBe("alice@example.test");
    expect(body.profile).toMatchObject({ displayName: "alice", slug: "alice-id" });
    expect(body.socialLinks.map((l) => l.url)).toEqual(["https://github.com/alice"]);
    expect(JSON.stringify(body)).not.toContain("bob");
  });

  it("refuses a signed-out request", async () => {
    state.current = null;
    expect((await exportGet()).status).toBe(401);
  });
});

describe("delete account", () => {
  it("rejects a wrong origin and a signed-out request without deleting anything", async () => {
    expect((await del({ origin: "https://evil.test" })).status).toBe(403);
    expect((await del({})).status).toBe(403);
    state.current = null;
    expect((await del()).status).toBe(401);
    expect(await t.db.select().from(users).where(eq(users.id, ids.alice.user))).toHaveLength(1);
  });

  it("removes every row, image and session of the User and nothing of anyone else", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`);
    expect(await t.db.select().from(users).where(eq(users.id, ids.alice.user))).toHaveLength(0);
    expect(await t.db.select().from(profiles).where(eq(profiles.id, ids.alice.profile))).toHaveLength(0);
    expect(await t.db.select().from(draftSocialLinks).where(eq(draftSocialLinks.profileId, ids.alice.profile))).toHaveLength(0);
    expect(await t.db.select().from(publishedProfiles).where(eq(publishedProfiles.profileId, ids.alice.profile))).toHaveLength(0);
    expect(await t.db.select().from(publishedSocialLinks).where(eq(publishedSocialLinks.profileId, ids.alice.profile))).toHaveLength(0);
    expect(await t.db.select().from(sessions).where(eq(sessions.userId, ids.alice.user))).toHaveLength(0);
    expect((await kv.list({ prefix: `img/${ids.alice.profile}/` })).keys).toHaveLength(0);
    expect(await validateSession(t.db, aliceToken)).toBeNull();

    expect(await t.db.select().from(users).where(eq(users.id, ids.bob.user))).toHaveLength(1);
    expect(await t.db.select().from(publishedProfiles).where(eq(publishedProfiles.profileId, ids.bob.profile))).toHaveLength(1);
    expect((await kv.list({ prefix: `img/${ids.bob.profile}/` })).keys).toHaveLength(3);
  });

  it("keeps the Slug reserved and gives a returning User a fresh account that cannot reclaim it", async () => {
    await del();
    const [reserved] = await t.db.select().from(reservedSlugs).where(eq(reservedSlugs.slug, "alice-id"));
    expect(reserved).toBeDefined();
    const again = await findOrCreateUser(t.db, { sub: "sub-alice", email: "alice@example.test", name: "alice" });
    expect(again.id).not.toBe(ids.alice.user);
    await t.db.insert(profiles).values({ id: crypto.randomUUID(), userId: again.id, displayName: "alice" });
    const claim = await claimSlug(t.db, again.id, "alice-id");
    expect(claim).toMatchObject({ ok: false, status: 409 });
  });

  it("purges the edge cache for the old public page", async () => {
    const store = new Map<string, Response>([[`${ORIGIN}/id/alice-id`, new Response("cached")]]);
    Object.assign(globalThis, { caches: { default: { match: async (r: Request) => store.get(r.url), put: async () => {}, delete: async (r: Request) => store.delete(r.url) } } });
    await del();
    expect(store.has(`${ORIGIN}/id/alice-id`)).toBe(false);
  });

  it("stays signed in and keeps the account when image deletion fails, so it can be retried", async () => {
    const realDelete = kv.delete.bind(kv);
    state.kv = { list: kv.list.bind(kv), delete: async () => { throw new Error("kv down"); } };
    expect((await del()).status).toBe(503);
    expect(await validateSession(t.db, aliceToken)).not.toBeNull();
    state.kv = { list: kv.list.bind(kv), delete: realDelete };
    expect((await del()).status).toBe(200);
    expect((await kv.list({ prefix: `img/${ids.alice.profile}/` })).keys).toHaveLength(0);
  });
});
