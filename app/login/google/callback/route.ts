import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBindings } from "@/lib/cloudflare";
import { getDb } from "@/lib/db";
import { googleClient, identityFromIdToken } from "@/lib/auth/google";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { findOrCreateUser } from "@/lib/auth/users";

function failure(origin: string) {
  const response = NextResponse.redirect(new URL("/login?error=google", origin), 303);
  response.cookies.delete({ name: "google_oauth_state", path: "/login/google" });
  response.cookies.delete({ name: "google_oauth_verifier", path: "/login/google" });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const state = jar.get("google_oauth_state")?.value;
  const codeVerifier = jar.get("google_oauth_verifier")?.value;
  const code = url.searchParams.get("code");

  if (!state || !codeVerifier || !code || url.searchParams.get("state") !== state) {
    return failure(url.origin);
  }

  try {
    const env = getBindings();
    const tokens = await googleClient(env, url.origin).validateAuthorizationCode(code, codeVerifier);
    const identity = identityFromIdToken(tokens.idToken(), env.GOOGLE_CLIENT_ID);
    const db = getDb();
    const user = await findOrCreateUser(db, identity);
    const token = await createSession(db, user.id);

    const response = NextResponse.redirect(new URL("/dashboard", url.origin), 303);
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    response.cookies.delete({ name: "google_oauth_state", path: "/login/google" });
    response.cookies.delete({ name: "google_oauth_verifier", path: "/login/google" });
    return response;
  } catch {
    return failure(url.origin);
  }
}
