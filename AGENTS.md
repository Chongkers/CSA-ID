<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CSA Digital Profile: rules for coding agents

This app gives each Mapúa CSA student assistant a Published Profile at `/id/<slug>`, opened from an NFC Card. The repository owner reviews every pull request and merges only work that follows this file. [CONTRIBUTING.md](CONTRIBUTING.md) holds the human procedures (setup, tickets, branches, pull requests); this file holds the rules.

## Before you write code

- Read the ticket in full: `gh issue view <n> --repo ymsrubio/CSA-ID --comments`. Do only what its **Done when** asks; list anything else you notice as a follow-up in the pull request.
- Use the domain terms in [GLOSSARY.md](GLOSSARY.md) (User, Profile, Slug, Draft Profile, Published Profile, Social Link, Abuse Report, NFC Card) in code, tests, commits and issues. Its _Avoid_ words stay out.
- Read the sections of [agent_technical_readme.md](agent_technical_readme.md) that touch your area. It is the technical contract: architecture, data model, authorization, validation, uploads, routes. When your change contradicts it, say so in the pull request instead of silently diverging.
- [PRODUCT.md](PRODUCT.md) explains who the users are and why the product exists.

## Hard constraints

The app is one Cloudflare Worker on the **Workers Free plan**, built with OpenNext (`@opennextjs/cloudflare`). Nothing in it may ever need billing.

- Bindings are fixed in `wrangler.jsonc`: D1 (`DB`), KV for images (`KV`), and the Images binding (`IMAGES`). Server code reads them through `lib/cloudflare.ts`.
- Data lives in D1 through Drizzle (`lib/db/schema.ts`). Uploaded images are re-encoded and stored in KV.
- Sign-in is Google through `oauth4webapi`. Sessions live in D1.
- Adding a Cloudflare resource, a binding, a paid feature, or a new external service needs the owner's approval in the ticket first. That includes R2, Workers Paid, and Supabase, which this project has deliberately left behind.
- Keep the compressed Worker under the Free plan's 3 MiB limit. A new dependency must earn its bundle size.

## Security rules

- Every mutating route calls `guardMutation` from `lib/http/mutation-guard.ts`. It checks the same-origin `Origin` header, the Session, and the body size cap (16 KiB by default, smaller where the route needs less) before parsing JSON. Copy that pattern for any new mutation.
- Owner-scoping: every read or write of a User's data filters on the User ID from the validated Session, never on an ID taken from the request.
- Writes happen only on the server. The browser never sees a binding, secret or token, and never talks to D1 or KV directly. Modules that touch the database or Session import `server-only`.
- Publish, unpublish and account deletion each run as one atomic D1 batch.
- A new owner-data path gets a test proving User A cannot read or change User B's rows.

## Database migrations

Change `lib/db/schema.ts`, then run `npm run db:generate` and `npm run db:migrate:local`, and commit the new files in `migrations/`. `npm test` applies every migration to an in-memory D1.

Merging to `main` deploys at once, so the owner applies a new migration to the live D1 database **before** the code that needs it merges. Write each migration so the code already on `main` keeps working after it runs. Mark the migration in the pull request so the owner sees it.

Live systems belong to the owner: agents never run `npm run db:migrate:remote`, `npm run deploy`, `wrangler deploy`, `wrangler secret put`, or any other `--remote` command.

## Checks before a pull request

All four must pass, run from the repository root:

```bash
npm test
npm run lint
npx tsc --noEmit
npx opennextjs-cloudflare build
```

The last one builds the Worker the way production does; a change can pass `next build` and still fail it. The **Workers Builds** check on a pull request always fails and is expected to; trust the local build.

For a change a user can see, also run the app (`npm run dev`, then **Use local development account** at `/login`) and check the change in the browser.

## Commits and pull requests

- One ticket per pull request. The body starts with `Closes #<n>` and follows `.github/pull_request_template.md`.
- Commit subjects and the pull request title use Conventional Commits: `<type>(<scope>): <summary>`, imperative, lowercase after the colon, no trailing period. Types and examples are in [CONTRIBUTING.md](CONTRIBUTING.md#commit).
- Branch from the latest `main` as `<type>/<short-description>`.
- The owner merges. Agents open the pull request and stop there.

## Files you leave as they are

These belong to the maintainer. Change them only when the ticket asks for it:

- `PRODUCT.md`, `GLOSSARY.md`, `agent_technical_readme.md`.
- The maintainer's tooling folders: `.impeccable/`, `.taste-skill/`, `.codex/`, `.cursor/`, `.gemini/`.
- `cloudflare-env.d.ts` is generated: after changing `wrangler.jsonc`, regenerate it with `npm run cf-typegen`.
