import { decodeIdToken, Google } from "arctic";

export const GOOGLE_SCOPES = ["openid", "email", "profile"];
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleIdentity = { sub: string; email: string };

export function googleClient(env: { GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string }, origin: string) {
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${origin}/login/google/callback`);
}

export function verifyGoogleClaims(
  claims: Record<string, unknown>,
  clientId: string,
  now = Math.floor(Date.now() / 1000),
): GoogleIdentity {
  const { iss, aud, exp, sub, email, email_verified } = claims;
  if (typeof iss !== "string" || !ISSUERS.includes(iss)) throw new Error("bad issuer");
  if (aud !== clientId) throw new Error("bad audience");
  if (typeof exp !== "number" || exp <= now) throw new Error("expired id token");
  if (typeof sub !== "string" || !sub) throw new Error("missing subject");
  if (typeof email !== "string" || !email) throw new Error("missing email");
  if (email_verified !== true) throw new Error("email not verified");
  return { sub, email };
}

export function identityFromIdToken(idToken: string, clientId: string): GoogleIdentity {
  return verifyGoogleClaims(decodeIdToken(idToken) as Record<string, unknown>, clientId);
}
