import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero" data-enter>
          <div className="shell heroGrid">
            <div className="heroCopy">
              <h1>A digital profile for every introduction</h1>
              <p className="heroLead">Choose your photo, background, and social links. Share the same public page by link, QR code, or NFC card.</p>
              <div className="buttonRow">
                <Link className="button" href="/login">Create your profile</Link>
                <Link className="buttonSecondary" href="/id/demo">View profile</Link>
              </div>
              <p className="heroFact">Free to create. Google login. No password to remember.</p>
            </div>
            <div className="heroVisual" aria-label="Digital Profile product preview">
              <div className="editorWindow">
                <div className="windowBar"><span /><span /><span /><b>Profile editor</b></div>
                <div className="editorBody">
                  <div className="editorRail"><span className="active" /><span /><span /><span /></div>
                  <div className="editorForm">
                    <p>Profile details</p>
                    <label>Name <span>Alex Morgan</span></label>
                    <label>Role <span>Product designer</span></label>
                    <label>Profile color <i /></label>
                  </div>
                </div>
              </div>
              <div className="heroCard"><ProfileCard compact /></div>
            </div>
          </div>
        </section>

        <section className="mechanismSection">
          <div className="shell mechanismGrid">
            <div>
              <h2>Edit the profile, keep the link</h2>
              <p>Your public address stays fixed after you choose it. Update the page in your dashboard without rewriting the NFC card.</p>
            </div>
            <ol className="stepList">
              <li><span>01</span><div><h3>Sign in with Google</h3><p>Create one account and one draft profile.</p></div></li>
              <li><span>02</span><div><h3>Choose what appears</h3><p>Add your photo, background, details, and supported links.</p></div></li>
              <li><span>03</span><div><h3>Publish one address</h3><p>Preview every change before it reaches the public page.</p></div></li>
            </ol>
          </div>
        </section>
      </main>
      <footer className="homeFooter">
        <div className="shell footerInner"><span>Digital Profile</span><div><Link href="/login">Create your profile</Link><Link href="/id/demo">View profile</Link></div></div>
      </footer>
    </>
  );
}
