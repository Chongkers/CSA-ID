import { generateCodeVerifier, generateState } from "arctic";
import { getBindings } from "@/lib/cloudflare";
import { GOOGLE_SCOPES, googleClient } from "@/lib/auth/google";

const OAUTH_COOKIE_MAX_AGE = 600;

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleClient(getBindings(), origin).createAuthorizationURL(state, codeVerifier, GOOGLE_SCOPES);

  const cookie = (name: string, value: string) =>
    `${name}=${value}; Max-Age=${OAUTH_COOKIE_MAX_AGE}; Path=/login/google; HttpOnly; Secure; SameSite=Lax`;
  const headers = new Headers({ Location: url.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookie("google_oauth_state", state));
  headers.append("Set-Cookie", cookie("google_oauth_verifier", codeVerifier));
  return new Response(null, { status: 302, headers });
}
