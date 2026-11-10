import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const db = getDb();
  const email = "local-demo@csa.example";
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const userId = existing?.id || crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  if (!existing) await db.insert(users).values({ id: userId, googleSub: `local-${userId}`, email, name: "Alex Santos", pictureUrl: null, createdAt: now });
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) await db.insert(profiles).values({ id: crypto.randomUUID(), userId, slug: null, displayName: "Alex Santos", role: "Student assistant", bio: "Peer adviser for tutoring sessions at the Center for Student Advising.", accentColor: "#B5121B", avatarKey: null, backgroundKey: null, evaluationUrl: "", status: "draft", createdAt: now, updatedAt: now });
  const session = await createSession(userId);
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: session.maxAge });
  return response;
}
