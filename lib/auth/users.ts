import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import type { GoogleIdentity } from "./google";
import type { Db } from "./session";

export async function findOrCreateUser(db: Db, identity: GoogleIdentity) {
  await db
    .insert(users)
    .values({ id: crypto.randomUUID(), googleSub: identity.sub, email: identity.email })
    .onConflictDoUpdate({ target: users.googleSub, set: { email: identity.email } });
  const [user] = await db.select().from(users).where(eq(users.googleSub, identity.sub));
  return user;
}
