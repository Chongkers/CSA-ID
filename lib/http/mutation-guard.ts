export const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

type Failure = { ok: false; response: Response };
type Success<A> = { ok: true; account: A; body: unknown };

function fail(error: string, status: number): Failure {
  return { ok: false, response: Response.json({ error }, { status }) };
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

async function readCapped(request: Request, maxBytes: number) {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Runs the checks every mutation endpoint needs, in this order: origin,
 * session, body size, then JSON parse. Nothing is parsed until the first
 * three pass.
 */
export async function guardMutation<A>(
  request: Request,
  getAccount: () => Promise<A | null>,
  options: { maxBytes?: number; body?: boolean } = {},
): Promise<Success<A> | Failure> {
  if (!sameOrigin(request)) return fail("Invalid origin", 403);
  const account = await getAccount();
  if (!account) return fail("Unauthorized", 401);
  if (options.body === false) return { ok: true, account, body: null };
  const text = await readCapped(request, options.maxBytes ?? DEFAULT_MAX_BODY_BYTES);
  if (text === null) return fail("Request is too large", 413);
  try {
    return { ok: true, account, body: JSON.parse(text) };
  } catch {
    return fail("Request body must be valid JSON", 400);
  }
}
