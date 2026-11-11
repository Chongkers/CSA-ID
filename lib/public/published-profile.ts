import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/lib/db/schema";

type Db = DrizzleD1Database<typeof schema>;

export async function loadPublishedProfile(db: Db, slug: string) {
  const { publishedProfiles, publishedSocialLinks, profiles } = schema;
  const [row] = await db.select({ published: publishedProfiles }).from(publishedProfiles)
    .innerJoin(profiles, and(eq(profiles.id, publishedProfiles.profileId), eq(profiles.status, "published")))
    .where(eq(publishedProfiles.slug, slug)).limit(1);
  if (!row) return null;
  const links = await db.select({ service: publishedSocialLinks.service, url: publishedSocialLinks.url }).from(publishedSocialLinks).where(eq(publishedSocialLinks.profileId, row.published.profileId)).orderBy(publishedSocialLinks.displayOrder);
  return { ...row.published, links };
}

export function unpublishStatements(db: Db, profileId: string, now = Math.floor(Date.now() / 1000)) {
  const { publishedProfiles, publishedSocialLinks, profiles } = schema;
  return [
    db.delete(publishedSocialLinks).where(eq(publishedSocialLinks.profileId, profileId)),
    db.delete(publishedProfiles).where(eq(publishedProfiles.profileId, profileId)),
    db.update(profiles).set({ status: "draft", updatedAt: now }).where(and(eq(profiles.id, profileId), eq(profiles.status, "published"))),
  ] as const;
}

export async function unpublishProfile(db: Db, profileId: string, now = Math.floor(Date.now() / 1000)) {
  await db.batch(unpublishStatements(db, profileId, now));
}
