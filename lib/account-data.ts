import { eq } from "drizzle-orm";
import { publishedProfiles, users } from "@/lib/db/schema";
import { readDraft } from "@/lib/profile-data";
import { deleteUserSessions, type Db } from "@/lib/auth/session";
import { unpublishProfile } from "@/lib/public/published-profile";

export async function exportAccount(db: Db, userId: string, now = new Date()) {
  const draft = await readDraft(db, userId);
  if (!draft) return null;
  const { profile, links } = draft;
  const [user] = await db.select({ name: users.name, email: users.email, createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1);
  return {
    exportedAt: now.toISOString(),
    account: user,
    profile: { slug: profile.slug, status: profile.status, displayName: profile.displayName, role: profile.role, bio: profile.bio, accentColor: profile.accentColor, evaluationUrl: profile.evaluationUrl, createdAt: profile.createdAt, updatedAt: profile.updatedAt },
    socialLinks: links.map(({ service, url, displayOrder }) => ({ service, url, displayOrder })),
  };
}

async function deleteImages(kv: KVNamespace, profileId: string, known: Array<string | null>) {
  const keys = new Set(known.filter((key): key is string => Boolean(key)));
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: `img/${profileId}/`, cursor });
    for (const { name } of page.keys) keys.add(name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  await Promise.all([...keys].map((key) => kv.delete(key)));
}

/**
 * Order matters for retries. The public page goes first and the images second,
 * while the User still has a Session, so a failed image delete can be retried.
 * The user row goes last; it cascades to the Profile, Draft Social Links and
 * Sessions, and `reserved_slugs` keeps the Slug with its profile_id cleared.
 */
export async function deleteAccount(db: Db, kv: KVNamespace, userId: string) {
  const draft = await readDraft(db, userId);
  if (!draft) return null;
  const { profile } = draft;
  const [published] = await db.select({ avatarKey: publishedProfiles.avatarKey, backgroundKey: publishedProfiles.backgroundKey }).from(publishedProfiles).where(eq(publishedProfiles.profileId, profile.id)).limit(1);
  await unpublishProfile(db, profile.id);
  const purge = { slug: profile.slug };
  await deleteImages(kv, profile.id, [profile.avatarKey, profile.backgroundKey, published?.avatarKey ?? null, published?.backgroundKey ?? null]);
  await deleteUserSessions(db, userId);
  await db.delete(users).where(eq(users.id, userId));
  return purge;
}
