import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { draftSocialLinks, profiles, reservedSlugs } from "@/lib/db/schema";
import { findOrCreateUser } from "@/lib/auth/users";
import { createTestDb } from "./helpers";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;
let t: TestDb;
let current: { user: { id: string }; profile: { id: string } } | null = null;

vi.mock("@/lib/db", () => ({ getDb: () => t.db }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentAccount: async () => current }));

const ORIGIN = "http://localhost";
const A = { user: { id: "" }, profile: { id: "" } };
const B = { user: { id: "" }, profile: { id: "" } };

async function makeAccount(sub: string, slot: typeof A) {
  const user = await findOrCreateUser(t.db, { sub, email: `${sub}@example.test`, name: sub });
  const id = crypto.randomUUID();
  await t.db.insert(profiles).values({ id, userId: user.id, displayName: sub });
  slot.user.id = user.id;
  slot.profile.id = id;
}

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, { method, headers: { origin: ORIGIN, "content-type": "application/json", ...headers }, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
}

const validProfile = (name: string) => ({ displayName: name, role: "Role", bio: "", accentColor: "#B5121B", evaluationUrl: "", links: [{ service: "github", url: `https://github.com/${name}` }] });

type Body = { error: string; profile: { displayName: string }; links: Array<{ url: string }> };
const json = async (res: Response) => (await res.json()) as Body;

let profileRoute: typeof import("@/app/api/profile/route");
let slugRoute: typeof import("@/app/api/profile/slug/route");

beforeAll(async () => {
  t = await createTestDb();
  await makeAccount("alice", A);
  await makeAccount("bob", B);
  profileRoute = await import("@/app/api/profile/route");
  slugRoute = await import("@/app/api/profile/slug/route");
});
afterAll(() => t.dispose());
beforeEach(() => { current = A; });

describe("profile isolation (#5)", () => {
  it("User A's GET and PUT only ever touch A's rows", async () => {
    expect((await profileRoute.PUT(req("PUT", "/api/profile", validProfile("alice")))).status).toBe(200);
    current = B;
    expect((await profileRoute.PUT(req("PUT", "/api/profile", validProfile("bob")))).status).toBe(200);

    current = A;
    const a = await json(await profileRoute.GET());
    expect(a.profile.displayName).toBe("alice");
    expect(a.links.map((l) => l.url)).toEqual(["https://github.com/alice"]);

    current = B;
    const b = await json(await profileRoute.GET());
    expect(b.profile.displayName).toBe("bob");
    expect(b.links.map((l) => l.url)).toEqual(["https://github.com/bob"]);
  });

  it("ignores any profile or user id a client tries to send", async () => {
    current = A;
    const res = await profileRoute.PUT(req("PUT", "/api/profile", { ...validProfile("hijack"), id: B.profile.id, userId: B.user.id, profileId: B.profile.id }));
    expect(res.status).toBe(200);
    const [b] = await t.db.select().from(profiles).where(eq(profiles.id, B.profile.id));
    expect(b.displayName).toBe("bob");
    expect(await t.db.select().from(draftSocialLinks).where(eq(draftSocialLinks.profileId, B.profile.id))).toHaveLength(1);
  });

  it("A claiming a slug never changes B's profile", async () => {
    current = A;
    expect((await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "alice-id" }))).status).toBe(200);
    const [b] = await t.db.select().from(profiles).where(eq(profiles.id, B.profile.id));
    expect(b.slug).toBeNull();
  });

  it("signed-out requests get 401 on every endpoint", async () => {
    current = null;
    expect((await profileRoute.GET()).status).toBe(401);
    expect((await profileRoute.PUT(req("PUT", "/api/profile", validProfile("x")))).status).toBe(401);
    expect((await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "whoever" }))).status).toBe(401);
  });
});

