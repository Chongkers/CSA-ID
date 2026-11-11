"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Brand } from "./brand";
import { ProfileCard } from "./profile-card";
import { services, type ProfileService } from "@/lib/profile-validation";

const sections = ["Profile", "Appearance", "Links"] as const;
const labels: Record<ProfileService, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", github: "GitHub", youtube: "YouTube", tiktok: "TikTok", x: "X", website: "Website" };

export type DashboardData = {
  user: { name: string; email: string };
  profile: { displayName: string; role: string; bio: string; slug: string | null; accentColor: string; evaluationUrl: string | null; status: string; avatarKey: string | null; backgroundKey: string | null };
  links: Array<{ service: string; url: string }>;
};

export function DashboardEditor({ initial }: { initial: DashboardData }) {
  const router = useRouter();
  const [section, setSection] = useState<(typeof sections)[number]>("Profile");
  const [name, setName] = useState(initial.profile.displayName);
  const [role, setRole] = useState(initial.profile.role);
  const [bio, setBio] = useState(initial.profile.bio);
  const [slug, setSlug] = useState(initial.profile.slug || "");
  const [claimedSlug, setClaimedSlug] = useState(initial.profile.slug);
  const [slugError, setSlugError] = useState("");
  const [color, setColor] = useState(initial.profile.accentColor);
  const [evaluationUrl, setEvaluationUrl] = useState(initial.profile.evaluationUrl || "");
  const [links, setLinks] = useState(initial.links.map((link) => ({ service: link.service as ProfileService, url: link.url })));
  const [notice, setNotice] = useState("Draft loaded");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(initial.profile.status);
  const [avatarUrl, setAvatarUrl] = useState(initial.profile.avatarKey ? `/media/${initial.profile.avatarKey}` : "");
  const [backgroundUrl, setBackgroundUrl] = useState(initial.profile.backgroundKey ? `/media/${initial.profile.backgroundKey}` : "");
  const avatarInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);

  const userDisplayName = (initial.user.name && initial.user.name.trim().length > 0 && initial.user.name !== initial.user.email)
    ? initial.user.name
    : initial.user.email.split("@")[0];

  const userInitials = (
    userDisplayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("") || initial.user.email.slice(0, 2)
  ).toUpperCase();

  const payload = () => ({ displayName: name, role, bio, accentColor: color, evaluationUrl, links });

  async function save(showNotice = true) {
    setBusy(true); if (showNotice) setNotice("Saving draft…");
    const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload()) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) { setNotice(result.error || "Draft could not be saved"); return false; }
    if (showNotice) setNotice("Draft saved");
    return true;
  }

  async function claim() {
    setBusy(true); setSlugError("");
    const response = await fetch("/api/profile/slug", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug }) });
    const result = await response.json() as { error?: string; slug?: string };
    setBusy(false);
    if (!response.ok || !result.slug) return setSlugError(result.error || "Address could not be claimed");
    setClaimedSlug(result.slug); setSlug(result.slug); setNotice("Permanent address claimed");
  }

  async function publish() {
    if (!(await save(false))) return;
    setBusy(true); setNotice("Publishing profile…");
    const response = await fetch("/api/profile/publish", { method: "POST" });
    const result = await response.json() as { error?: string; slug?: string };
    setBusy(false);
    if (!response.ok) return setNotice(result.error || "Profile could not be published");
    setNotice("Profile published");
    setStatus("published");
    if (result.slug) { setSlug(result.slug); setClaimedSlug(result.slug); }
  }

  async function unpublish() {
    setBusy(true); setNotice("Unpublishing profile…");
    const response = await fetch("/api/profile/unpublish", { method: "POST" });
    setBusy(false);
    if (!response.ok) return setNotice("Profile could not be unpublished");
    setNotice("Profile unpublished");
    setStatus("draft");
  }

  async function upload(kind: "avatar" | "background", input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(true); setNotice(`Uploading ${kind}…`);
    const form = new FormData(); form.set("file", file);
    let response: Response;
    try { response = await fetch(`/api/uploads/${kind}`, { method: "POST", body: form }); } catch { setBusy(false); return setNotice("Upload failed. Check your connection."); }
    const result = await response.json().catch(() => ({})) as { error?: string; url?: string };
    setBusy(false);
    if (!response.ok) return setNotice(result.error || "Upload failed");
    if (result.url) (kind === "avatar" ? setAvatarUrl : setBackgroundUrl)(result.url);
    setNotice(`${kind === "avatar" ? "Photo" : "Background"} uploaded`);
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account? This removes your profile and images and cannot be undone. Your profile address stays reserved.")) return;
    setBusy(true); setNotice("Deleting account…");
    const response = await fetch("/api/account", { method: "DELETE" });
    if (!response.ok) { setBusy(false); const result = await response.json().catch(() => ({})) as { error?: string }; return setNotice(result.error || "Account could not be deleted"); }
    router.push("/");
  }

  function addLink() {
    const service = services.find((candidate) => !links.some((link) => link.service === candidate));
    if (service) setLinks([...links, { service, url: "" }]);
  }

  return (
    <main className="dashboard">
      <header className="dashboardHeader">
        <Brand />
        <div className="dashboardActions"><span className="saveState" role="status"><i />{notice}</span>{claimedSlug && <Link className="buttonSecondary buttonSmall" href={`/id/${slug}`}>View profile</Link>}<button className="buttonSecondary buttonSmall" disabled={busy} type="button" onClick={() => save()}>Save draft</button><button className="button buttonSmall" disabled={busy} type="button" onClick={publish}>{status === "published" ? "Publish changes" : "Publish profile"}</button>{status === "published" && <button className="buttonSecondary buttonSmall" disabled={busy} type="button" onClick={unpublish}>Unpublish</button>}</div>
        <details className="dashboardAccountMenu">
          <summary aria-label="Open account menu" title={userDisplayName}>
            <span aria-hidden="true">{userInitials}</span>
          </summary>
          <div className="dashboardAccountPopover">
            <div className="accountCard">
              <span className="accountAvatar" aria-hidden="true">{userInitials}</span>
              <div className="accountInfo">
                <strong className="accountName" title={userDisplayName}>{userDisplayName}</strong>
                <small className="accountEmail" title={initial.user.email}>{initial.user.email}</small>
              </div>
            </div>
            <a className="logoutButton" href="/api/profile/export" download>Export my data</a>
            <button className="logoutButton logoutDanger" disabled={busy} type="button" onClick={deleteAccount}>Delete account</button>
            <form action="/logout" method="post" className="logoutForm"><button className="logoutButton" type="submit">Sign out</button></form>
          </div>
        </details>
      </header>
      <div className="dashboardBody">
        <aside className="dashboardNav">
          <div>
            <p className="navLabel">Workspace</p>
            {sections.map((item) => (
              <button
                key={item}
                type="button"
                className={section === item ? "selected" : ""}
                onClick={() => setSection(item)}
              >
                <span>{item.slice(0, 1)}</span>
                {item}
              </button>
            ))}
          </div>

          <div className="dashboardNavFooter">
            <div className="accountCard">
              <span className="accountAvatar" aria-hidden="true">{userInitials}</span>
              <div className="accountInfo">
                <strong className="accountName" title={userDisplayName}>{userDisplayName}</strong>
                <small className="accountEmail" title={initial.user.email}>{initial.user.email}</small>
              </div>
            </div>
            <a className="logoutButton" href="/api/profile/export" download>Export my data</a>
            <button className="logoutButton logoutDanger" disabled={busy} type="button" onClick={deleteAccount}>Delete account</button>
            <form action="/logout" method="post" className="logoutForm">
              <button className="logoutButton" type="submit" aria-label="Sign out">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </aside>
        <section className="editorPane">
          <div className="editorHeading"><div><h1>{section}</h1><p className="headingContext">Private draft. Publishing or unpublishing can take up to 60 seconds to reach every location.</p></div><span className="statusBadge">{status === "published" ? "Published" : status === "suspended" ? "Suspended" : "Not published"}</span></div>

          {section === "Profile" && <div className="formStack">
            <div className="uploadRow"><div className="avatar avatarSmall" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover" } : undefined}>{avatarUrl ? "" : name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><input ref={avatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("avatar", event.target)} /><button className="buttonSecondary buttonSmall" type="button" onClick={() => avatarInput.current?.click()}>Choose photo</button><p>JPEG, PNG, or WebP. Up to 2 MB.</p></div></div>
            <label className="field">Display name<input value={name} maxLength={128} onChange={(event) => setName(event.target.value)} /></label>
            <label className="field">Role or title<input value={role} maxLength={128} onChange={(event) => setRole(event.target.value)} /></label>
            <label className="field">Short bio<textarea value={bio} maxLength={500} rows={4} onChange={(event) => setBio(event.target.value)} /><span>{bio.length}/500</span></label>
            <label className="field">Evaluation form URL<input type="url" value={evaluationUrl} placeholder="https://forms.google.com/…" onChange={(event) => setEvaluationUrl(event.target.value)} /></label>
            <label className="field">Permanent profile address<div className="slugField"><span>/id/</span><input value={slug} disabled={Boolean(claimedSlug)} maxLength={64} aria-label="Profile slug" onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />{!claimedSlug && <button className="buttonSecondary buttonSmall" disabled={busy || slug.length < 3} type="button" onClick={claim}>Claim address</button>}</div><small role={slugError ? "alert" : undefined}>{slugError || (claimedSlug ? "This permanent address is locked." : "Choose carefully. Once claimed, this address can never change.")}</small></label>
          </div>}

          {section === "Appearance" && <div className="formStack">
            <div className="backgroundUpload"><div><strong>Background image</strong><p>JPEG, PNG, or WebP. Up to 4 MB.</p></div><input ref={backgroundInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("background", event.target)} /><button className="buttonSecondary buttonSmall" type="button" onClick={() => backgroundInput.current?.click()}>Choose background</button></div>
            <label className="field">Profile color<div className="colorField"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><input value={color.toUpperCase()} onChange={(event) => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && setColor(event.target.value)} /></div></label>
          </div>}

          {section === "Links" && <div className="formStack linksForm">
            <p className="sectionIntro">Add up to eight HTTPS links. Each platform can appear once.</p>
            {links.map((link, index) => <div className="linkRow" key={`${link.service}-${index}`}><span className="dragHandle">{index + 1}</span><div><select value={link.service} aria-label={`Link ${index + 1} platform`} onChange={(event) => setLinks(links.map((item, itemIndex) => itemIndex === index ? { ...item, service: event.target.value as ProfileService } : item))}>{services.map((service) => <option key={service} value={service} disabled={links.some((item, itemIndex) => itemIndex !== index && item.service === service)}>{labels[service]}</option>)}</select><input type="url" value={link.url} placeholder={`https://${link.service}.com/…`} aria-label={`${labels[link.service]} URL`} onChange={(event) => setLinks(links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} /></div><button type="button" aria-label={`Remove ${labels[link.service]}`} onClick={() => setLinks(links.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}
            <button className="buttonSecondary addLink" disabled={links.length >= services.length} type="button" onClick={addLink}>Add social link</button>
          </div>}
        </section>
        <aside className="previewPane">
          <div className="previewHeader"><div><p>Live preview</p><span>Mobile</span></div>{slug && <Link className="previewOpen" href={`/id/${slug}`} aria-label="Open published profile">Open</Link>}</div>
          <div className="phoneFrame"><div className="phoneTop"><span /></div><ProfileCard compact name={name || "Your name"} role={role} bio={bio} primary={color} avatarUrl={avatarUrl} coverUrl={backgroundUrl} /></div>
        </aside>
      </div>
    </main>
  );
}
