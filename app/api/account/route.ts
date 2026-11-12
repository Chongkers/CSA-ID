import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { purgeProfilePage } from "@/lib/edge-cache";
import { guardMutation } from "@/lib/http/mutation-guard";
import { deleteAccount } from "@/lib/account-data";

export async function DELETE(request: Request) {
  const guard = await guardMutation(request, getCurrentAccount, { body: false });
  if (!guard.ok) return guard.response;
  let deleted;
  try {
    deleted = await deleteAccount(getDb(), getBindings().KV, guard.account.user.id);
  } catch {
    return NextResponse.json({ error: "Your account could not be fully deleted. You are still signed in. Try again." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (!deleted) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (deleted.slug) await purgeProfilePage(deleted.slug, request.url).catch(() => {});
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