describe("mutation guard", () => {
  it("rejects a foreign or missing Origin before the body is parsed", async () => {
    const bad = req("PUT", "/api/profile", "{not json", { origin: "https://evil.example" });
    expect((await profileRoute.PUT(bad)).status).toBe(403);
    const none = new Request(`${ORIGIN}/api/profile`, { method: "PUT", body: "{}" });
    expect((await profileRoute.PUT(none)).status).toBe(403);
  });

  it("checks the session before the body", async () => {
    current = null;
    expect((await profileRoute.PUT(req("PUT", "/api/profile", "{not json"))).status).toBe(401);
  });

  it("rejects an oversized body by header and by streamed size", async () => {
    const declared = req("PUT", "/api/profile", "{}", { "content-length": "999999" });
    expect((await profileRoute.PUT(declared)).status).toBe(413);
    const big = JSON.stringify({ ...validProfile("alice"), bio: "x".repeat(40_000) });
    expect((await profileRoute.PUT(req("PUT", "/api/profile", big))).status).toBe(413);
  });

  it("returns 400 for invalid JSON and field-level messages for bad links", async () => {
    expect((await profileRoute.PUT(req("PUT", "/api/profile", "{not json"))).status).toBe(400);
    const res = await profileRoute.PUT(req("PUT", "/api/profile", { ...validProfile("alice"), links: [{ service: "github", url: "https://evil.example/x" }] }));
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/official HTTPS/);
  });
});

describe("slug claim (#6)", () => {
  it("reserves the slug in the same batch as the claim", async () => {
    current = B;
    expect((await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "Bob-Id" }))).status).toBe(200);
    const [reserved] = await t.db.select().from(reservedSlugs).where(eq(reservedSlugs.slug, "bob-id"));
    expect(reserved.profileId).toBe(B.profile.id);
    const [b] = await t.db.select().from(profiles).where(eq(profiles.id, B.profile.id));
    expect(b.slug).toBe("bob-id");
  });

  it("gives clear messages for taken, reserved and badly formatted slugs", async () => {
    await makeAccount("carol", B);
    current = B;
    const taken = await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "alice-id" }));
    expect(taken.status).toBe(409);
    expect((await json(taken)).error).toMatch(/already taken/);
    const blocked = await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "admin" }));
    expect(blocked.status).toBe(400);
    expect((await json(blocked)).error).toMatch(/reserved/);
    for (const slug of ["ab", "-abc", "abc-", "a--b", "has space", "x".repeat(65), "ünï", 5, null]) {
      expect((await slugRoute.POST(req("POST", "/api/profile/slug", { slug }))).status).toBe(400);
    }
  });

  it("cannot change a slug once claimed, and the profile save cannot set it", async () => {
    current = A;
    const again = await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "another-one" }));
    expect(again.status).toBe(409);
    expect((await slugRoute.POST(req("POST", "/api/profile/slug", { slug: "alice-id" }))).status).toBe(200);
    await profileRoute.PUT(req("PUT", "/api/profile", { ...validProfile("alice"), slug: "sneaky-slug" }));
    const [a] = await t.db.select().from(profiles).where(eq(profiles.id, A.profile.id));
    expect(a.slug).toBe("alice-id");
  });

  it("keeps a slug reserved after the profile is deleted", async () => {
    await t.d1.prepare("delete from reserved_slugs where slug = ?").bind("never-there").run();
    const rows = await t.db.select().from(reservedSlugs).where(eq(reservedSlugs.slug, "alice-id"));
    expect(rows).toHaveLength(1);
  });

  it("two simultaneous claims of one slug produce exactly one winner", async () => {
    const x = { user: { id: "" }, profile: { id: "" } };
    const y = { user: { id: "" }, profile: { id: "" } };
    await makeAccount("xavier", x);
    await makeAccount("yara", y);
    const { claimSlug } = await import("@/lib/profile-data");
    const results = await Promise.all([claimSlug(t.db, x.user.id, "race-slug"), claimSlug(t.db, y.user.id, "race-slug")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
    const owners = await t.db.select().from(profiles).where(eq(profiles.slug, "race-slug"));
    expect(owners).toHaveLength(1);
    expect(await t.db.select().from(reservedSlugs).where(eq(reservedSlugs.slug, "race-slug"))).toHaveLength(1);
  });
});
