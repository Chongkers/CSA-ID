# Sign in and session

A User signs in to reach the dashboard; signed-out visitors to `/dashboard` are sent to `/login`. Sign out ends the session.

## Sub-features

- `signin-demo` signs in with the dev-only local account.
- `signin-google` signs in with Google (needs OAuth credentials).
- `signin-guard` redirects signed-out visitors from `/dashboard` to `/login`.
- `signout` deletes the session and returns to `/`.

## How to get to it (user POV)

- Open `/login` and choose **"Use local development account"** (development only).
- Open `/login` and choose **"Continue with Google"**.
- Open `/dashboard` directly while signed out.
- Choose **"Sign out"** in the dashboard sidebar.

## Driving it with the browser pane

Preconditions: baseline.

- **Guard.** Run `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' $BASE/dashboard`. Expect a redirect to `/login`.
- **Demo sign-in.** Navigate to `$BASE/login`, `find "Use local development account"`, click it. URL becomes `/dashboard`; the sidebar shows `Alex Santos` and `local-demo@csa.example`.
- **Session row.** `bin/d1.sh "SELECT count(*) AS n FROM sessions"` increases by one.
- **Sign out.** Click **"Sign out"**. URL becomes `/`. Navigating to `/dashboard` lands on `/login` again, and the session count drops by one.

## Gotchas

- `signin-google` cannot run locally without `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`; clicking shows "Google sign-in needs its client credentials before it can start." Report it as not driven.
- `/login` redirects to `/dashboard` when already signed in, so the demo link is only visible signed out.
- `/login/demo` returns 404 outside `NODE_ENV=development` (`npm run preview` or deployed).
