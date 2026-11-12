# Edit the draft

A User edits their Draft Profile (name, role, bio, evaluation URL, color, social links) and saves it. Edits stay private until published; the live preview pane updates as they type.

## Sub-features

- `draft-fields` saves name, role, bio, evaluation URL.
- `draft-color` saves the profile accent color.
- `draft-links` adds, changes, and removes up to eight social links, one per platform.
- `draft-validate` rejects invalid input with a status message.

## How to get to it (user POV)

- Dashboard tab **"Profile"**, then **"Save draft"**.
- Dashboard tab **"Appearance"** (color picker and hex textbox), then **"Save draft"**.
- Dashboard tab **"Links"**, **"Add social link"**, then **"Save draft"**.
- **"Publish profile"** also saves the draft first.

## Driving it with the browser pane

Preconditions: baseline, signed in, on `/dashboard`.

- **Fields.** In tab **"Profile"**, `read_page` with `filter: interactive`; the textboxes are listed by current value (name, role, bio, then the evaluation URL with placeholder `https://forms.google.com/…`). `triple_click` the role ref and type `Verified tutor`.
- **Links.** Click **"Links"**, then **"Add social link"**. A combobox `Link 1 platform` and a textbox `LinkedIn URL` appear. Type `https://linkedin.com/in/alex` into it.
- **Save.** Click **"Save draft"**. `status` reads `Draft saved`.
- **Persisted.** Reload `/dashboard`; the values are still there. `bin/d1.sh "SELECT role FROM profiles"` and `bin/d1.sh "SELECT service,url FROM draft_social_links"` show them.
- **Still private.** If the profile was never published, `curl $BASE/id/<slug>` stays 404; if published, it still shows the old values until **"Publish changes"**.
- **Validation.** Enter `http://linkedin.com` (not https) or an empty name and save. `status` shows the server's error (for the http link: `Use the official HTTPS address for each social platform`; server log `PUT /api/profile 400`) and the D1 row is unchanged.

## Gotchas

- Text inputs have no accessible name; locate them by order or value, not by label.
- The live preview card always shows LinkedIn, Facebook, and Instagram chips regardless of the draft's links (hard-coded in `components/profile-card.tsx`). Do not use the preview as proof of links; use D1 or the published page.
- Remove links you added if a later journey expects the seeded no-links state.
