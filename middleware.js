import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login.html",
  "/styles.css",
  "/api/login",
  "/favicon.ico",
]);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/login")
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("sanpuzu_session")?.value;
  const expected = process.env.SESSION_SECRET;
  if (!expected || cookie !== expected) {
    const login = request.nextUrl.clone();
    login.pathname = "/login.html";
    login.search = "";
    return NextResponse.redirect(login);
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/index.html", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
