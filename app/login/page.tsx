import Link from "next/link";
import { Brand } from "@/components/brand";

export default function LoginPage() {
  return (
    <main className="authPage" id="main">
      <Link className="backLink" href="/">Back to home</Link>
      <section className="authPanel">
        <Brand />
        <div>
          <h1>Open your student assistant profile</h1>
          <p>Sign in with Google to edit your public CSA page. Your Google details stay private until you choose what to publish.</p>
        </div>
        <Link className="googleButton" href="/dashboard"><span aria-hidden="true">G</span>Continue with Google</Link>
        <p className="authTerms">By continuing, you confirm you are at least 18 and agree to the Terms and Privacy Policy.</p>
      </section>
      <aside className="authAside" aria-label="Product information">
        <p>One profile for each student assistant</p>
        <strong>Update your details.<br />Keep the NFC link.</strong>
        <div className="addressStrip"><span>profile.example/id/</span><b>alex-morgan</b><i>Permanent</i></div>
      </aside>
    </main>
  );
}
