import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { purgeProfilePage } from "@/lib/edge-cache";
import { unpublishProfile } from "@/lib/public/published-profile";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await unpublishProfile(getDb(), account.profile.id);
  if (account.profile.slug) await purgeProfilePage(account.profile.slug, request.url);
  return NextResponse.json({ ok: true });
}
