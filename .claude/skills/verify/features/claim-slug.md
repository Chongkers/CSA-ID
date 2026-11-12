# Claim the profile address

A User claims a permanent Slug that becomes their public URL `/id/<slug>`. Once claimed it is locked and can never change or be reused by anyone else.

## Sub-features

- `slug-claim` claims a valid, free slug and locks the field.
- `slug-invalid` rejects bad shapes (under 3 chars, uppercase, leading or double hyphens).
- `slug-reserved` rejects reserved words such as `admin`, `dashboard`, `login`.
- `slug-taken` rejects a slug that another User holds or that is reserved after deletion.

## How to get to it (user POV)

- Dashboard tab **"Profile"**, textbox **"Profile slug"**, button **"Claim address"**.
- **"Publish profile"** also fails until a slug is claimed.

## Driving it with the browser pane

Preconditions: baseline, signed in, and the demo profile has **no** slug (`bin/d1.sh "SELECT slug FROM profiles"` returns null). If it already has one, this journey cannot run on this database: report it and reset as described in `../SKILL.md` Cleanup.

- **Reserved.** Click textbox **"Profile slug"**, type `admin`, click **"Claim address"**. An `alert` reads `That address is reserved. Please choose another`.
- **Claim.** Clear it, type `verify-alex`, click **"Claim address"**. `status` reads `Permanent address claimed`; the textbox is disabled; the hint reads `This permanent address is locked.`; the header shows link **"View profile"** (`/id/verify-alex`).
- **Persisted.** `bin/d1.sh "SELECT slug FROM profiles"` returns `verify-alex`.

## Gotchas

- The textbox strips characters outside `a-z0-9-` as you type, so typed uppercase never reaches the server. Use curl (`POST /api/profile/slug` with `{"slug":"Bad"}` and the Origin header) to prove server-side rejection.
- **"Claim address"** stays disabled until the slug has 3 characters.
- Claiming is irreversible in the local database too; it is why later runs find the slug already set.
