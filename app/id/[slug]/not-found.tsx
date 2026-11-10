import Link from "next/link";

export default function ProfileUnavailable() {
  return (
    <main className="publicProfile">
      <section className="publicCard">
        <h1>Profile unavailable</h1>
        <p className="publicBio">This profile is not available.</p>
        <Link className="reportLink" href="/">Back to home</Link>
      </section>
    </main>
  );
}
