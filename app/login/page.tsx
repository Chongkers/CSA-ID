import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
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
        {error && <p role="alert">Google sign-in did not complete. Try again with a Google account whose email is verified.</p>}
        <a className="googleButton" href="/login/google"><span aria-hidden="true">G</span>Continue with Google</a>
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
