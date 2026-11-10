import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";
import { SiteHeader } from "@/components/site-header";
import { MapuaSquares } from "@/components/mapua-squares";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero" data-enter>
          <div className="shell heroGrid">
            <div className="heroCopy">
              <h1>Student assistant profiles for every tutoring session</h1>
              <p className="heroLead">Peer advisees tap an NFC card to identify their student assistant, find useful links, and open the session evaluation form.</p>
              <div className="buttonRow">
                <Link className="button" href="/login">Open your dashboard</Link>
                <Link className="buttonSecondary" href="/id/demo">View a profile</Link>
              </div>
              <p className="heroFact">Built for 8 Mapúa University CSA student assistants.</p>
            </div>
            <div className="heroVisual" aria-label="CSA student assistant profile preview">
              <MapuaSquares className="heroSquares" />
              <div className="editorWindow">
                <div className="windowBar"><span /><span /><span /><b>Profile editor</b></div>
                <div className="editorBody">
                  <div className="editorRail"><span className="active" /><span /><span /><span /></div>
                  <div className="editorForm">
                    <p>Student assistant profile</p>
                    <label>Name <span>Alex Santos</span></label>
                    <label>Role <span>Peer adviser</span></label>
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
              <h2>Update the profile, keep the NFC link</h2>
              <p>The public address stays fixed after setup. Student assistants can update their details without rewriting the physical card.</p>
            </div>
            <ol className="stepList">
              <li><span>01</span><div><h3>Sign in with Google</h3><p>Open one private draft for your assistant profile.</p></div></li>
              <li><span>02</span><div><h3>Add session details</h3><p>Choose your photo, links, background, and evaluation form.</p></div></li>
              <li><span>03</span><div><h3>Publish the NFC page</h3><p>Preview every change before peer advisees can see it.</p></div></li>
            </ol>
          </div>
        </section>
      </main>
      <footer className="homeFooter">
        <div className="shell footerInner"><span>Mapúa University · Center for Student Advising</span><div><Link href="/login">Open your dashboard</Link><Link href="/id/demo">View a profile</Link></div></div>
      </footer>
    </>
  );
}
