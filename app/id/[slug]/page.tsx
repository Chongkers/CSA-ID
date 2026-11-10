import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [{ slug: "demo" }];
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "demo") notFound();

  return (
    <main className="publicProfile">
      <div className="publicBackdrop" aria-hidden="true"><span /><span /><span /></div>
      <section className="publicCard">
        <div className="publicAvatar">AM</div>
        <h1>Alex Morgan</h1>
        <p className="publicKicker">Product designer</p>
        <p className="publicBio">I design useful software and write about the decisions behind it.</p>
        <nav className="publicLinks" aria-label="Alex Morgan links">
          <a href="https://linkedin.com" rel="noreferrer">LinkedIn <span>Open</span></a>
          <a href="https://instagram.com" rel="noreferrer">Instagram <span>Open</span></a>
          <a href="https://example.com" rel="noreferrer">Website <span>Open</span></a>
        </nav>
        <button className="saveContact publicSave" type="button">Save contact</button>
        <p className="providedNotice">This profile contains user-provided information.</p>
        <Link className="reportLink" href="/report">Report this profile</Link>
      </section>
      <Link className="profileBrand" href="/">Digital Profile</Link>
    </main>
  );
}
