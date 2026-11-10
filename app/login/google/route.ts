import { NextResponse } from "next/server";
import * as oauth from "oauth4webapi";
import { googleConfig, googleIssuer } from "@/lib/auth/google";

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const { client, redirectUri } = googleConfig(origin);
    const state = oauth.generateRandomState();
    const nonce = oauth.generateRandomNonce();
    const verifier = oauth.generateRandomCodeVerifier();
    const challenge = await oauth.calculatePKCECodeChallenge(verifier);
    const url = new URL(googleIssuer.authorization_endpoint!);
    url.searchParams.set("client_id", client.client_id);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "select_account");
    const response = NextResponse.redirect(url);
    const cookie = { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/login/google", maxAge: 600 };
    response.cookies.set("oauth_state", state, cookie);
    response.cookies.set("oauth_nonce", nonce, cookie);
    response.cookies.set("oauth_verifier", verifier, cookie);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=not-configured", request.url));
  }
}
