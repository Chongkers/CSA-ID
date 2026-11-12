# CSA Digital Profile verification map

The maintained source for verifying user-facing behavior. Read this index, then follow the matching feature file. Launch, doctor, evidence, and cleanup are in `../SKILL.md`.

## Baseline preconditions

- `bin/launch.sh` printed `ready:` and `bin/doctor.sh` shows no `FAIL`.
- `BASE`, `RUN_DIR` come from `. .verify-runs/instance.env`.
- Signed in through the **"Use local development account"** link on `$BASE/login` (user Alex Santos, `local-demo@csa.example`).
- The demo profile seeds name, role, and bio, with **no** slug, **no** evaluation URL, **no** links, and status `draft`. Local D1 persists across runs, so earlier runs may have claimed a slug or published; check with `bin/d1.sh "SELECT slug,status FROM profiles"` before assuming a fresh state.

## Driving conventions

- Browser pane tools (`find`, `read_page`, `computer` by `ref`). Prefer button and link names, `role=status`, and the `"Profile slug"` textbox. Dashboard text inputs have no accessible name; see `../SKILL.md` Drive for their order.
- After every dashboard action, read the `status` element. It is the app's only success or error signal.
- curl only for anonymous views, side effects, or paths with no UI. Mutations need `-H "Origin: $BASE"`.

## Proof and skip reporting

- Capture the action (status message, screenshot) and a second view (anonymous curl of `/id/<slug>` or a D1 row).
- Name the feature file and entry point used for every artifact in `$RUN_DIR`.
- If a journey cannot run because a precondition is missing, report it as failed with the reason. Do not weaken the journey, and do not count a different entry point as covering the one you skipped.

## Features

- [Sign in and session](./sign-in.md) covers the local demo login, dashboard access, and sign out.
- [Edit the draft](./edit-draft.md) covers profile fields, color, social links, and Save draft.
- [Claim the profile address](./claim-slug.md) covers slug validation, reserved words, and locking.
- [Publish and the public page](./publish.md) covers publish, publish changes, unpublish, and anonymous `/id/<slug>`.
- [Image uploads](./image-uploads.md) covers photo and background upload and rejection.
- [Report a profile](./report-profile.md) covers the public abuse report form.
- [Account data](./account-data.md) covers export and account deletion.
