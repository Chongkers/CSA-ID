import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles, publishedProfiles, users } from "@/lib/db/schema";
import { createTestDb, multipartRequest } from "./helpers";

const state = vi.hoisted(() => ({ bindings: {} as Record<string, unknown>, db: null as unknown, account: null as unknown }));
vi.mock("@/lib/cloudflare", () => ({ getBindings: () => state.bindings }));
vi.mock("@/lib/db", () => ({ getDb: () => state.db }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentAccount: async () => state.account }));

import { POST } from "@/app/api/uploads/[kind]/route";
import { GET } from "@/app/media/[...key]/route";

const PROFILE = "11111111-1111-1111-1111-111111111111";
const upload = async (kind: string, file: Uint8Array) => POST(await multipartRequest("http://x/api/uploads/" + kind, file), { params: Promise.resolve({ kind }) });
const jpeg = new Uint8Array(readFileSync(join(process.cwd(), "tests/fixtures/gps.jpg")));

let mf: Miniflare;
let kv: KVNamespace;
let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok') } }", images: { binding: "IMAGES" }, kvNamespaces: ["KV"] } as ConstructorParameters<typeof Miniflare>[0]);
  const bindings = await mf.getBindings<{ IMAGES: unknown; KV: KVNamespace }>();
  kv = bindings.KV;
  testDb = await createTestDb();
  state.db = testDb.db;
  state.bindings = { IMAGES: bindings.IMAGES, KV: kv };
});
afterAll(async () => { await mf.dispose(); await testDb.dispose(); });

beforeEach(async () => {
  const db = testDb.db;
  await db.delete(publishedProfiles);
  await db.delete(profiles);
  await db.delete(users);
  await db.insert(users).values({ id: "u1", googleSub: "g1", email: "a@b.c", name: "A" });
  await db.insert(profiles).values({ id: PROFILE, userId: "u1", displayName: "A" });
  state.account = { user: { id: "u1" }, profile: { id: PROFILE, avatarKey: null, backgroundKey: null } };
});

const current = async () => (await testDb.db.select().from(profiles).where(eq(profiles.id, PROFILE)))[0];
const seed = async (column: "avatarKey" | "backgroundKey", key: string) => {
  await kv.put(key, new Uint8Array([9]), { metadata: { contentType: "image/webp" } });
  await testDb.db.update(profiles).set({ [column]: key }).where(eq(profiles.id, PROFILE));
  state.account = { user: { id: "u1" }, profile: { id: PROFILE, avatarKey: null, backgroundKey: null, [column]: key } };
};

describe("POST /api/uploads/[kind]", () => {
  it("stores a metadata-free WebP under a new owner-scoped key and serves it immutable", async () => {
    const response = await upload("avatar", jpeg);
    const { url } = await response.json() as { url: string };
    expect(response.status).toBe(200);
    const key = url.replace("/media/", "");
    expect(key).toMatch(new RegExp(`^img/${PROFILE}/avatar/[0-9a-f-]+\\.webp$`));
    expect((await current()).avatarKey).toBe(key);
    const stored = Buffer.from((await kv.get(key, "arrayBuffer"))!).toString("latin1");
    for (const marker of ["EXIF", "Exif", "GPS", "secret-camera"]) expect(stored).not.toContain(marker);
    const served = await GET(new Request("http://x" + url), { params: Promise.resolve({ key: key.split("/") }) });
    expect(served.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(served.headers.get("content-type")).toBe("image/webp");
  });

  it("deletes the replaced key when the published profile does not reference it", async () => {
    const old = `img/${PROFILE}/avatar/aaaa.webp`;
    await seed("avatarKey", old);
    const { url } = await (await upload("avatar", jpeg)).json() as { url: string };
    expect(url).not.toContain("aaaa");
    expect(await kv.get(old)).toBeNull();
    expect(await kv.get(url.replace("/media/", ""))).not.toBeNull();
  });

  it("keeps the replaced key while the published profile still uses it", async () => {
    const old = `img/${PROFILE}/background/bbbb.webp`;
    await seed("backgroundKey", old);
    await testDb.db.insert(publishedProfiles).values({ profileId: PROFILE, slug: "a", displayName: "A", role: "r", bio: "", accentColor: "#B5121B", backgroundKey: old, evaluationUrl: "" });
    await upload("background", jpeg);
    expect(await kv.get(old)).not.toBeNull();
  });

  it("leaves the existing image and key untouched when the upload is rejected", async () => {
    const old = `img/${PROFILE}/avatar/cccc.webp`;
    await seed("avatarKey", old);
    const response = await upload("avatar", new Uint8Array(readFileSync(join(process.cwd(), "tests/fixtures/animated.webp"))));
    expect(response.status).toBe(422);
    expect((await current()).avatarKey).toBe(old);
    expect(await kv.get(old)).not.toBeNull();
  });

  it("answers a quota failure once, with the quota message, and keeps the existing image", async () => {
    const old = `img/${PROFILE}/avatar/dddd.webp`;
    await seed("avatarKey", old);
    const put = vi.fn().mockRejectedValue(new Error("KV put() limit exceeded for the day."));
    state.bindings = { ...state.bindings, KV: { put, delete: kv.delete.bind(kv) } };
    const response = await upload("avatar", jpeg);
    state.bindings = { ...state.bindings, KV: kv };
    expect(response.status).toBe(429);
    expect(((await response.json()) as { error: string }).error).toMatch(/free image limit/);
    expect(put).toHaveBeenCalledTimes(1);
    expect((await current()).avatarKey).toBe(old);
    expect(await kv.get(old)).not.toBeNull();
  });

  it("rejects an unauthenticated upload", async () => {
    state.account = null;
    expect((await upload("avatar", jpeg)).status).toBe(401);
  });
});

describe("GET /media", () => {
  it("returns a short-lived 404 for a missing key, never immutable", async () => {
    const response = await GET(new Request("http://x"), { params: Promise.resolve({ key: ["img", PROFILE, "avatar", "zzzz.webp"] }) });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).not.toMatch(/immutable/);
  });
});
