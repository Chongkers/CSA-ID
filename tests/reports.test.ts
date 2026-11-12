import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { abuseReports, profiles, publishedProfiles, users } from "@/lib/db/schema";
import { unpublishProfile } from "@/lib/public/published-profile";
import { createTestDb } from "./helpers";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;
let t: TestDb;
// In-memory KV that honours expirationTtl against Date.now(), so fake timers can expire keys.
const kv = new Map<string, { value: string; expiresAt: number }>();
const fakeKv = {
  get: async (key: string) => {
    const entry = kv.get(key);
    return entry && entry.expiresAt > Date.now() ? entry.value : null;
  },
  put: async (key: string, value: string, options?: { expirationTtl?: number }) =>
    void kv.set(key, { value, expiresAt: options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : Infinity }),
};

vi.mock("@/lib/db", () => ({ getDb: () => t.db }));
vi.mock("@/lib/cloudflare", () => ({ getBindings: () => ({ KV: fakeKv }) }));

const ORIGIN = "http://localhost";
const valid = { profile: "live", reason: "impersonation", details: "  This is not the real assistant.  " };

function report(body: unknown, { ip = "203.0.113.1", origin = ORIGIN as string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "cf-connecting-ip": ip };
  if (origin !== null) headers.origin = origin;
  return new Request(`${ORIGIN}/api/reports`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

const storedReports = () => t.db.select().from(abuseReports);

async function seed(id: string, status: "draft" | "published" | "suspended", snapshot: boolean) {
  await t.db.insert(users).values({ id: `u-${id}`, googleSub: `sub-${id}`, email: `${id}@example.test` });
  await t.db.insert(profiles).values({ id, userId: `u-${id}`, slug: id, displayName: id, status });
  if (snapshot) await t.db.insert(publishedProfiles).values({ profileId: id, slug: id, displayName: id, role: "Student assistant", bio: "", accentColor: "#B5121B", evaluationUrl: "" });
}

let route: typeof import("@/app/api/reports/route");

beforeAll(async () => {
  t = await createTestDb();
  await seed("live", "published", true);
  await seed("drafty", "draft", false);
  await seed("banned", "suspended", true);
  await seed("unpub", "published", true);
  await unpublishProfile(t.db, "unpub");
  route = await import("@/app/api/reports/route");
});
afterAll(() => t.dispose());
beforeEach(async () => {
  kv.clear();
  await t.db.delete(abuseReports);
});

describe("POST /api/reports", () => {
  it("stores an open Abuse Report against the reported Profile with trimmed details", async () => {
    const res = await route.POST(report(valid));
    expect(res.status).toBe(201);
    const rows = await storedReports();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ profileId: "live", reason: "impersonation", details: "This is not the real assistant.", status: "open" });
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["details under five characters once trimmed", { ...valid, details: "  abc  " }],
    ["details over 1000 characters", { ...valid, details: "x".repeat(1001) }],
    ["an unknown reason", { ...valid, reason: "spam" }],
    ["a missing profile", { reason: "impersonation", details: valid.details }],
  ])("rejects %s with 400 and stores nothing", async (_case, body) => {
    const res = await route.POST(report(body));
    expect(res.status).toBe(400);
    expect(await storedReports()).toHaveLength(0);
  });

  it("accepts one report per IP per minute and still accepts another IP", async () => {
    expect((await route.POST(report(valid, { ip: "203.0.113.7" }))).status).toBe(201);
    expect((await route.POST(report(valid, { ip: "203.0.113.7" }))).status).toBe(429);
    expect((await route.POST(report(valid, { ip: "198.51.100.9" }))).status).toBe(201);
    expect(await storedReports()).toHaveLength(2);
  });

  it("accepts the same IP again once the minute has passed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      expect((await route.POST(report(valid, { ip: "203.0.113.9" }))).status).toBe(201);
      vi.advanceTimersByTime(59_000);
      expect((await route.POST(report(valid, { ip: "203.0.113.9" }))).status).toBe(429);
      vi.advanceTimersByTime(2_000);
      expect((await route.POST(report(valid, { ip: "203.0.113.9" }))).status).toBe(201);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a foreign Origin with 403 and stores nothing", async () => {
    const res = await route.POST(report(valid, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(await storedReports()).toHaveLength(0);
  });

  it("rejects a request with no Origin header with 403 and stores nothing", async () => {
    const res = await route.POST(report(valid, { origin: null }));
    expect(res.status).toBe(403);
    expect(await storedReports()).toHaveLength(0);
  });

  it("answers 404 for a Slug no Profile has and stores nothing", async () => {
    const res = await route.POST(report({ ...valid, profile: "nobody-here" }));
    expect(res.status).toBe(404);
    expect(await storedReports()).toHaveLength(0);
  });

  it("gives draft, suspended and unpublished Slugs the same 404 as an unknown Slug", async () => {
    const slugs = ["nobody-here", "drafty", "banned", "unpub"];
    const responses = await Promise.all(slugs.map((profile, i) => route.POST(report({ ...valid, profile }, { ip: `192.0.2.${i}` }))));
    expect(responses.map((res) => res.status)).toEqual([404, 404, 404, 404]);
    const bodies = await Promise.all(responses.map((res) => res.text()));
    expect(new Set(bodies).size).toBe(1);
    expect(await storedReports()).toHaveLength(0);
  });

  it("treats the demo Slug as unknown outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const res = await route.POST(report({ ...valid, profile: "demo" }));
      expect(res.status).toBe(404);
      expect(await storedReports()).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("accepts the demo Slug in local development without attaching a Profile", async () => {
    vi.stubEnv("NODE_ENV", "development");
    try {
      const res = await route.POST(report({ ...valid, profile: "demo" }));
      expect(res.status).toBe(201);
      expect(await storedReports()).toMatchObject([{ profileId: null }]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not use up the IP's report when the report is rejected", async () => {
    expect((await route.POST(report({ ...valid, details: "abc" }, { ip: "203.0.113.8" }))).status).toBe(400);
    expect((await route.POST(report(valid, { ip: "203.0.113.8" }))).status).toBe(201);
  });
});
