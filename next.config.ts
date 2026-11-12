import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  // Image optimization on Workers needs the Cloudflare Images binding, which can bill; zero-billing wins.
  images: {
    unoptimized: true,
  },
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/dashboard/:path*", headers: noStore },
      { source: "/api/:path*", headers: noStore },
      { source: "/id/:slug", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
