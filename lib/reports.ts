import { sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import * as schema from "@/lib/db/schema";

export const MAX_BODY_BYTES = 4096;
export const IP_WINDOW_SECONDS = 60;
export const WINDOW_SECONDS = 3600;
export const MAX_PER_PROFILE_PER_WINDOW = 10;
export const MAX_TOTAL_PER_WINDOW = 100;

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const reportInput = z.object({
  profile: z.string().min(1).max(48),
  reason: z.enum(["impersonation", "malicious-link", "prohibited-content"]),
  details: z.string().trim().min(5).max(1000),
  turnstileToken: z.string().min(1).max(2048),
});

export type ReportKv = Pick<KVNamespace, "get" | "put">;
export type ReportDb = DrizzleD1Database<typeof schema>;

export type SubmitDeps = {
  db: ReportDb;
  kv: ReportKv;
  secret: string | undefined;
  fetchImpl?: typeof fetch;
  now?: number;
};

export type SubmitResult = { status: number; body: { ok: true } | { error: string } };

const fail = (status: number, error: string): SubmitResult => ({ status, body: { error } });

export async function readCappedText(request: Request, max = MAX_BODY_BYTES): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function expandIpv6(ip: string): string[] {
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const fill = ip.includes("::") ? Array(Math.max(0, 8 - h.length - t.length)).fill("0") : [];
  return [...h, ...fill, ...t].map((group) => group.toLowerCase().replace(/^0+(?=.)/, ""));
}

export function rateKeyFor(ip: string | null): string {
  if (!ip) return "report-rate/unknown";
  if (ip.includes(":") && !ip.includes(".")) return `report-rate/${expandIpv6(ip).slice(0, 4).join(":")}`;
  return `report-rate/${ip}`;
}

type SiteVerify = { success?: boolean };

async function verifyTurnstile(token: string, secret: string, ip: string | null, fetchImpl: typeof fetch) {
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  try {
    const response = await fetchImpl(SITEVERIFY_URL, { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return "unavailable" as const;
    return (await response.json() as SiteVerify).success === true ? ("ok" as const) : ("rejected" as const);
  } catch {
    return "unavailable" as const;
  }
}

export async function submitReport(raw: unknown, ip: string | null, deps: SubmitDeps): Promise<SubmitResult> {
  const parsed = reportInput.safeParse(raw);
  if (!parsed.success) return fail(400, "Add at least five characters of detail");
  const { profile: slug, reason, details, turnstileToken } = parsed.data;

  const rateKey = rateKeyFor(ip);
  if (await deps.kv.get(rateKey)) return fail(429, "Please wait before sending another report");

  if (!deps.secret) return fail(503, "Reporting is unavailable right now");
  const challenge = await verifyTurnstile(turnstileToken, deps.secret, ip, deps.fetchImpl ?? fetch);
  if (challenge === "unavailable") return fail(503, "Reporting is unavailable right now");
  if (challenge === "rejected") return fail(400, "Challenge failed. Reload the page and try again");

  const profile = await deps.db.select({ id: schema.profiles.id }).from(schema.profiles).where(sql`${schema.profiles.slug} = ${slug}`).limit(1);
  if (!profile[0]) return fail(404, "Profile not found");

  // One statement: the caps are counted and the row inserted atomically in D1, so
  // concurrent requests that slip past the eventually consistent KV check still hit these.
  const now = deps.now ?? Math.floor(Date.now() / 1000);
  const since = now - WINDOW_SECONDS;
  const result = await deps.db.run(sql`
    INSERT INTO abuse_reports (id, profile_id, reason, details, status, created_at)
    SELECT ${crypto.randomUUID()}, ${profile[0].id}, ${reason}, ${details}, 'open', ${now}
    WHERE (SELECT count(*) FROM abuse_reports WHERE profile_id = ${profile[0].id} AND created_at > ${since}) < ${MAX_PER_PROFILE_PER_WINDOW}
      AND (SELECT count(*) FROM abuse_reports WHERE created_at > ${since}) < ${MAX_TOTAL_PER_WINDOW}`);
  if (!result.meta.changes) return fail(429, "Too many reports right now. Please try again later");

  await deps.kv.put(rateKey, "1", { expirationTtl: IP_WINDOW_SECONDS });
  return { status: 201, body: { ok: true } };
}
