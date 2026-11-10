import Link from "next/link";
import { ReportForm } from "@/components/report-form";
import { getBindings } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const { profile } = await searchParams;
  if (!profile) return <main className="simplePage"><section><h1>Report a profile</h1><p>Open the report link on the profile you want to report.</p><Link className="textLink" href="/">Back to home</Link></section></main>;
  const siteKey = (getBindings() as CloudflareEnv & { TURNSTILE_SITE_KEY?: string }).TURNSTILE_SITE_KEY ?? "";
  return <main className="simplePage"><section><ReportForm profile={profile} siteKey={siteKey} /></section></main>;
}
