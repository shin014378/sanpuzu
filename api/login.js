function same(left, right) {
  return String(left ?? "") === String(right ?? "") && String(left ?? "") !== "";
}

export default function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).end();
    return;
  }

  const user = process.env.APP_USER;
  const password = process.env.APP_PASSWORD;
  const session = process.env.SESSION_SECRET;
  if (!user || !password || !session) {
    response.status(500).json({ ok: false });
    return;
  }

  let body = request.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!same(body.username, user) || !same(body.password, password)) {
    response.status(401).json({ ok: false });
    return;
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `sanpuzu_session=${encodeURIComponent(session)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`
  );
  response.status(200).json({ ok: true });
}
