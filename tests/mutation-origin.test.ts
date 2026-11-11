import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ unpublish: vi.fn(), purge: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentAccount: async () => ({ user: { id: "u1" }, profile: { id: "p1", slug: "someone", displayName: "Someone", role: "Student assistant", evaluationUrl: "https://forms.example/e", status: "published", avatarKey: null, backgroundKey: null } }),
}));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/cloudflare", () => ({ getBindings: () => ({}) }));
vi.mock("@/lib/edge-cache", () => ({ purgeProfilePage: state.purge }));
vi.mock("@/lib/public/published-profile", () => ({ unpublishProfile: state.unpublish }));

import { POST as publish } from "@/app/api/profile/publish/route";
import { POST as unpublish } from "@/app/api/profile/unpublish/route";
import { POST as upload } from "@/app/api/uploads/[kind]/route";

const ORIGIN = "http://localhost:3000";
const post = (path: string, headers: Record<string, string> = {}) => new Request(`${ORIGIN}${path}`, { method: "POST", headers });

const routes = {
  "POST /api/profile/publish": (headers?: Record<string, string>) => publish(post("/api/profile/publish", headers)),
  "POST /api/profile/unpublish": (headers?: Record<string, string>) => unpublish(post("/api/profile/unpublish", headers)),
  "POST /api/uploads/avatar": (headers?: Record<string, string>) => upload(post("/api/uploads/avatar", headers), { params: Promise.resolve({ kind: "avatar" }) }),
};

beforeEach(() => { state.unpublish.mockReset(); state.purge.mockReset(); });

describe.each(Object.entries(routes))("%s", (_, call) => {
  it("rejects a signed-in request with no Origin header", async () => {
    const response = await call();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Invalid origin" });
    expect(state.unpublish).not.toHaveBeenCalled();
    expect(state.purge).not.toHaveBeenCalled();
  });

  it("rejects a foreign Origin", async () => {
    expect((await call({ origin: "https://evil.example" })).status).toBe(403);
  });
});
