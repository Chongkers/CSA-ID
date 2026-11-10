import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapuaSquares } from "@/components/mapua-squares";
import { SocialIcon, type SocialPlatform } from "@/components/social-icon";

const socialLinks: Array<{ label: string; href: string; platform: SocialPlatform }> = [
  { label: "LinkedIn", href: "https://linkedin.com", platform: "linkedin" },
  { label: "Instagram", href: "https://instagram.com", platform: "instagram" },
  { label: "Facebook", href: "https://facebook.com", platform: "facebook" },
  { label: "GitHub", href: "https://github.com", platform: "github" },
  { label: "Website", href: "https://example.com", platform: "website" },
];

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
        <span aria-hidden="true">&larr;</span>
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
          {socialLinks.map(({ label, href, platform }) => (
            <a href={href} target="_blank" rel="noreferrer" key={platform} aria-label={`Open ${label} in a new tab`}>
              <span className="socialLinkLabel"><SocialIcon platform={platform} />{label}</span>
              <SocialIcon className="externalLinkIcon" platform="external" />
            </a>
          ))}
        </nav>
        <button className="saveContact publicSave" type="button">Save contact</button>
        <p className="providedNotice">This profile contains user-provided information.</p>
        <Link className="reportLink" href="/report">Report this profile</Link>
      </section>
      <Link className="profileBrand" href="/">Mapúa University CSA</Link>
    </main>
  );
}
