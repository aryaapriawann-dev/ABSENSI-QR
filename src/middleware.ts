import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "absensi-qr-auth-secret-key-32ch!"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths, static assets, and API routes except protected ones
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = req.cookies.get("absensi_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jose.jwtVerify(token, AUTH_SECRET, { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    // Expired or invalid
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("absensi_session");
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/scan/:path*", "/api/buat-qr/:path*", "/api/hadir/:path*"],
};
