# Report a profile

Any visitor can report a public profile for impersonation, a malicious link, or prohibited content. Reports are stored for staff review and rate-limited per IP.

## Sub-features

- `report-send` stores a report for an existing slug.
- `report-validate` requires at least five characters of detail.
- `report-rate` rejects a second report from the same IP within 60 seconds.

## How to get to it (user POV)

- On a public page, the link **"Report this profile"**, which opens `/report?profile=<slug>`.

## Driving it with the browser pane

Preconditions: baseline; a published slug (see `publish.md`); no report sent from this machine in the last 60 s.

- **Open.** Navigate to `$BASE/id/<slug>`, `find "Report this profile"`, click it. Heading **"Report this profile"** appears.
- **Send.** Pick a reason in the **Reason** combobox, type at least five characters into the **Details** textbox, click **"Send report"**. `status` reads `Report sent. Thank you for helping keep profiles safe.`
- **Stored.** `bin/d1.sh "SELECT reason,details,status FROM abuse_reports ORDER BY created_at DESC LIMIT 1"` shows the report with status `open`.
- **Rate limit.** Send again at once. `status` reads `Please wait before sending another report`.

## Gotchas

- `/report` without `?profile=` reports the `demo` sample, which stores a report with no profile ID.
- The rate-limit key is `report-rate/local` in KV for every local request; wait 60 s between journeys.
