import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { draftSocialLinks, profiles, reservedSlugs } from "@/lib/db/schema";
import type { Db } from "@/lib/auth/session";
import { checkSlug, type ProfileInput } from "@/lib/profile-validation";

/** Owner-scoped access: every function takes the signed-in user's id and filters by it. */

export async function readDraft(db: Db, userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) return null;
  const links = await db.select().from(draftSocialLinks).where(eq(draftSocialLinks.profileId, profile.id)).orderBy(draftSocialLinks.displayOrder);
  return { profile, links };
}

export async function saveDraft(db: Db, userId: string, input: ProfileInput) {
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) return false;
  const update = db.update(profiles).set({ displayName: input.displayName, role: input.role, bio: input.bio, accentColor: input.accentColor.toUpperCase(), evaluationUrl: input.evaluationUrl || null, updatedAt: Math.floor(Date.now() / 1000) }).where(and(eq(profiles.id, profile.id), eq(profiles.userId, userId)));
  const removeLinks = db.delete(draftSocialLinks).where(eq(draftSocialLinks.profileId, profile.id));
  const inserts = input.links.map((link, index) => db.insert(draftSocialLinks).values({ id: crypto.randomUUID(), profileId: profile.id, service: link.service, url: link.url, displayOrder: index }));
  await db.batch([update, removeLinks, ...inserts] as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return true;
}

export type ClaimResult =
  | { ok: true; slug: string }
  | { ok: false; status: 400 | 404 | 409; message: string };

export async function claimSlug(db: Db, userId: string, rawSlug: unknown): Promise<ClaimResult> {
  const checked = checkSlug(rawSlug);
  if (!checked.ok) return { ok: false, status: 400, message: checked.message };
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) return { ok: false, status: 404, message: "Profile not found" };
  if (profile.slug) {
    return profile.slug === checked.slug
      ? { ok: true, slug: profile.slug }
      : { ok: false, status: 409, message: "Your permanent address is already chosen and cannot be changed" };
  }
  const now = Math.floor(Date.now() / 1000);
  try {
    await db.batch([
      db.insert(reservedSlugs).values({ slug: checked.slug, profileId: profile.id, createdAt: now }),
      db.update(profiles).set({ slug: checked.slug, updatedAt: now }).where(and(eq(profiles.id, profile.id), eq(profiles.userId, userId))),
    ]);
  } catch {
    const [after] = await db.select({ slug: profiles.slug }).from(profiles).where(eq(profiles.id, profile.id)).limit(1);
    if (after?.slug === checked.slug) return { ok: true, slug: checked.slug };
    return { ok: false, status: 409, message: "That address is already taken. Please choose another" };
  }
  return { ok: true, slug: checked.slug };
}
