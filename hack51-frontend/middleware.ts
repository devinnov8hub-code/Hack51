import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/types/user";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get user from localStorage (stored as JSON string)
  // const userCookie = request.cookies.get("user")?.value;
  const token = request.cookies.get("access_token")?.value;
  let user: { role?: UserRole } | null = null;

  if (token) {
    try {
      // Decode JWT token (extract payload)
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        user = { role: payload.role };
      }
    } catch {
      // Invalid token, will redirect to login below
    }
  }

  // Allow auth pages regardless of authentication status
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access protected routes
  // if (!user) {
  //   // Redirect to login
  //   return NextResponse.redirect(new URL("/auth/login", request.url));
  // }
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Role-based route protection
  const role: UserRole | undefined = user?.role;

  // Employer routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/requests") ||
    pathname.startsWith("/shortlists") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/new-request") ||
    pathname.startsWith("/custom-request")
  ) {
    if (role !== "employer") {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (role !== "system_admin") {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Candidate routes
  if (pathname.startsWith("/candidate")) {
    if (role !== "candidate") {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
