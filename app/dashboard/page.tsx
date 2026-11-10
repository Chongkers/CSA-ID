import { DashboardEditor } from "@/components/dashboard-editor";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getDb } from "@/lib/db";
import { draftSocialLinks } from "@/lib/db/schema";

export default async function DashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  const { user, profile } = account;
  const links = await getDb().select({ service: draftSocialLinks.service, url: draftSocialLinks.url }).from(draftSocialLinks).where(eq(draftSocialLinks.profileId, profile.id)).orderBy(draftSocialLinks.displayOrder);
  return <DashboardEditor initial={{ user: { name: user.name, email: user.email }, profile, links }} />;
}
