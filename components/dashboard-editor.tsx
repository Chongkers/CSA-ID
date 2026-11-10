"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "./brand";
import { ProfileCard } from "./profile-card";

const sections = ["Profile", "Appearance", "Links"] as const;

export function DashboardEditor() {
  const [section, setSection] = useState<(typeof sections)[number]>("Profile");
  const [name, setName] = useState("Alex Santos");
  const [role, setRole] = useState("Student assistant");
  const [bio, setBio] = useState("Peer adviser for tutoring sessions at the Center for Student Advising.");
  const [color, setColor] = useState("#b5121b");
  const [notice, setNotice] = useState("Draft saved");

  function publish() {
    setNotice("Publishing changes");
    window.setTimeout(() => setNotice("Published just now"), 700);
  }

  return (
    <main className="dashboard">
      <header className="dashboardHeader">
        <Brand />
        <div className="dashboardActions"><span className="saveState"><i />{notice}</span><Link className="buttonSecondary buttonSmall" href="/id/demo">View profile</Link><button className="button buttonSmall" type="button" onClick={publish}>Publish changes</button></div>
      </header>
      <div className="dashboardBody">
        <aside className="dashboardNav">
          <div><p className="navLabel">Workspace</p>{sections.map((item) => <button key={item} type="button" className={section === item ? "selected" : ""} onClick={() => setSection(item)}><span>{item.slice(0, 1)}</span>{item}</button>)}</div>
          <div className="accountCard"><span>AS</span><div><strong>Alex Santos</strong><small>alex@example.test</small></div></div>
        </aside>
        <section className="editorPane">
          <div className="editorHeading"><div><h1>{section}</h1><p className="headingContext">Draft profile</p></div><span className="statusBadge">Not published</span></div>

          {section === "Profile" && <div className="formStack">
            <div className="uploadRow"><div className="avatar avatarSmall">AS</div><div><button className="buttonSecondary buttonSmall" type="button">Choose photo</button><p>JPEG, PNG, or WebP. Up to 2 MB.</p></div></div>
            <label className="field">Display name<input value={name} maxLength={128} onChange={(event) => setName(event.target.value)} /></label>
            <label className="field">Role or title<input value={role} maxLength={128} onChange={(event) => setRole(event.target.value)} /></label>
            <label className="field">Short bio<textarea value={bio} maxLength={500} rows={4} onChange={(event) => setBio(event.target.value)} /><span>{bio.length}/500</span></label>
            <label className="field">Permanent profile address<div className="slugField"><span>profile.example/id/</span><input defaultValue="alex-santos" aria-label="Profile slug" /></div><small>This address cannot change after you publish.</small></label>
          </div>}

          {section === "Appearance" && <div className="formStack">
            <div className="backgroundUpload"><div><strong>Background image</strong><p>JPEG, PNG, or WebP. Up to 4 MB.</p></div><button className="buttonSecondary buttonSmall" type="button">Choose background</button></div>
            <fieldset className="layoutChoices"><legend>Layout</legend><label><input type="radio" name="layout" defaultChecked /><span className="layoutSample classic" />Classic</label><label><input type="radio" name="layout" /><span className="layoutSample minimal" />Minimal</label><label><input type="radio" name="layout" /><span className="layoutSample bold" />Bold</label></fieldset>
            <label className="field">Profile color<div className="colorField"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /><input value={color.toUpperCase()} onChange={(event) => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && setColor(event.target.value)} /></div></label>
          </div>}

          {section === "Links" && <div className="formStack linksForm">
            <p className="sectionIntro">Put the evaluation form first, then add the social links peer advisees may need.</p>
            {[["Evaluation form", "https://forms.example/evaluation"], ["LinkedIn", "https://linkedin.com/in/alex-santos"], ["Facebook", "https://facebook.com/alex.santos"]].map(([service, url], index) => <div className="linkRow" key={service}><span className="dragHandle">{index + 1}</span><div><strong>{service}</strong><input defaultValue={url} aria-label={`${service} URL`} /></div><button type="button" aria-label={`Remove ${service}`}>Remove</button></div>)}
            <button className="buttonSecondary addLink" type="button">Add social link</button>
          </div>}
        </section>
        <aside className="previewPane">
          <div className="previewHeader"><div><p>Live preview</p><span>Mobile</span></div><Link className="previewOpen" href="/id/demo" aria-label="Open preview in new tab">Open</Link></div>
          <div className="phoneFrame"><div className="phoneTop"><span /></div><ProfileCard compact name={name || "Your name"} role={role} bio={bio} primary={color} /></div>
        </aside>
      </div>
    </main>
  );
}
