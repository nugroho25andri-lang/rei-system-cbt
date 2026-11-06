import { NextResponse } from "next/server";

export function appOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export function redirectTo(request: Request, path: string, status = 303) {
  return NextResponse.redirect(new URL(path, appOrigin(request)), status);
}
