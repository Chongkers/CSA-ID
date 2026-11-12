import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const isInternalRscRequest = request.headers.get("rsc") === "1";

  if (request.nextUrl.searchParams.has("_rsc") && !isInternalRscRequest) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.searchParams.delete("_rsc");

    const response = NextResponse.redirect(canonicalUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/id/:path*",
};
