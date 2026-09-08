import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function same(left, right) {
  const a = Buffer.from(String(left ?? ""));
  const b = Buffer.from(String(right ?? ""));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const user = process.env.APP_USER;
  const password = process.env.APP_PASSWORD;
  const session = process.env.SESSION_SECRET;

  if (!user || !password || !session) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!same(body.username, user) || !same(body.password, password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("sanpuzu_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
