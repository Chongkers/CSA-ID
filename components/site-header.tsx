import Link from "next/link";
import { Brand } from "./brand";

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="shell headerInner">
        <a className="skipLink" href="#main">Skip to content</a>
        <Brand />
        <nav className="headerNav" aria-label="Primary navigation">
          <Link className="textLink" href="/id/demo">View profile</Link>
          <Link className="button buttonSmall" href="/login">Create your profile</Link>
        </nav>
      </div>
    </header>
  );
}
