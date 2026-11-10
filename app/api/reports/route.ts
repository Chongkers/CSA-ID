import { NextResponse } from "next/server";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { MAX_BODY_BYTES, readCappedText, submitReport } from "@/lib/reports";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const text = await readCappedText(request);
  if (text === null) return NextResponse.json({ error: `Report is too large (max ${MAX_BODY_BYTES} bytes)` }, { status: 413 });
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch {}
  const env = getBindings() as CloudflareEnv & { TURNSTILE_SECRET_KEY?: string };
  const result = await submitReport(raw, request.headers.get("cf-connecting-ip"), { db: getDb(), kv: env.KV, secret: env.TURNSTILE_SECRET_KEY });
  return NextResponse.json(result.body, { status: result.status });
}
