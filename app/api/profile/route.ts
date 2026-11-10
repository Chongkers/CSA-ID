import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { readDraft, saveDraft } from "@/lib/profile-data";
import { isSafeProfileUrl, profileInput } from "@/lib/profile-validation";
import { guardMutation } from "@/lib/http/mutation-guard";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const draft = await readDraft(getDb(), account.user.id);
  if (!draft) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ user: account.user, ...draft });
}

export async function PUT(request: Request) {
  const guard = await guardMutation(request, getCurrentAccount);
  if (!guard.ok) return guard.response;
  const parsed = profileInput.safeParse(guard.body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile" }, { status: 400 });
  if (parsed.data.links.some((link) => !isSafeProfileUrl(link.service, link.url))) return NextResponse.json({ error: "Use the official HTTPS address for each social platform" }, { status: 400 });
  const saved = await saveDraft(getDb(), guard.account.user.id, parsed.data);
  if (!saved) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
