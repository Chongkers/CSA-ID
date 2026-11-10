import { z } from "zod";

export const services = ["linkedin", "instagram", "facebook", "github", "youtube", "tiktok", "x", "website"] as const;
export type ProfileService = (typeof services)[number];

const socialLink = z.object({
  service: z.enum(services),
  url: z.string().url().max(500),
});

export const profileInput = z.object({
  displayName: z.string().trim().min(1).max(128),
  role: z.string().trim().min(1).max(128),
  bio: z.string().trim().max(500),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48).nullable(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  evaluationUrl: z.string().url().max(500).or(z.literal("")),
  links: z.array(socialLink).max(8).superRefine((links, context) => {
    const unique = new Set(links.map((link) => link.service));
    if (unique.size !== links.length) context.addIssue({ code: "custom", message: "Each platform can be added once" });
  }),
});

export type ProfileInput = z.infer<typeof profileInput>;

export function isSafeProfileUrl(service: ProfileService, rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const allowed: Partial<Record<ProfileService, string[]>> = {
    linkedin: ["linkedin.com"], instagram: ["instagram.com"], facebook: ["facebook.com", "fb.com"], github: ["github.com"], youtube: ["youtube.com", "youtu.be"], tiktok: ["tiktok.com"], x: ["x.com", "twitter.com"],
  };
  return service === "website" || Boolean(allowed[service]?.some((domain) => host === domain || host.endsWith(`.${domain}`)));
}
