import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { draftSocialLinks, profiles } from "@/lib/db/schema";
import { isSafeProfileUrl, profileInput } from "@/lib/profile-validation";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET() {
  const account = await getCurrentUser();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const links = await getDb().select().from(draftSocialLinks).where(eq(draftSocialLinks.profileId, account.profile.id)).orderBy(draftSocialLinks.displayOrder);
  return NextResponse.json({ user: account.user, profile: account.profile, links });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const account = await getCurrentUser();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = profileInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile" }, { status: 400 });
  if (parsed.data.links.some((link) => !isSafeProfileUrl(link.service, link.url))) return NextResponse.json({ error: "Use the official HTTPS address for each social platform" }, { status: 400 });
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const update = db.update(profiles).set({ displayName: parsed.data.displayName, role: parsed.data.role, bio: parsed.data.bio, accentColor: parsed.data.accentColor.toUpperCase(), evaluationUrl: parsed.data.evaluationUrl || null, slug: account.profile.slug ?? parsed.data.slug, updatedAt: now }).where(eq(profiles.id, account.profile.id));
  const removeLinks = db.delete(draftSocialLinks).where(eq(draftSocialLinks.profileId, account.profile.id));
  const inserts = parsed.data.links.map((link, index) => db.insert(draftSocialLinks).values({ id: crypto.randomUUID(), profileId: account.profile.id, service: link.service, url: link.url, displayOrder: index }));
  await db.batch([update, removeLinks, ...inserts] as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return NextResponse.json({ ok: true });
}
