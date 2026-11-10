import { DashboardEditor } from "@/components/dashboard-editor";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { draftSocialLinks } from "@/lib/db/schema";

export default async function DashboardPage() {
  const account = await getCurrentUser();
  if (!account) redirect("/login");
  const links = await getDb().select({ service: draftSocialLinks.service, url: draftSocialLinks.url }).from(draftSocialLinks).where(eq(draftSocialLinks.profileId, account.profile.id)).orderBy(draftSocialLinks.displayOrder);
  return <DashboardEditor initial={{ user: { name: account.user.name, email: account.user.email }, profile: account.profile, links }} />;
}
