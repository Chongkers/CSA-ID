import Link from "next/link";

export default function ReportPage() {
  return <main className="simplePage"><section><h1>Report this profile</h1><p>Use this form for impersonation, malicious links, or prohibited content.</p><label className="field">Reason<select defaultValue="impersonation"><option value="impersonation">Impersonation</option><option value="malicious-link">Malicious link</option><option value="prohibited-content">Prohibited content</option></select></label><label className="field">Details<textarea rows={5} /></label><button className="button" type="button">Send report</button><Link className="textLink" href="/id/demo">Return to profile</Link></section></main>;
}
