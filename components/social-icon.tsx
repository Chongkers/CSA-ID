import type { ReactNode, SVGProps } from "react";

export type SocialPlatform =
  | "facebook"
  | "github"
  | "instagram"
  | "linkedin"
  | "website";

type SocialIconProps = SVGProps<SVGSVGElement> & {
  platform: SocialPlatform | "external";
};

const paths: Record<SocialIconProps["platform"], ReactNode> = {
  facebook: <path d="M14 8.5V6.7c0-.8.5-1 1-1h2.6V2.1L14.5 2C11.4 2 9.8 3.9 9.8 6.4v2.1H7v4h2.8V22H14v-9.5h3.2l.6-4H14Z" />,
  github: <path fillRule="evenodd" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.4-2.3-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.7 8c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1.1a9.6 9.6 0 0 1 5.1 0c2-1.4 2.8-1.1 2.8-1.1.6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.8c0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" clipRule="evenodd" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" /></>,
  linkedin: <><path d="M5.1 8.2H1.8V22h3.3V8.2ZM3.5 2A2.1 2.1 0 1 0 3.5 6.2 2.1 2.1 0 0 0 3.5 2ZM22 13.8c0-4.2-2.2-6.1-5.2-6.1a4.5 4.5 0 0 0-4.1 2.3V8.2H9.4V22h3.3v-6.8c0-1.8.3-3.6 2.6-3.6 2.2 0 2.3 2.1 2.3 3.7V22H22v-8.2Z" /></>,
  website: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3.5 12h17M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z" fill="none" stroke="currentColor" strokeWidth="2" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />,
};

export function SocialIcon({ platform, ...props }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {paths[platform]}
    </svg>
  );
}
