# Account data

A User downloads everything stored about them and can delete their account. Deletion removes the profile, links, images, and sessions; the slug stays reserved forever.

## Sub-features

- `export` downloads a JSON file of the User's data.
- `delete` removes the account after a confirm dialog and signs the User out.
- `delete-reserves-slug` keeps the slug unclaimable after deletion.

## How to get to it (user POV)

- Dashboard sidebar link **"Export my data"** (`/api/profile/export`, downloads a file).
- Dashboard sidebar button **"Delete account"**, then confirm the browser dialog.

## Driving it with the browser pane

Preconditions: baseline, signed in. For `delete-reserves-slug`, a claimed slug.

- **Export.** The link triggers a download. Capture the same request with `JAR=$(bin/session.sh)`; `curl -sS -b "$JAR" -o "$RUN_DIR/export.json" $BASE/api/profile/export`; the JSON contains the user email, profile, and links.
- **Delete.** Click **"Delete account"**. The pane must accept the `window.confirm` dialog; if the tool cannot, report the UI path as not driven and send `curl -sS -b "$JAR" -H "Origin: $BASE" -X DELETE $BASE/api/account` (expects `{"ok":true}`), labeled as the API path.
- **Gone.** `/dashboard` redirects to `/login`; `curl $BASE/id/<slug>` returns 404; `bin/d1.sh "SELECT count(*) AS n FROM users"` drops by one.
- **Slug reserved.** `bin/d1.sh "SELECT slug FROM reserved_slugs"` lists the old slug. Sign in again with the demo link (creates a new user) and try to claim the same slug; it is refused.

## Gotchas

- Deletion is destructive to the local demo user; run it last in a session.
- Signing in with the demo link after deletion creates a brand-new user with the seeded profile.
