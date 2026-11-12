import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

describe("public document requests", () => {
  it("redirects leaked RSC URLs to their canonical public URL", () => {
    const request = new NextRequest("https://example.test/id/isaac-giron?_rsc=debug", {
      headers: { accept: "text/html,application/xhtml+xml" },
    });

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.test/id/isaac-giron");
  });

  it("does not redirect legitimate internal RSC requests", () => {
    const request = new NextRequest("https://example.test/id/isaac-giron?_rsc=debug", {
      headers: { accept: "*/*", rsc: "1" },
    });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });
});
