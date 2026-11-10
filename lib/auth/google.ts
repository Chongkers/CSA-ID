import * as oauth from "oauth4webapi";
import { getBindings } from "@/lib/cloudflare";

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
