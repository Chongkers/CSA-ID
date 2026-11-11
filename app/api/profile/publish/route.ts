import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { purgeProfilePage } from "@/lib/edge-cache";
import { draftSocialLinks, profiles, publishedProfiles, publishedSocialLinks, reservedSlugs } from "@/lib/db/schema";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const account = await getCurrentAccount();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = account.profile;
  if (!profile.slug || !profile.displayName || !profile.role || !profile.evaluationUrl) return NextResponse.json({ error: "Add a permanent address, name, role, and evaluation form before publishing" }, { status: 400 });
  if (profile.status === "suspended") return NextResponse.json({ error: "This profile is suspended" }, { status: 403 });
  const db = getDb();
  const [reservation] = await db.select().from(reservedSlugs).where(eq(reservedSlugs.slug, profile.slug)).limit(1);
  if (reservation && reservation.profileId !== profile.id) return NextResponse.json({ error: "That permanent profile address is already taken" }, { status: 409 });
  const links = await db.select().from(draftSocialLinks).where(eq(draftSocialLinks.profileId, profile.id)).orderBy(draftSocialLinks.displayOrder);
  const now = Math.floor(Date.now() / 1000);
  const queries: BatchItem<"sqlite">[] = [
    db.insert(reservedSlugs).values({ slug: profile.slug, profileId: profile.id, createdAt: now }).onConflictDoNothing(),
    db.delete(publishedSocialLinks).where(eq(publishedSocialLinks.profileId, profile.id)),
    db.delete(publishedProfiles).where(eq(publishedProfiles.profileId, profile.id)),
    db.insert(publishedProfiles).values({ profileId: profile.id, slug: profile.slug, displayName: profile.displayName, role: profile.role, bio: profile.bio, accentColor: profile.accentColor, avatarKey: profile.avatarKey, backgroundKey: profile.backgroundKey, evaluationUrl: profile.evaluationUrl, publishedAt: now }),
    ...links.map((link) => db.insert(publishedSocialLinks).values({ id: crypto.randomUUID(), profileId: profile.id, service: link.service, url: link.url, displayOrder: link.displayOrder })),
    db.update(profiles).set({ status: "published", updatedAt: now }).where(eq(profiles.id, profile.id)),
  ];
  try { await db.batch(queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]); }
  catch { return NextResponse.json({ error: "That permanent profile address is already taken" }, { status: 409 }); }
  await purgeProfilePage(profile.slug, request.url);
  return NextResponse.json({ ok: true, slug: profile.slug });
}
