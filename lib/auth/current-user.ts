import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { SESSION_COOKIE, validateSession } from "./session";

export async function getCurrentAccount() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const db = getDb();
  const user = await validateSession(db, token);
  if (!user) return null;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return profile ? { user, profile } : null;
}
