import Link from "next/link";
import { Brand } from "./brand";

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="shell headerInner">
        <a className="skipLink" href="#main">Skip to content</a>
        <Brand />
        <nav className="headerNav" aria-label="Primary navigation">
          <Link className="textLink" href="/id/demo">View a profile</Link>
          <Link className="button buttonSmall" href="/login">Open your dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
