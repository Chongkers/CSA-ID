import { DashboardEditor } from "@/components/dashboard-editor";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { profiles, draftSocialLinks } from "@/lib/db/schema";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (!profile) redirect("/login");
  const links = await db.select({ service: draftSocialLinks.service, url: draftSocialLinks.url }).from(draftSocialLinks).where(eq(draftSocialLinks.profileId, profile.id)).orderBy(draftSocialLinks.displayOrder);
  return <DashboardEditor initial={{ user: { name: user.name, email: user.email }, profile, links }} />;
}
