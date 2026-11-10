"use client";

import Link from "next/link";
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
  const [section, setSection] = useState<(typeof sections)[number]>("Profile");
  const [name, setName] = useState(initial.profile.displayName);
  const [role, setRole] = useState(initial.profile.role);
  const [bio, setBio] = useState(initial.profile.bio);
  const [slug, setSlug] = useState(initial.profile.slug || "");
  const [color, setColor] = useState(initial.profile.accentColor);
  const [evaluationUrl, setEvaluationUrl] = useState(initial.profile.evaluationUrl || "");
  const [links, setLinks] = useState(initial.links.map((link) => ({ service: link.service as ProfileService, url: link.url })));
  const [notice, setNotice] = useState("Draft loaded");
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initial.profile.avatarKey ? `/media/${initial.profile.avatarKey}` : "");
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

  const payload = () => ({ displayName: name, role, bio, slug: slug || null, accentColor: color, evaluationUrl, links });

  async function save(showNotice = true) {
    setBusy(true); if (showNotice) setNotice("Saving draft…");
    const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload()) });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) { setNotice(result.error || "Draft could not be saved"); return false; }
    if (showNotice) setNotice("Draft saved");
    return true;
  }

  async function publish() {
    if (!(await save(false))) return;
    setBusy(true); setNotice("Publishing profile…");
    const response = await fetch("/api/profile/publish", { method: "POST" });
    const result = await response.json() as { error?: string; slug?: string };
    setBusy(false);
    if (!response.ok) return setNotice(result.error || "Profile could not be published");
    setNotice("Profile published");
    if (result.slug) setSlug(result.slug);
  }

  async function upload(kind: "avatar" | "background", file?: File) {
    if (!file) return;
    setBusy(true); setNotice(`Uploading ${kind}…`);
    const form = new FormData(); form.set("file", file);
    const response = await fetch(`/api/uploads/${kind}`, { method: "POST", body: form });
    const result = await response.json() as { error?: string; url?: string };
    setBusy(false);
    if (!response.ok) return setNotice(result.error || "Upload failed");
    if (kind === "avatar" && result.url) setAvatarUrl(result.url);
    setNotice(`${kind === "avatar" ? "Photo" : "Background"} uploaded`);
  }

  function addLink() {
    const service = services.find((candidate) => !links.some((link) => link.service === candidate));
    if (service) setLinks([...links, { service, url: "" }]);
  }

  return (
    <main className="dashboard">
      <header className="dashboardHeader">
        <Brand />
        <div className="dashboardActions"><span className="saveState" role="status"><i />{notice}</span>{slug && <Link className="buttonSecondary buttonSmall" href={`/id/${slug}`}>View profile</Link>}<button className="buttonSecondary buttonSmall" disabled={busy} type="button" onClick={() => save()}>Save draft</button><button className="button buttonSmall" disabled={busy} type="button" onClick={publish}>Publish profile</button></div>
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
          <div className="editorHeading"><div><h1>{section}</h1><p className="headingContext">Private draft</p></div><span className="statusBadge">{initial.profile.status === "published" ? "Published" : "Not published"}</span></div>

          {section === "Profile" && <div className="formStack">
            <div className="uploadRow"><div className="avatar avatarSmall" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover" } : undefined}>{avatarUrl ? "" : name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><input ref={avatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("avatar", event.target.files?.[0])} /><button className="buttonSecondary buttonSmall" type="button" onClick={() => avatarInput.current?.click()}>Choose photo</button><p>JPEG, PNG, or WebP. Up to 2 MB.</p></div></div>
            <label className="field">Display name<input value={name} maxLength={128} onChange={(event) => setName(event.target.value)} /></label>
            <label className="field">Role or title<input value={role} maxLength={128} onChange={(event) => setRole(event.target.value)} /></label>
            <label className="field">Short bio<textarea value={bio} maxLength={500} rows={4} onChange={(event) => setBio(event.target.value)} /><span>{bio.length}/500</span></label>
            <label className="field">Evaluation form URL<input type="url" value={evaluationUrl} placeholder="https://forms.google.com/…" onChange={(event) => setEvaluationUrl(event.target.value)} /></label>
            <label className="field">Permanent profile address<div className="slugField"><span>/id/</span><input value={slug} disabled={Boolean(initial.profile.slug)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-label="Profile slug" onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></div><small>{initial.profile.slug ? "This permanent address is locked." : "Choose carefully. This address locks when you publish."}</small></label>
          </div>}

          {section === "Appearance" && <div className="formStack">
            <div className="backgroundUpload"><div><strong>Background image</strong><p>JPEG, PNG, or WebP. Up to 4 MB.</p></div><input ref={backgroundInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("background", event.target.files?.[0])} /><button className="buttonSecondary buttonSmall" type="button" onClick={() => backgroundInput.current?.click()}>Choose background</button></div>
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
          <div className="phoneFrame"><div className="phoneTop"><span /></div><ProfileCard compact name={name || "Your name"} role={role} bio={bio} primary={color} /></div>
        </aside>
      </div>
    </main>
  );
}
