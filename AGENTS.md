<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CSA Digital Profile: rules for coding agents

This app gives each Mapúa CSA student assistant a Published Profile at `/id/<slug>`, opened from an NFC Card. The repository owner reviews every pull request and merges only work that follows this file. [CONTRIBUTING.md](CONTRIBUTING.md) holds the human procedures (setup, tickets, branches, pull requests); this file holds the rules.

## Before you write code

- Read the ticket in full: `gh issue view <n> --repo ymsrubio/CSA-ID --comments`. Do only what its **Done when** asks; list anything else you notice as a follow-up in the pull request.
- Use the domain terms in [GLOSSARY.md](GLOSSARY.md) (User, Profile, Slug, Draft Profile, Published Profile, Social Link, Abuse Report, NFC Card) in code, tests, commits and issues. Its _Avoid_ words stay out. When a concept you need is missing from the glossary, raise it in the issue instead of coining a new word.
- Read the sections of [agent_technical_readme.md](agent_technical_readme.md) that touch your area. It is the technical contract: architecture, data model, authorization, validation, uploads, routes. When your change contradicts it, say so in the pull request instead of silently diverging.
- [PRODUCT.md](PRODUCT.md) explains who the users are and why the product exists.

## Issues

[CONTRIBUTING.md](CONTRIBUTING.md#pick-up-a-ticket) explains how to find, claim and open tickets, and what the labels mean. On top of that:

- Claim the ticket (assignee plus `in-progress`) before writing code, and post progress notes and questions as dated comments on it.
- A new issue gets a Conventional Commits title, the `needs-triage` label, and a body with three headings: **What**, **Done when** (checkable outcomes), and **Notes**.
- Record a blocker in GitHub's native dependency too: `gh api -X POST repos/ymsrubio/CSA-ID/issues/<n>/dependencies/blocked_by -F issue_id=<blocker's REST id>`.

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

Merging to `main` deploys to the live site, and every preview (including `dev`'s) already runs against the live D1 database. So the owner applies a new migration to the live D1 database **before** the code that needs it merges into `dev`. Write each migration so the code already on `main` and `dev` keeps working after it runs. Mark the migration in the pull request so the owner sees it.

Live systems belong to the owner: agents never run `npm run db:migrate:remote`, `npm run deploy`, `wrangler deploy`, `wrangler secret put`, or any other `--remote` command.

## Checks before a pull request

All four must pass, run from the repository root:

```bash
npm test
npm run lint
npx tsc --noEmit
npx opennextjs-cloudflare build
```

The last one builds the Worker the way production does; a change can pass `next build` and still fail it. GitHub Actions runs the same four as the required **checks** job on every pull request, but run them locally first.

For a change a user can see, also prove it in the running app, locally and on the pull request's preview link. The `verify` skill in [.claude/skills/verify/SKILL.md](.claude/skills/verify/SKILL.md) launches the app, signs in as the local demo User, and drives the dashboard and public page; its `features/` files list what to check per feature. Agents other than Claude Code can read and follow it directly. Put the evidence (screenshots, status messages) in the pull request.

## Branches and releases

- `dev` is the default branch. Branch from the latest `dev` as `<type>/<short-description>` and open the pull request into `dev`. Never target `main`.
- Nobody pushes directly to `main` or `dev`. Every change lands through a pull request with passing checks.
- A release is a pull request from `dev` into `main`, merged with a merge commit (not squash). Only the owner opens and merges it. Merging it deploys to the live site.
- A hotfix takes the same path, just faster: a `fix/...` branch from `dev`, a pull request into `dev`, then a release pull request into `main`.
- Cloudflare Workers Builds uploads a preview of every pull request branch and of `dev`, and posts its link on the **Workers Builds: csa-id** check. Put the preview link and the `verify` evidence in the pull request.

## Previews use the live database

Previews run on the same `csa-id` Worker as the live site and share its D1 database and KV namespace. Anything you do on a preview happens to real data.

- Test on a preview only with your own test accounts and test Profiles.
- Never file an Abuse Report, delete, unpublish or edit a real student assistant's Profile on a preview.
- Never run a destructive request (account deletion, bulk changes, load tests) against a preview.
- Do heavy or destructive testing locally, where D1 and KV live in `.wrangler/`.

## Commits and pull requests

- One ticket per pull request. The body starts with `Closes #<n>` and follows `.github/pull_request_template.md`.
- Commit subjects and the pull request title use Conventional Commits: `<type>(<scope>): <summary>`, imperative, lowercase after the colon, no trailing period. Types and examples are in [CONTRIBUTING.md](CONTRIBUTING.md#commit).
- The owner merges. Agents open the pull request and stop there.

## Files you leave as they are

These belong to the maintainer. Change them only when the ticket asks for it:

- `PRODUCT.md`, `GLOSSARY.md`, `agent_technical_readme.md`.
- The maintainer's tooling folders: `.impeccable/`, `.taste-skill/`, `.codex/`, `.cursor/`, `.gemini/`.
- `cloudflare-env.d.ts` is generated: after changing `wrangler.jsonc`, regenerate it with `npm run cf-typegen`.
