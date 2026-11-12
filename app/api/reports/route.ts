import { NextResponse } from "next/server";
import { z } from "zod";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { abuseReports } from "@/lib/db/schema";
import { loadPublishedProfile } from "@/lib/public/published-profile";

const reportInput = z.object({ profile: z.string().min(1).max(48), reason: z.enum(["impersonation", "malicious-link", "prohibited-content"]), details: z.string().trim().min(5).max(1000) });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = reportInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add at least five characters of detail" }, { status: 400 });
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const rateKey = `report-rate/${ip}`;
  const env = getBindings();
  if (await env.KV.get(rateKey)) return NextResponse.json({ error: "Please wait before sending another report" }, { status: 429 });
  const published = await loadPublishedProfile(getDb(), parsed.data.profile);
  const localDemo = process.env.NODE_ENV === "development" && parsed.data.profile === "demo";
  if (!published && !localDemo) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  await getDb().insert(abuseReports).values({ id: crypto.randomUUID(), profileId: published?.profileId || null, reason: parsed.data.reason, details: parsed.data.details, status: "open", createdAt: Math.floor(Date.now() / 1000) });
  await env.KV.put(rateKey, "1", { expirationTtl: 60 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
