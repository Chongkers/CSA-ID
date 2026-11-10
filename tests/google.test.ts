import { describe, expect, it } from "vitest";
import { verifyGoogleClaims } from "@/lib/auth/google";

const NOW = 1_800_000_000;
const good = {
  iss: "https://accounts.google.com",
  aud: "client-id",
  exp: NOW + 600,
  sub: "123",
  email: "a@example.test",
  email_verified: true,
};

describe("verifyGoogleClaims", () => {
  it("returns the subject and email for valid claims", () => {
    expect(verifyGoogleClaims(good, "client-id", NOW)).toEqual({ sub: "123", email: "a@example.test" });
  });

  it.each([
    ["issuer", { iss: "https://evil.example" }],
    ["audience", { aud: "other-client" }],
    ["expiry", { exp: NOW - 1 }],
    ["subject", { sub: undefined }],
    ["email", { email: undefined }],
    ["unverified email", { email_verified: false }],
    ["string email_verified", { email_verified: "true" }],
  ])("rejects a bad %s", (_name, patch) => {
    expect(() => verifyGoogleClaims({ ...good, ...patch }, "client-id", NOW)).toThrow();
  });
});
