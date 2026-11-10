import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const account = await getCurrentUser();
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind } = await params;
  if (kind !== "avatar" && kind !== "background") return NextResponse.json({ error: "Unknown upload type" }, { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  const maxBytes = kind === "avatar" ? 2_000_000 : 4_000_000;
  if (!(file instanceof File) || file.size > maxBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: `Choose a JPEG, PNG, or WebP under ${maxBytes / 1_000_000} MB` }, { status: 400 });
  const env = getBindings();
  if (!env.IMAGES) return NextResponse.json({ error: "Image processing is not configured" }, { status: 503 });
  try {
    const width = kind === "avatar" ? 512 : 1920;
    const result = await env.IMAGES.input(file.stream()).transform({ width, height: kind === "avatar" ? 512 : 1080, fit: "scale-down" }).output({ format: "image/webp", quality: 82 });
    const key = `img/${account.profile.id}/${kind}/${crypto.randomUUID()}.webp`;
    await env.KV.put(key, result.image(), { metadata: { contentType: "image/webp" } });
    const field = kind === "avatar" ? { avatarKey: key } : { backgroundKey: key };
    await getDb().update(profiles).set(field).where(eq(profiles.id, account.profile.id));
    return NextResponse.json({ ok: true, url: `/media/${key}` });
  } catch {
    return NextResponse.json({ error: "The image could not be processed" }, { status: 400 });
  }
}
