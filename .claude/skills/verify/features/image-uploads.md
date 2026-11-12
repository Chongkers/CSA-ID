# Image uploads

A User uploads a profile photo and a background. The server sanitizes each image (re-encodes to WebP, strips metadata, resizes) and stores only the derivative in KV, served from `/media/<key>`.

## Sub-features

- `upload-avatar` accepts JPEG, PNG, WebP up to 2 MB; output 400×400 WebP.
- `upload-background` accepts the same types up to 4 MB; output fits 1920×1080.
- `upload-reject` rejects GIF, SVG, animated images, broken files, and oversize files with a status message.

## How to get to it (user POV)

- Dashboard tab **"Profile"**, button **"Choose photo"**.
- Dashboard tab **"Appearance"**, button **"Choose background"**.

## Driving it with the browser pane

Preconditions: baseline, signed in. Fixtures live in `tests/fixtures/` (`plain.png`, `wide.jpg`, `still.webp`, `gps.jpg`, `anim.gif`, `animated.webp`, `vector.svg`, `broken.jpg`, `huge.png`).

- **UI path.** The buttons open a native file dialog through a hidden `<input type="file">`. The built-in browser pane cannot fill it. Use Claude in Chrome's `file_upload` on that input if available. In the built-in pane, hand the input a file with `javascript_tool`: draw a canvas, `toBlob` it to PNG, put it in a `DataTransfer`, set `input.files`, and dispatch `change`. The component's own upload code then runs (status `Photo uploaded`, preview updates). Label this "picker bypassed, upload code driven".
- **Same request, by curl.** `JAR=$(bin/session.sh)`; `curl -sS -b "$JAR" -H "Origin: $BASE" -F file=@tests/fixtures/plain.png $BASE/api/uploads/avatar` returns `{"ok":true,"url":"/media/img/…/avatar/….webp"}`. Label this as the API path, not the UI path.
- **Stored derivative.** `curl -sS -o "$RUN_DIR/avatar.webp" -w '%{content_type}' $BASE<url>` returns `image/webp`; `file "$RUN_DIR/avatar.webp"` shows 400×400. `bin/d1.sh "SELECT avatar_key FROM profiles"` matches the key.
- **Metadata stripped.** Upload `gps.jpg`; the stored WebP has no EXIF/GPS (`exiftool` or `strings | grep -i gps` finds nothing).
- **Reject.** Upload `anim.gif`; response is 415 with `GIF files are not accepted…`.

## Gotchas

- Local uploads go through miniflare's Images binding; locally verified on 2026-11-11 that `plain.png` returns a `/media/…webp` URL.
- Reload the dashboard after a curl upload to see the new photo in the preview.
