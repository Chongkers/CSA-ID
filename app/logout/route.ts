import { NextResponse } from "next/server";
import { deleteCurrentSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  await deleteCurrentSession();
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
