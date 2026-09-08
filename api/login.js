function same(left, right) {
  return String(left ?? "") === String(right ?? "") && String(left ?? "") !== "";
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const user = process.env.APP_USER;
  const password = process.env.APP_PASSWORD;
  const session = process.env.SESSION_SECRET;
  if (!user || !password || !session) {
    return Response.json({ ok: false }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  if (!same(body.username, user) || !same(body.password, password)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `sanpuzu_session=${encodeURIComponent(session)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`,
    },
  });
}
