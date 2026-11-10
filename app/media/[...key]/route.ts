import { getBindings } from "@/lib/cloudflare";

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!/^img\/[a-f0-9-]+\/(avatar|background)\/[a-f0-9-]+\.webp$/.test(key)) return new Response("Not found", { status: 404 });
  const object = await getBindings().KV.getWithMetadata<{ contentType?: string }>(key, "arrayBuffer");
  if (!object.value) return new Response("Not found", { status: 404 });
  return new Response(object.value, { headers: { "content-type": object.metadata?.contentType || "image/webp", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}
