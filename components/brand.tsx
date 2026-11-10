import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Digital Profile home">
      <span className="brandMark" aria-hidden="true"><i /><i /><i /></span>
      <span>Digital Profile</span>
    </Link>
  );
}
