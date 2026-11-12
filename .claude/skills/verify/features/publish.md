# Publish and the public page

A User publishes their draft as a public snapshot at `/id/<slug>`, republishes changes, and unpublishes. Anonymous visitors see only the published snapshot; unpublished or unknown slugs show "Profile unavailable".

## Sub-features

- `publish-blocked` refuses to publish without slug, name, role, and evaluation URL.
- `publish-first` publishes a draft; status becomes Published.
- `publish-changes` copies later draft edits to the public page.
- `unpublish` removes public access immediately and keeps the draft.

## How to get to it (user POV)

- Dashboard header **"Publish profile"** (first time) or **"Publish changes"** (when published).
- Dashboard header **"Unpublish"**.
- Visitors open `/id/<slug>` (the NFC card URL), or the dashboard's **"View profile"** / **"Open published profile"** links.

## Driving it with the browser pane

Preconditions: baseline, signed in, slug claimed (see `claim-slug.md`).

- **Blocked.** With the seeded empty evaluation URL, click **"Publish profile"**. `status` reads `Add a permanent address, name, role, and evaluation form before publishing`; badge stays `Not published`.
- **Publish.** Click the evaluation URL textbox (placeholder `https://forms.google.com/…`), type `https://forms.example/eval`, click **"Publish profile"**. `status` reads `Profile published`; button **"Unpublish"** appears; the publish button now reads **"Publish changes"**.
- **Anonymous view.** `curl -sS -D "$RUN_DIR/public.headers" -o "$RUN_DIR/public.html" $BASE/id/verify-alex` returns 200 with the name and role; navigate the pane to the same URL and screenshot.
- **Snapshot row.** `bin/d1.sh "SELECT p.slug,p.status,pp.role,pp.evaluation_url FROM profiles p JOIN published_profiles pp ON pp.profile_id=p.id"` shows `published` and the values.
- **Publish changes.** Change the role, click **"Publish changes"**, and confirm the anonymous curl shows the new role.
- **No RSC from the cache.** Needs `npm run preview` (port 8787) or live, and a cold cache (wait 61 s). Simulate the dashboard's client-side navigation, then a direct visit: `curl -sL -H "RSC: 1" $BASE/id/<slug> >/dev/null; curl -s -D - -o /dev/null $BASE/id/<slug> | grep -i content-type` must print `text/html`, never `text/x-component`. Only live (`https://csa-id.yuanmiguelrubio.workers.dev`, after deploy) can catch a regression: local preview's cache honors `Vary: rsc`, so it served HTML even on the buggy code (2026-11-13).
- **Unpublish.** Click **"Unpublish"**. `status` reads `Profile unpublished`; the anonymous curl returns 404 with `Profile unavailable`; the draft values remain in the dashboard.

## Gotchas

- `/id/demo` is a hard-coded sample page, not a database profile.
- `next dev` bypasses `worker.ts`, so the 60 s edge cache and its purge on unpublish are not exercised; locally unpublish is visible at once. Verify caching with `npm run preview` or on the deployed worker, and use GET (`curl -I` sends HEAD, which the cache ignores). Under `npm run preview` the cache is real: a hit carries `CF-Cache-Status: HIT`.
- Proven on 2026-11-11: publish-blocked, publish-first, anonymous view, snapshot row.
