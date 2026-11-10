import { DashboardEditor } from "@/components/dashboard-editor";
import { requireUser } from "@/lib/auth/current-user";

export default async function DashboardPage() {
  const user = await requireUser();
  return <DashboardEditor email={user.email} />;
}
