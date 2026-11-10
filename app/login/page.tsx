import Link from "next/link";
import { Brand } from "@/components/brand";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="authPage" id="main">
      <Link className="backLink" href="/">Back to home</Link>
      <section className="authPanel">
        <Brand />
        <div>
          <h1>Open your student assistant profile</h1>
          <p>Sign in with Google to edit your public CSA page. Your Google details stay private until you choose what to publish.</p>
        </div>
        <Link className="googleButton" href="/login/google"><span aria-hidden="true">G</span>Continue with Google</Link>
        {process.env.NODE_ENV === "development" && <Link className="textLink localDemoLink" href="/login/demo">Use local development account</Link>}
        {error && <p className="authError" role="alert">{error === "not-configured" ? "Google sign-in needs its client credentials before it can start." : "Google sign-in could not be completed. Please try again."}</p>}
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
