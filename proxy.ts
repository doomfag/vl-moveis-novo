import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
export function proxy(request: NextRequest) {
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
    "/((?!api|_next/static|_next/image|catalogos/|catalogo/.*\\.(?:webp|png|jpg|jpeg)|favicon.ico).*)",
  ],
};
