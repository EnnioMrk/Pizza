/**
 * Pizza order system on Cloudflare Workers.
 *
 * One Worker, one D1 database, no other bindings. Static files never run
 * this code: `assets.run_worker_first` sends only /api/* here.
 *
 * Replaces the old PHP file-writer (wtf.php) and the Glitch socket.io server.
 * Real time becomes polling with ETag, which the free plan covers.
 *
 * Routes:
 *   GET    /api/menu      menu lists
 *   POST   /api/menu      add one item            (admin)
 *   DELETE /api/menu      remove one item         (admin)
 *   GET    /api/session   active session or null
 *   POST   /api/session   start a session         (admin)
 *   DELETE /api/session   end the session         (admin)
 *   GET    /api/orders    orders of the session   (admin)
 *   POST   /api/orders    place an order
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });

const text = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);

const list = (value, max = 20, size = 40) =>
  Array.isArray(value) ? value.map((v) => text(v, size)).filter(Boolean).slice(0, max) : [];

const parse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

async function body(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return (await request.json().catch(() => ({}))) ?? {};
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  return Object.fromEntries(form.entries());
}

const isAdmin = (request, env) =>
  request.headers.get("x-admin-key") === (env.ADMIN_PASSWORD || "master");

const requireAdmin = (request, env) =>
  isAdmin(request, env) ? null : json({ error: "unauthorized" }, { status: 401 });

async function menu(env) {
  const { results } = await env.DB.prepare(
    "SELECT kind, name FROM menu_items ORDER BY kind, pos, id",
  ).all();
  return {
    ingredients: results.filter((r) => r.kind === "ingredient").map((r) => r.name),
    options: results.filter((r) => r.kind === "option").map((r) => r.name),
  };
}

async function activeSession(env) {
  const row = await env.DB.prepare(
    "SELECT id, started_at, ingredients, options FROM sessions WHERE active = 1 ORDER BY id DESC LIMIT 1",
  ).first();
  if (!row) return null;
  return {
    id: row.id,
    startedAt: row.started_at,
    ingredients: parse(row.ingredients),
    options: parse(row.options),
  };
}

async function handleMenu(request, env) {
  if (request.method === "GET") return json(await menu(env), { headers: { "cache-control": "no-store" } });

  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const data = await body(request);
  const kind = data.kind === "option" ? "option" : "ingredient";
  const name = text(data.name, 40);
  if (!name) return json({ error: "name is required" }, { status: 400 });

  if (request.method === "POST") {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO menu_items (kind, name, pos) VALUES (?, ?, (SELECT COALESCE(MAX(pos), 0) + 1 FROM menu_items WHERE kind = ?))",
    )
      .bind(kind, name, kind)
      .run();
    return json(await menu(env));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM menu_items WHERE kind = ? AND name = ?").bind(kind, name).run();
    return json(await menu(env));
  }

  return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, POST, DELETE" } });
}

async function handleSession(request, env) {
  if (request.method === "GET") {
    const session = await activeSession(env);
    const etag = `W/"${session ? `${session.id}-${session.ingredients.length}-${session.options.length}` : "none"}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { etag } });
    }
    return json(session, { headers: { etag, "cache-control": "no-store" } });
  }

  const denied = requireAdmin(request, env);
  if (denied) return denied;

  if (request.method === "POST") {
    const data = await body(request);
    const ingredients = list(data.ingredients);
    const options = list(data.options);
    if (!ingredients.length) return json({ error: "ingredients are required" }, { status: 400 });
    await env.DB.batch([
      env.DB.prepare("UPDATE sessions SET active = 0 WHERE active = 1"),
      env.DB.prepare(
        "INSERT INTO sessions (started_at, ingredients, options, active) VALUES (?, ?, ?, 1)",
      ).bind(Math.floor(Date.now() / 1000), JSON.stringify(ingredients), JSON.stringify(options)),
    ]);
    return json(await activeSession(env));
  }

  if (request.method === "DELETE") {
    await env.DB.prepare("UPDATE sessions SET active = 0 WHERE active = 1").run();
    return json({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, POST, DELETE" } });
}

async function handleOrders(request, env) {
  if (request.method === "POST") {
    const session = await activeSession(env);
    if (!session) return json({ error: "no active session" }, { status: 409 });

    const data = await body(request);
    const name = text(data.name, 40) || "Anonymous";
    const comment = text(data.comment, 200);
    const ingredients = list(data.ingredients);
    const options = list(data.options);

    const inserted = await env.DB.prepare(
      "INSERT INTO orders (session_id, created_at, name, comment, ingredients, options) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(session.id, Math.floor(Date.now() / 1000), name, comment, JSON.stringify(ingredients), JSON.stringify(options))
      .run();

    return json({ ok: true, id: inserted.meta.last_row_id });
  }

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, POST" } });
  }

  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const session = await activeSession(env);
  if (!session) return json([], { headers: { "cache-control": "no-store" } });

  const { results } = await env.DB.prepare(
    "SELECT id, created_at, name, comment, ingredients, options FROM orders WHERE session_id = ? ORDER BY id",
  )
    .bind(session.id)
    .all();

  const rows = results.map((r) => ({
    id: r.id,
    time: r.created_at,
    N: r.name,
    C: r.comment,
    I: parse(r.ingredients),
    O: parse(r.options),
  }));

  const etag = `W/"${rows.length}-${rows.length ? rows[rows.length - 1].id : 0}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }
  return json(rows, { headers: { etag, "cache-control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/menu") return handleMenu(request, env);
    if (pathname === "/api/session") return handleSession(request, env);
    if (pathname === "/api/orders") return handleOrders(request, env);

    return env.ASSETS.fetch(request);
  },
};
