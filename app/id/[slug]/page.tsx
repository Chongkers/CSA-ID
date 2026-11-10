import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapuaSquares } from "@/components/mapua-squares";

export function generateStaticParams() {
  return [{ slug: "demo" }];
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "demo") notFound();

  return (
    <main
      className="publicProfile"
      data-has-user-background="false"
      style={{ "--profile-background-image": "none" } as React.CSSProperties}
    >
      <Link className="publicBack" href="/" aria-label="Back to home">
        <span aria-hidden="true">←</span>
        Back to home
      </Link>
      <div className="publicBackdrop" aria-hidden="true">
        <MapuaSquares className="publicSquares publicSquaresPrimary" />
        <MapuaSquares className="publicSquares publicSquaresSecondary" />
      </div>
      <section className="publicCard">
        <Image className="publicCsaLogo" src="/brand/csa-logo.jpg" width={64} height={64} alt="Mapúa University Center for Student Advising" />
        <div className="publicAvatar">AS</div>
        <h1>Alex Santos</h1>
        <p className="publicKicker">Student assistant</p>
        <p className="publicBio">Peer adviser for tutoring sessions at the Center for Student Advising.</p>
        <a className="evaluationButton" href="https://forms.example/evaluation" rel="noreferrer">Open session evaluation</a>
        <nav className="publicLinks" aria-label="Alex Santos links">
          <a href="https://linkedin.com" rel="noreferrer">LinkedIn <span>Open</span></a>
          <a href="https://instagram.com" rel="noreferrer">Instagram <span>Open</span></a>
          <a href="https://example.com" rel="noreferrer">Website <span>Open</span></a>
        </nav>
        <button className="saveContact publicSave" type="button">Save contact</button>
        <p className="providedNotice">This profile contains user-provided information.</p>
        <Link className="reportLink" href="/report">Report this profile</Link>
      </section>
      <Link className="profileBrand" href="/">Mapúa University CSA</Link>
    </main>
  );
}
