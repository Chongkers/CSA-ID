"use client";

import { useState } from "react";
import Link from "next/link";

export function ReportForm({ profile }: { profile: string }) {
  const [reason, setReason] = useState("impersonation");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus("Sending report…");
    const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, reason, details }) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return setStatus(result.error || "The report could not be sent");
    setStatus("Report sent. Thank you for helping keep profiles safe."); setDetails("");
  }

  return <form onSubmit={submit} className="reportForm"><h1>Report this profile</h1><p>Report impersonation, malicious links, or prohibited content. Reports are reviewed by CSA staff.</p><label className="field">Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="impersonation">Impersonation</option><option value="malicious-link">Malicious link</option><option value="prohibited-content">Prohibited content</option></select></label><label className="field">Details<textarea required maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} rows={5} /></label><button className="button" disabled={busy} type="submit">Send report</button><p className="formStatus" role="status">{status}</p><Link className="textLink" href={`/id/${encodeURIComponent(profile || "demo")}`}>Return to profile</Link></form>;
}
