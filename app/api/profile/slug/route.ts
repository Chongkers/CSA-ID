import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { claimSlug } from "@/lib/profile-data";
import { guardMutation } from "@/lib/http/mutation-guard";

export async function POST(request: Request) {
  const guard = await guardMutation(request, getCurrentAccount, { maxBytes: 1024 });
  if (!guard.ok) return guard.response;
  const slug = (guard.body as { slug?: unknown } | null)?.slug;
  const result = await claimSlug(getDb(), guard.account.user.id, slug);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ ok: true, slug: result.slug });
}
