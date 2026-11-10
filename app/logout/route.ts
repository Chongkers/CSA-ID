import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const jar = await cookies();
  await deleteSession(getDb(), jar.get(SESSION_COOKIE)?.value);
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
