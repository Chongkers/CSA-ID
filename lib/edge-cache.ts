const PROFILE_PATH = /^\/id\/([^/]+)\/?$/;
export const PROFILE_CACHE_CONTROL = "public, max-age=0, s-maxage=60";

export function profileCacheKey(url: string | URL) {
  const { origin, pathname } = new URL(url);
  const match = PROFILE_PATH.exec(pathname);
  return match ? new Request(`${origin}/id/${match[1]}`) : null;
}

export async function purgeProfilePage(slug: string, requestUrl: string) {
  const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const key = profileCacheKey(new URL(`/id/${encodeURIComponent(slug)}`, requestUrl));
  if (edge && key) await edge.delete(key);
}

const UNAVAILABLE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Profile unavailable</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#1a1a1a}main{text-align:center;padding:24px}a{color:#B5121B}</style></head><body><main><h1>Profile unavailable</h1><p>This profile is not available.</p><a href="/">Back to home</a></main></body></html>`;

function unavailableResponse() {
  return new Response(UNAVAILABLE_HTML, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": PROFILE_CACHE_CONTROL, "X-Robots-Tag": "noindex, nofollow" } });
}

type Handler = (request: Request, env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }) => Promise<Response>;

export function withProfileEdgeCache(handler: Handler): Handler {
  return async (request, env, ctx) => {
    const isRsc = request.headers.has("rsc") || new URL(request.url).searchParams.has("_rsc");
    const key = request.method === "GET" && !isRsc ? profileCacheKey(request.url) : null;
    const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    if (!key || !edge) return handler(request, env, ctx);
    const hit = await edge.match(key);
    if (hit) return hit;
    const response = await handler(request, env, ctx);
    const isHtml200 = response.status === 200 && response.headers.get("content-type")?.startsWith("text/html");
    if (!isHtml200 && response.status !== 404) return response;
    let cacheable: Response;
    if (response.status === 404) { await response.body?.cancel(); cacheable = unavailableResponse(); }
    else { cacheable = new Response(response.body, response); cacheable.headers.set("Cache-Control", PROFILE_CACHE_CONTROL); }
    ctx.waitUntil(edge.put(key, cacheable.clone()));
    return cacheable;
  };
}
