import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSA Student Assistant Profiles",
  description: "Mapúa University CSA profiles for tutoring sessions, NFC sharing, and evaluation handoff.",
  robots: { index: false, follow: false },
  other: {
    "page-type": "software",
    "site-kind": "software",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-type="software" data-radius="soft" data-buttons="solid">
      <body>{children}</body>
    </html>
  );
}
