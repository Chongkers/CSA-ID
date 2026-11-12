---
name: verify
description: Launch and drive the CSA Digital Profile app (Next.js on Cloudflare Workers via OpenNext, local D1 + KV) the way a student assistant or a public visitor does, and capture proof. Use to confirm a change works in the running app — dashboard editing, slug claim, publish/unpublish, the public /id/<slug> page, image uploads, abuse reports, account export/delete — not just in vitest.
---

# Verify the CSA Digital Profile app

The user-facing surface is a web app: a signed-in **dashboard** (`/dashboard`) where a User edits their Draft Profile, and the anonymous **public page** (`/id/<slug>`). The API under `/api/*` is called only by those pages; drive it with curl only to capture side effects or reach what the UI cannot.

All helpers live in `.claude/skills/verify/bin/` and run from any directory. State for the running instance is in `.verify-runs/instance.env` (`PID`, `PORT`, `RUN_DIR`, `BASE`).

## Launch

```bash
.claude/skills/verify/bin/launch.sh          # port 3100; pass another port as $1
```

What it does: runs `npm ci` if `node_modules` is missing or older than `package-lock.json`, applies local D1 migrations (`wrangler d1 migrations apply csa-id --local`), starts `npx next dev -p <port>` in the background, and waits until `GET /login` renders "Continue with Google". It prints `ready: <url> pid=<pid> evidence=<run dir>`. Exit non-zero means not ready; read `<run dir>/server.log`.

- No env vars needed. `.env.example` holds Google OAuth settings; without them "Continue with Google" fails with `not-configured`. Use the dev-only local account instead (see Drive).
- Local D1 and KV live in `.wrangler/state/v3/` of this checkout (gitignored). An empty dir is fine: launch migrates it. The demo user and profile are created on first `/login/demo`.
- `next dev` does **not** run `worker.ts`, so the 60 s edge cache on `/id/<slug>` is not exercised locally. Testing that needs `npm run preview` (OpenNext build + wrangler) or the deployed worker; there, also run the RSC-then-direct-visit check in `features/publish.md`.

**Isolation:** one instance per checkout. Next.js allows one `next dev` per directory, and all instances in a checkout share `.wrangler/state`. `launch.sh` refuses if its recorded instance is alive, the port is taken, or another `next dev` runs in this checkout (for example your own `npm run dev` on port 3000). Never drive an instance this skill did not launch; use a separate git worktree for a second instance.

## Doctor

```bash
.claude/skills/verify/bin/doctor.sh
```

Read-only. Checks: the recorded process is alive, the port's listener belongs to our process tree, `/login` renders, the dev-only demo login link is present (proves `NODE_ENV=development`), and local D1 has no pending migrations. Prints the git revision (with `+uncommitted` if dirty) so you know which code you are driving. Run it first whenever anything looks off; any `FAIL` means stop and relaunch.

## Drive

**Browser (primary).** Use whatever browser automation your agent has (the Claude app's browser pane, Claude in Chrome, Playwright, or similar). Locate elements with `find` / `read_page` and click by `ref`, never by coordinates.

1. Sign in: open `$BASE/login`, click the link **"Use local development account"** (`href="/login/demo"`). You land on `/dashboard` as Alex Santos (`local-demo@csa.example`).
2. Dashboard handles:
   - Header buttons: **"Save draft"**, **"Publish profile"** / **"Publish changes"**, **"Unpublish"** (only when published), link **"View profile"** (only after a slug is claimed).
   - Section tabs: buttons **"Profile"**, **"Appearance"**, **"Links"**.
   - Status line: the element with role `status` in the header carries every result message ("Draft saved", "Profile published", validation errors). Read it with `find "status"` after each action.
   - Text inputs sit inside `<label class="field">` and have **no accessible name**; `read_page` lists them by their current value. In the Profile tab they appear in this order: display name, role, bio, evaluation URL (placeholder `https://forms.google.com/…`), then textbox **"Profile slug"**. Replace a value with `triple_click` on the ref, then `type`.
   - Sidebar: **"Export my data"** link, **"Delete account"** button (opens `window.confirm`), **"Sign out"** button.
3. Public page: `$BASE/id/<slug>`. `/id/demo` is a hard-coded sample, not a database profile; do not use it as proof.

**curl (side effects and API-only paths).**

```bash
JAR=$(.claude/skills/verify/bin/session.sh)   # same GET /login/demo the link makes; prints cookie jar path
. .verify-runs/instance.env
curl -sS -b "$JAR" -H "Origin: $BASE" -H 'content-type: application/json' -X PUT -d @body.json "$BASE/api/profile"
```

Every mutation needs `Origin: $BASE` or it returns 403 (`lib/http/mutation-guard.ts`). Each `session.sh` call creates a new session row.

**Database (read-only proof).**

```bash
.claude/skills/verify/bin/d1.sh "SELECT slug, status FROM profiles"
```

Tables: `users`, `sessions`, `profiles`, `draft_social_links`, `published_profiles`, `published_social_links`, `abuse_reports`, `reserved_slugs`. KV (images under `img/…`, report rate limits under `report-rate/<ip>`) is read through the app (`/media/<key>`), not directly.

## Evidence

Write every artifact to `$RUN_DIR` (from `.verify-runs/instance.env`, e.g. `.verify-runs/20261111-111750/`). It survives `stop.sh`; `.gitignore` keeps `.verify-runs/` out of Git.

- Screenshots: the browser tool reports a `source:` path for each screenshot; `cp` it into `$RUN_DIR` with a numbered, descriptive name (`01-publish-blocked.jpg`).
- HTTP: `curl -D "$RUN_DIR/<name>.headers" -o "$RUN_DIR/<name>.html"`.
- DB: `d1.sh "<query>" > "$RUN_DIR/<name>.json"`.
- Server log: `$RUN_DIR/server.log` (request lines with status codes).

Proof standards:

- Drive the real user path: the dashboard buttons, not a direct `fetch` to `/api/profile/publish`. curl is for reading side effects or for paths with no UI.
- Capture the action and the resulting state: the status message after the click, then a second view (the public page as an anonymous visitor, or a D1 row).
- Verify side effects alongside the screen: rows in `published_profiles`, `abuse_reports`, `reserved_slugs`; the image served from `/media/<key>`.
- Prove anonymity separately: fetch `/id/<slug>` with curl and no cookie jar.
- No mocks. Local D1/KV/Images are miniflare's local implementations of the production bindings.

## Cleanup

```bash
.claude/skills/verify/bin/stop.sh
```

Kills only the process tree launch.sh recorded, removes `instance.env`, and prints the kept evidence dir. It never kills by process name.

Local D1 state persists between runs (the demo user's slug stays claimed). To start from an empty database, run `stop.sh`, then `rm -rf .wrangler/state` — only in a checkout where no one else is running the app — then `launch.sh`.

## Feature map

`features/README.md` indexes one recipe per user-facing feature. A proof that drives one entry point is incomplete when the map lists others.
