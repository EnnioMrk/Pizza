# Pizza — Cloudflare build

The 2022 PHP + socket.io order system, rebuilt as one Cloudflare Worker with static assets and one D1 database.
No PHP, no container, no always-on process, no paid plan.

Branch `recreate`. The `main` branch keeps the original tree.

## Live

https://pizza.ennio-marke.workers.dev

## Architecture

| Path | Handled by | Cost |
| --- | --- | --- |
| `/`, `/sites/**`, `/assets/**`, `/libs/**` | Static assets on the edge cache | 0 Worker requests |
| `GET /api/menu` | Worker: menu lists from D1 | 1 request |
| `POST`/`DELETE /api/menu` | Worker: add or remove one item (admin) | 1 request |
| `GET /api/session` | Worker: active session or `null` | 1 request, 1 D1 read |
| `POST`/`DELETE /api/session` | Worker: start or end a session (admin) | 1 request, 1 D1 batch |
| `GET /api/orders` | Worker: orders of the session (admin) | 1 request, 1 D1 read |
| `POST /api/orders` | Worker: place an order | 1 request, 1 D1 write |

`assets.run_worker_first` is set to `/api/*` only. A request for a static file never starts the Worker.

## What replaced what

| Old | New |
| --- | --- |
| `wtf.php` (wrote any path with any content) | `/api/menu` and `/api/session`, typed and checked |
| `assets/json/*.json` written by the client | D1 `menu_items` table |
| socket.io server `myst-socket.glitch.me` (dead) | polling `GET /api/session` and `GET /api/orders` |
| session state in the socket server | D1 `sessions` table |
| orders pushed over the socket | D1 `orders` table |
| password `master` compared in the browser | `x-admin-key` header checked by the Worker |
| `.php` pages with `?t=<?=time()?>` | `index.html`, cache headers in `_headers` |

The admin key is `master` by default. Change `ADMIN_PASSWORD` in `wrangler.jsonc` to set a different one.

## Cost: zero

| Product | Free allowance | What this site uses |
| --- | --- | --- |
| Workers Free | 100,000 requests/day, 10 ms CPU | static files use 0 requests; only `/api/*` counts |
| D1 Free | 5M rows read/day, 100k rows written/day, 5 GB | 1 read per poll, 2 writes per order |
| Static assets | 20,000 files, 25 MiB each | 28 files |
| workers.dev | free subdomain | `pizza.ennio-marke.workers.dev` |

Over a limit the request fails; Cloudflare does not bill the free plan.
The polling pages use about 28,800 requests/day per open tab at 3 s. Both pages stop polling when the tab is hidden. Raise `3000` in `public/sites/Order/js/index.js` and `public/sites/Admin/js/utils.js` for more headroom.

## Layout

```
worker/index.js   the whole backend
data/             the menu that seeds D1
public/           static assets (was the repo root, all .php removed)
migrations/       D1 schema and menu seed
wrangler.jsonc    Worker, assets and D1 bindings
```

Images: the four copies of `pizza-background.jpg` became one in `/assets/pictures`. The old tree held 59 MB; this one holds 49 MB.

## Local development

```bash
npm install          # wrangler 4.30.0; use Node 20+
npm run db:local     # create the local D1 tables and menu
npm run dev          # http://127.0.0.1:8787
```

Node 22.12 or newer lets you use a newer wrangler. Remove the exact pin in `package.json` and raise `compatibility_date` in `wrangler.jsonc` when you do.

## Deploy

The Worker and the D1 database are live already. To ship a change:

```bash
npm run deploy
```

To rebuild from scratch:

```bash
npx wrangler login
npx wrangler d1 create pizza               # copy database_id into wrangler.jsonc
npm run db:remote
npm run deploy
```

D1 database `pizza`: see `database_id` in `wrangler.jsonc`.

Custom domain: add the zone to Cloudflare, then dashboard → Workers & Pages → `pizza` → Settings → Domains & Routes.

## Changes you will notice

- **The order flow has Next and Send buttons.** The old page advanced only on the Enter key. The key still works.
- **The order page waits for a session.** The old page needed a reload when the admin started one. It now switches by itself.
- **Orders appear within 3 s.** The old socket was instant. Polling is the free way to do it.

## Known gaps

- **The admin key is a shared password in a header.** It is not a login session. Anyone who reads the key can act as admin. A real login needs a signed cookie.
- **The order endpoint is public.** Anyone can post an order while a session runs. Add a Cloudflare WAF rate limit on `/api/orders` if it gets abused.
- **`adminKey` lives in a page variable.** A reload sends the admin back to the password page. That matches the old behaviour.
