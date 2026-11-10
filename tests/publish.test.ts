import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { loadPublishedProfile, unpublishProfile } from "@/lib/public/published-profile";
import { profileCacheKey, withProfileEdgeCache } from "@/lib/edge-cache";
import { draftSocialLinks, profiles, publishedProfiles, publishedSocialLinks, users } from "@/lib/db/schema";
import { createTestDb } from "./helpers";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;
let t: TestDb;

async function seed(id: string, slug: string, status: "draft" | "published" | "suspended", snapshot: boolean) {
  await t.db.insert(users).values({ id: `u-${id}`, googleSub: `sub-${id}`, email: `${id}@example.test` });
  await t.db.insert(profiles).values({ id, userId: `u-${id}`, slug, displayName: id, role: "Student assistant", evaluationUrl: "https://forms.example/e", status });
  if (snapshot) {
    await t.db.insert(publishedProfiles).values({ profileId: id, slug, displayName: id, role: "Student assistant", bio: "", accentColor: "#B5121B", evaluationUrl: "https://forms.example/e" });
    await t.db.insert(publishedSocialLinks).values({ id: `l-${id}`, profileId: id, service: "github", url: "https://github.com/x", displayOrder: 0 });
  }
}

beforeAll(async () => {
  t = await createTestDb();
  await seed("live", "live", "published", true);
  await seed("drafty", "drafty", "draft", false);
  await seed("unpub", "unpub", "published", true);
  await seed("banned", "banned", "suspended", true);
});
afterAll(() => t.dispose());

describe("public profile lookup", () => {
  it("returns the published snapshot with its links", async () => {
    const profile = await loadPublishedProfile(t.db, "live");
    expect(profile?.displayName).toBe("live");
    expect(profile?.links).toEqual([{ service: "github", url: "https://github.com/x" }]);
  });

  it("gives the same null for missing, draft, unpublished and suspended Slugs", async () => {
    await unpublishProfile(t.db, "unpub");
    const results = await Promise.all(["nope", "drafty", "unpub", "banned"].map((slug) => loadPublishedProfile(t.db, slug)));
    expect(results).toEqual([null, null, null, null]);
  });
});

describe("unpublish", () => {
  it("removes the snapshot, flips status to draft and keeps the draft", async () => {
    await seed("again", "again", "published", true);
    await t.db.insert(draftSocialLinks).values({ id: "d-again", profileId: "again", service: "github", url: "https://github.com/x", displayOrder: 0 });
    await unpublishProfile(t.db, "again");
    expect(await loadPublishedProfile(t.db, "again")).toBeNull();
    const [row] = await t.db.select().from(profiles).where(eq(profiles.id, "again"));
    expect(row.status).toBe("draft");
    expect(await t.db.select().from(draftSocialLinks).where(and(eq(draftSocialLinks.profileId, "again")))).toHaveLength(1);
    expect(await t.db.select().from(publishedProfiles).where(eq(publishedProfiles.profileId, "again"))).toHaveLength(0);
  });

  it("does not un-suspend a suspended profile", async () => {
    await unpublishProfile(t.db, "banned");
    const [row] = await t.db.select().from(profiles).where(eq(profiles.id, "banned"));
    expect(row.status).toBe("suspended");
  });
});

describe("edge cache wrapper", () => {
  const store = new Map<string, Response>();
  const fakeCache = { match: async (r: Request) => store.get(r.url)?.clone(), put: async (r: Request, res: Response) => void store.set(r.url, res), delete: async (r: Request) => store.delete(r.url) };
  Object.assign(globalThis, { caches: { default: fakeCache } });
  const ctx = { waitUntil: (p: Promise<unknown>) => void p };

  it("keys only /id/<slug> and ignores queries", () => {
    expect(profileCacheKey("https://x.test/id/a?utm=1")?.url).toBe("https://x.test/id/a");
    expect(profileCacheKey("https://x.test/dashboard")).toBeNull();
  });

  it("returns byte-identical unavailable responses whatever the slug", async () => {
    const handler = withProfileEdgeCache(async (request) => new Response(`not found for ${request.url}`, { status: 404, headers: { "x-powered-by": "next", etag: request.url } }));
    const [a, b] = await Promise.all([handler(new Request("https://x.test/id/missing-one"), {}, ctx), handler(new Request("https://x.test/id/another-slug"), {}, ctx)]);
    expect(a.status).toBe(404);
    expect(b.status).toBe(404);
    expect(await a.text()).toBe(await b.text());
    expect([...a.headers]).toEqual([...b.headers]);
  });

  it("caches 200 and 404 for 60s, never other statuses or routes", async () => {
    let calls = 0;
    const handler = withProfileEdgeCache(async (request) => { calls++; return new Response("body", { status: new URL(request.url).pathname.endsWith("/500") ? 500 : 200 }); });
    const first = await handler(new Request("https://x.test/id/a"), {}, ctx);
    expect(first.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=60");
    await handler(new Request("https://x.test/id/a"), {}, ctx);
    expect(calls).toBe(1);
    await handler(new Request("https://x.test/id/500"), {}, ctx);
    await handler(new Request("https://x.test/id/500"), {}, ctx);
    expect(calls).toBe(3);
    await handler(new Request("https://x.test/dashboard"), {}, ctx);
    await handler(new Request("https://x.test/dashboard"), {}, ctx);
    expect(calls).toBe(5);
  });
});
