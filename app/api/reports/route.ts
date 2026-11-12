import { NextResponse } from "next/server";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { guardMutation } from "@/lib/http/mutation-guard";
import { MAX_BODY_BYTES, submitReport } from "@/lib/reports";

export async function POST(request: Request) {
  // Reports are anonymous, so the "account" is a constant; origin and size checks still apply.
  const guarded = await guardMutation(request, async () => true, { maxBytes: MAX_BODY_BYTES });
  if (!guarded.ok) return guarded.response;
  const env = getBindings() as CloudflareEnv & { TURNSTILE_SECRET_KEY?: string };
  const result = await submitReport(guarded.body, request.headers.get("cf-connecting-ip"), { db: getDb(), kv: env.KV, secret: env.TURNSTILE_SECRET_KEY });
  return NextResponse.json(result.body, { status: result.status });
}
