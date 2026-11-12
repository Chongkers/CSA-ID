import { eq } from "drizzle-orm";
import { publishedProfiles, sessions, users } from "@/lib/db/schema";
import { readDraft } from "@/lib/profile-data";
import type { Db } from "@/lib/auth/session";
import { unpublishStatements } from "@/lib/public/published-profile";

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
 * All D1 writes run in one batch, which D1 applies as a single transaction, so a
 * failure leaves the account exactly as it was and the User can retry. Deleting
 * the user row cascades to the Profile, Draft Social Links and Sessions, and
 * `reserved_slugs` keeps the Slug with its profile_id cleared.
 *
 * KV cannot join that transaction, so images go only after the account is gone.
 * If that fails the account is still deleted; the leftover keys sit under
 * unguessable `img/<profileId>/` paths and are logged for cleanup.
 */
export async function deleteAccount(db: Db, kv: KVNamespace, userId: string) {
  const draft = await readDraft(db, userId);
  if (!draft) return null;
  const { profile } = draft;
  const [published] = await db.select({ avatarKey: publishedProfiles.avatarKey, backgroundKey: publishedProfiles.backgroundKey }).from(publishedProfiles).where(eq(publishedProfiles.profileId, profile.id)).limit(1);
  await db.batch([
    ...unpublishStatements(db, profile.id),
    db.delete(sessions).where(eq(sessions.userId, userId)),
    db.delete(users).where(eq(users.id, userId)),
  ]);
  try {
    await deleteImages(kv, profile.id, [profile.avatarKey, profile.backgroundKey, published?.avatarKey ?? null, published?.backgroundKey ?? null]);
  } catch (error) {
    console.error(`account deleted but images under img/${profile.id}/ were not`, error);
  }
  return { slug: profile.slug };
}
