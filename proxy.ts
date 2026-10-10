import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
export function proxy(request: NextRequest) {
  if (/^\/catalogos(?:\/|$)/.test(request.nextUrl.pathname)) {
    return new NextResponse("Página não encontrada.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  const nonce = randomBytes(16).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${dev ? "'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src 'self' ${dev ? "ws: wss:" : ""}`,
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
export const config = {
  matcher: [
    "/catalogos/:path*",
    "/((?!api|_next/static|_next/image|catalogos/|catalogo/.*\\.(?:webp|png|jpg|jpeg)|favicon.ico).*)",
  ],
};
