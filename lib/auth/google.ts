import * as oauth from "oauth4webapi";
import { getBindings } from "@/lib/cloudflare";

export type GoogleIdentity = { sub: string; email: string; name?: string; pictureUrl?: string };

export const googleIssuer: oauth.AuthorizationServer = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
  code_challenge_methods_supported: ["S256"],
};

export function googleConfig(origin: string) {
  const env = getBindings();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth is not configured");
  const redirectUri = `${env.APP_ORIGIN || origin}/login/google/callback`;
  const client: oauth.Client = { client_id: env.GOOGLE_CLIENT_ID, token_endpoint_auth_method: "client_secret_post" };
  return { client, clientAuth: oauth.ClientSecretPost(env.GOOGLE_CLIENT_SECRET), redirectUri };
}

export function verifyGoogleClaims(claims: Record<string, unknown>, clientId: string, now = Math.floor(Date.now() / 1000)): GoogleIdentity {
  const { iss, aud, exp, sub, email, email_verified, name, picture } = claims;
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") throw new Error("bad issuer");
  if (aud !== clientId) throw new Error("bad audience");
  if (typeof exp !== "number" || exp <= now) throw new Error("expired id token");
  if (typeof sub !== "string" || !sub) throw new Error("missing subject");
  if (typeof email !== "string" || !email) throw new Error("missing email");
  if (email_verified !== true) throw new Error("email not verified");
  return { sub, email, name: typeof name === "string" ? name.slice(0, 128) : undefined, pictureUrl: typeof picture === "string" ? picture : undefined };
}
