import { NextResponse } from "next/server";
import * as oauth from "oauth4webapi";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import { googleConfig, googleIssuer } from "@/lib/auth/google";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMap = new Map(cookieHeader.split(";").map((part) => part.trim().split("=").map(decodeURIComponent) as [string, string]));
  const state = cookieMap.get("oauth_state");
  const nonce = cookieMap.get("oauth_nonce");
  const verifier = cookieMap.get("oauth_verifier");
  if (!state || !nonce || !verifier) return NextResponse.redirect(new URL("/login?error=expired", request.url));

  try {
    const { client, clientAuth, redirectUri } = googleConfig(requestUrl.origin);
    const params = oauth.validateAuthResponse(googleIssuer, client, requestUrl, state);
    const tokenResponse = await oauth.authorizationCodeGrantRequest(googleIssuer, client, clientAuth, params, redirectUri, verifier);
    const tokens = await oauth.processAuthorizationCodeResponse(googleIssuer, client, tokenResponse, { expectedNonce: nonce, requireIdToken: true });
    const claims = oauth.getValidatedIdTokenClaims(tokens);
    if (!claims?.sub || typeof claims.email !== "string" || claims.email_verified !== true) throw new Error("Google account email is not verified");

    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const [existing] = await db.select().from(users).where(eq(users.googleSub, claims.sub)).limit(1);
    const userId = existing?.id ?? crypto.randomUUID();
    const name = typeof claims.name === "string" ? claims.name.slice(0, 128) : claims.email.split("@")[0];
    const pictureUrl = typeof claims.picture === "string" ? claims.picture : null;
    if (existing) await db.update(users).set({ email: claims.email, name, pictureUrl }).where(eq(users.id, userId));
    else await db.insert(users).values({ id: userId, googleSub: claims.sub, email: claims.email, name, pictureUrl, createdAt: now });
    const [profile] = await db.select().from(profiles).where(and(eq(profiles.userId, userId))).limit(1);
    if (!profile) await db.insert(profiles).values({ id: crypto.randomUUID(), userId, slug: null, displayName: name, role: "Student assistant", bio: "", accentColor: "#B5121B", avatarKey: null, backgroundKey: null, evaluationUrl: null, status: "draft", createdAt: now, updatedAt: now });

    const session = await createSession(userId);
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, secure: requestUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: session.maxAge });
    response.cookies.delete("oauth_state"); response.cookies.delete("oauth_nonce"); response.cookies.delete("oauth_verifier");
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
