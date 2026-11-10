import { ReportForm } from "@/components/report-form";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const { profile = "demo" } = await searchParams;
  return <main className="simplePage"><section><ReportForm profile={profile} /></section></main>;
}
