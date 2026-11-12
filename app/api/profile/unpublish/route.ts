import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { guardMutation } from "@/lib/http/mutation-guard";
import { getDb } from "@/lib/db";
import { purgeProfilePage } from "@/lib/edge-cache";
import { unpublishProfile } from "@/lib/public/published-profile";

export async function POST(request: Request) {
  const guard = await guardMutation(request, getCurrentAccount, { body: false });
  if (!guard.ok) return guard.response;
  const { account } = guard;
  await unpublishProfile(getDb(), account.profile.id);
  if (account.profile.slug) await purgeProfilePage(account.profile.slug, request.url);
  return NextResponse.json({ ok: true });
}
