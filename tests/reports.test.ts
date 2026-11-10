import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { abuseReports, profiles, users } from "@/lib/db/schema";
import { MAX_BODY_BYTES, MAX_PER_PROFILE_PER_WINDOW, rateKeyFor, readCappedText, submitReport } from "@/lib/reports";
import * as route from "@/app/api/reports/route";
import { createTestDb } from "./helpers";

vi.mock("server-only", () => ({}));

type TestDb = Awaited<ReturnType<typeof createTestDb>>;
let t: TestDb;
const NOW = 1_800_000_000;
const PASS = async () => Response.json({ success: true });
const FAIL = async () => Response.json({ success: false, "error-codes": ["invalid-input-response"] });

function kv() {
  const map = new Map<string, string>();
  return { map, get: async (k: string) => map.get(k) ?? null, put: async (k: string, v: string) => void map.set(k, v) } as unknown as KVNamespace & { map: Map<string, string> };
}
const body = (over: object = {}) => ({ profile: "ada", reason: "impersonation", details: "This is not the real Ada", turnstileToken: "tok", ...over });
const deps = (over: object = {}) => ({ db: t.db, kv: kv(), secret: "secret", fetchImpl: PASS as unknown as typeof fetch, now: NOW, ...over });
const count = async () => (await t.db.select().from(abuseReports)).length;

beforeAll(async () => {
  t = await createTestDb();
  await t.db.insert(users).values({ id: "u1", googleSub: "s", email: "a@example.test" } as never);
  await t.db.insert(profiles).values({ id: "p1", userId: "u1", slug: "ada", displayName: "Ada" } as never);
});
afterAll(() => t.dispose());

describe("submitReport", () => {
  it("stores a report for a real profile and starts the rate window", async () => {
    const d = deps();
    const res = await submitReport(body(), "1.2.3.4", d);
    expect(res.status).toBe(201);
    const rows = await t.db.select().from(abuseReports);
    expect(rows.at(-1)).toMatchObject({ profileId: "p1", reason: "impersonation", status: "open" });
    expect(d.kv.map.has("report-rate/1.2.3.4")).toBe(true);
  });

  it("verifies the token against Cloudflare's siteverify endpoint with the secret", async () => {
    const calls: { url: string; form: FormData }[] = [];
    const spy = (async (url: string, init: RequestInit) => { calls.push({ url, form: init.body as FormData }); return Response.json({ success: true }); }) as unknown as typeof fetch;
    await submitReport(body(), "3.3.3.3", deps({ fetchImpl: spy }));
    expect(calls[0].url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(calls[0].form.get("secret")).toBe("secret");
    expect(calls[0].form.get("response")).toBe("tok");
  });

  it("rejects a second report from the same IP and stores nothing", async () => {
    const d = deps();
    await submitReport(body(), "5.5.5.5", d);
    const before = await count();
    const res = await submitReport(body(), "5.5.5.5", d);
    expect(res.status).toBe(429);
    expect(await count()).toBe(before);
  });

  it("treats IPv6 addresses in one /64 as the same client", () => {
    expect(rateKeyFor("2001:db8:1:2:aaaa::1")).toBe(rateKeyFor("2001:0db8:1:2:bbbb::9"));
    expect(rateKeyFor(null)).toBe("report-rate/unknown");
  });

  it("stores nothing when the Turnstile check fails", async () => {
    const before = await count();
    const d = deps({ fetchImpl: FAIL });
    const res = await submitReport(body(), "6.6.6.6", d);
    expect(res.status).toBe(400);
    expect(await count()).toBe(before);
    expect(d.kv.map.size).toBe(0);
  });

  it("stores nothing and fails closed when siteverify is down or the secret is missing", async () => {
    const before = await count();
    const down = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
    expect((await submitReport(body(), "7.7.7.7", deps({ fetchImpl: down }))).status).toBe(503);
    expect((await submitReport(body(), "7.7.7.7", deps({ secret: undefined }))).status).toBe(503);
    expect(await count()).toBe(before);
  });

  it("requires a Turnstile token", async () => {
    const rest: Record<string, unknown> = body();
    delete rest.turnstileToken;
    expect((await submitReport(rest, "8.8.8.8", deps())).status).toBe(400);
  });

  it("does not accept the demo profile or any unknown profile", async () => {
    const before = await count();
    expect((await submitReport(body({ profile: "demo" }), "9.9.9.9", deps())).status).toBe(404);
    expect(await count()).toBe(before);
  });

  it("caps reports per profile even when the KV rate check is bypassed", async () => {
    const start = (await t.db.select().from(abuseReports)).filter((r) => r.profileId === "p1" && r.createdAt > NOW - 3600).length;
    let rejected = 0;
    for (let i = 0; i < MAX_PER_PROFILE_PER_WINDOW + 2; i++) {
      const res = await submitReport(body(), `10.0.0.${i}`, deps());
      if (res.status === 429) rejected++;
    }
    expect(rejected).toBe(start + MAX_PER_PROFILE_PER_WINDOW + 2 - MAX_PER_PROFILE_PER_WINDOW);
    const total = (await t.db.select().from(abuseReports)).filter((r) => r.profileId === "p1").length;
    expect(total).toBe(MAX_PER_PROFILE_PER_WINDOW);
  });
});

describe("readCappedText", () => {
  const post = (text: string, headers: Record<string, string> = {}) => new Request("http://x/api/reports", { method: "POST", body: text, headers });
  it("rejects an oversized declared length before reading", async () => {
    expect(await readCappedText(post("x", { "content-length": String(MAX_BODY_BYTES + 1) }))).toBeNull();
  });
  it("rejects an oversized streamed body", async () => {
    expect(await readCappedText(post("x".repeat(MAX_BODY_BYTES + 1)))).toBeNull();
  });
  it("returns a small body", async () => {
    expect(await readCappedText(post('{"a":1}'))).toBe('{"a":1}');
  });
});

describe("reports endpoint surface", () => {
  it("exposes only POST, so reports cannot be read or edited over HTTP", () => {
    const methods = Object.keys(route).filter((k) => /^(GET|HEAD|PUT|PATCH|DELETE|OPTIONS|POST)$/.test(k));
    expect(methods).toEqual(["POST"]);
  });
});
