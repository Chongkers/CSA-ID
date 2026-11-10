import Link from "next/link";
import Image from "next/image";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Digital Profile home">
      <Image className="brandLogo" src="/brand/csa-logo.jpg" width={42} height={42} alt="" priority />
      <span className="brandName"><strong>CSA</strong><small>Student Assistant Profiles</small></span>
    </Link>
  );
}
