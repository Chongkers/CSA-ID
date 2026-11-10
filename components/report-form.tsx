"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";

type Turnstile = {
  render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  reset: (id?: string) => void;
};

export function ReportForm({ profile, siteKey }: { profile: string; siteKey: string }) {
  const [reason, setReason] = useState("impersonation");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!scriptReady || !turnstile || !box.current || widget.current) return;
    widget.current = turnstile.render(box.current, { sitekey: siteKey, callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => setToken("") });
  }, [scriptReady, siteKey]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus("Sending report…");
    const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, reason, details, turnstileToken: token }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    setToken("");
    (window as unknown as { turnstile?: Turnstile }).turnstile?.reset(widget.current ?? undefined);
    if (!response.ok) return setStatus(result.error || "The report could not be sent");
    setStatus("Report sent. Thank you for helping keep profiles safe."); setDetails("");
  }

  return <form onSubmit={submit} className="reportForm"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} /><h1>Report this profile</h1><p>Report impersonation, malicious links, or prohibited content. Reports are reviewed by CSA staff.</p><label className="field">Reason<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="impersonation">Impersonation</option><option value="malicious-link">Malicious link</option><option value="prohibited-content">Prohibited content</option></select></label><label className="field">Details<textarea required maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} rows={5} /></label><div ref={box} /><button className="button" disabled={busy || !token} type="submit">Send report</button><p className="formStatus" role="status">{status}</p><Link className="textLink" href={`/id/${encodeURIComponent(profile)}`}>Return to profile</Link></form>;
}
