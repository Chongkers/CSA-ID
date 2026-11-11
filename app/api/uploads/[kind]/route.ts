import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentAccount } from "@/lib/auth/current-user";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { profiles, publishedProfiles } from "@/lib/db/schema";
import { UploadError, type UploadKind } from "@/lib/images/policy";
import { readUpload, reencode, storeImage } from "@/lib/images/upload";

const noStore = { "cache-control": "no-store" };
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: noStore });

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail(403, "Invalid origin");
  const account = await getCurrentAccount();
  if (!account) return fail(401, "Unauthorized");
  const { kind } = await params;
  if (kind !== "avatar" && kind !== "background") return fail(404, "Unknown upload type");
  const env = getBindings();
  if (!env.IMAGES) return fail(503, "Image processing is not configured");

  const column = kind === "avatar" ? "avatarKey" : "backgroundKey";
  const key = `img/${account.profile.id}/${kind}/${crypto.randomUUID()}.webp`;
  try {
    const image = await reencode(env.IMAGES, await readUpload(request, kind), kind satisfies UploadKind);
    await storeImage(env.KV, key, image);
  } catch (error) {
    if (error instanceof UploadError) return fail(error.status, error.message);
    return fail(500, "The image could not be processed");
  }

  const db = getDb();
  try {
    await db.update(profiles).set({ [column]: key }).where(and(eq(profiles.id, account.profile.id), eq(profiles.userId, account.user.id)));
  } catch {
    await env.KV.delete(key).catch(() => {});
    return fail(503, "The image could not be saved. Try again later.");
  }

  const replaced = account.profile[column];
  if (replaced && replaced !== key) {
    const [published] = await db.select({ key: publishedProfiles[column] }).from(publishedProfiles).where(eq(publishedProfiles.profileId, account.profile.id)).limit(1);
    if (published?.key !== replaced) await env.KV.delete(replaced).catch(() => {});
  }
  return NextResponse.json({ ok: true, url: `/media/${key}` }, { headers: noStore });
}
