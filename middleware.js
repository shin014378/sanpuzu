const PUBLIC_PATHS = new Set(["/login.html", "/styles.css", "/api/login"]);

export default function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname)) {
    return;
  }

  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)sanpuzu_session=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : "";
  if (token && token === process.env.SESSION_SECRET) {
    return;
  }

  return Response.redirect(new URL("/login.html", request.url));
}
