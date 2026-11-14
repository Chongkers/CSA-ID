# Contributing

This guide takes you from a fresh clone to a merged pull request. Read [GLOSSARY.md](GLOSSARY.md) first and use its terms (User, Profile, Slug, Draft Profile, Published Profile, and so on) in issues, commits, code and tests.

If you work with an AI coding agent (Claude Code, Codex, Cursor, Copilot, Gemini or another), point it at [AGENTS.md](AGENTS.md). It holds the project's rules for agents, and the owner reviews agent work against it.

## Set up your machine

You need Node.js, npm, Git, and the [GitHub CLI](https://cli.github.com/) (`gh`).

1. Clone the repository and install the exact locked dependencies:

   ```bash
   git clone https://github.com/ymsrubio/CSA-ID.git
   cd CSA-ID
   npm ci
   ```

2. Create `.dev.vars` for local secrets. Git ignores it.

   ```bash
   cat > .dev.vars <<'EOF'
   NEXTJS_ENV=development
   TURNSTILE_SITE_KEY=1x00000000000000000000AA
   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
   EOF
   ```

   The two Turnstile lines are Cloudflare's always-pass test keys. The real site key in `wrangler.jsonc` only works on the deployed hostname, and `.dev.vars` overrides it locally. Without them the report form cannot send a report.

3. Create the local D1 database and apply the migrations in `migrations/`. The data lives in `.wrangler/`, which Git ignores.

   ```bash
   npm run db:migrate:local
   ```

You don't need a Cloudflare account for local work. Wrangler runs D1 and KV on your machine.

## Run the app

### Next.js dev server

```bash
npm run dev
```

Open <http://localhost:3000/login> and select **Use local development account**. It signs you in as a demo User with a Draft Profile, so you can work on the dashboard without Google credentials. This link exists only in the dev server.

### Workers runtime preview

```bash
npm run preview
```

This builds the Worker with OpenNext and serves it at <http://localhost:8787> in `workerd`, the same runtime as production. It is a production build, so the local development account is not available. Use it to check behavior that differs on Workers.

### Google sign-in (optional)

To test real Google sign-in locally, create an OAuth web client in Google Cloud Console and add these lines to `.dev.vars`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Set the client's redirect URI to `<origin>/login/google/callback`, for example `http://localhost:8787/login/google/callback`. See [docs/cloudflare-workers.md](docs/cloudflare-workers.md) for more about bindings and OAuth.

## Pick up a ticket

Tickets are GitHub issues on `ymsrubio/CSA-ID`.

### Find a free ticket

A ticket is free when it is open, has no assignee, and has no open blocker. A ticket with open blockers ends its title with them, for example `feat(admin): review reports and suspend Profiles (blocked by #9)`.

```bash
gh issue list --repo ymsrubio/CSA-ID --search "no:assignee"
```

Start with the lowest number that is free. Read the whole ticket before you start:

```bash
gh issue view <n> --repo ymsrubio/CSA-ID --comments
```

### Labels

| Label | Meaning |
|-------|---------|
| `needs-triage` | New. The repository owner has not reviewed it yet. |
| `needs-info` | Waiting on more information. |
| `ready-for-agent` | Fully specified. A coding agent can do it without help. |
| `ready-for-human` | Needs a person to implement it. |
| `wontfix` | Will not be done. |
| `in-progress` | Claimed. Someone is working on it. |

Pick tickets labelled `ready-for-agent` or `ready-for-human`. Leave `needs-triage` and `needs-info` tickets until the owner triages them.

### Claim it

Assign yourself and add `in-progress` before you write code, so nobody else starts the same work:

```bash
gh issue edit <n> --repo ymsrubio/CSA-ID --add-assignee @me --add-label in-progress
```

Post progress notes or questions as comments on the issue.

### Open a new ticket

Use **New issue** on GitHub and pick the **Feature** or **Bug** form. Each form adds the `needs-triage` label. A ticket has three parts: **What**, **Done when**, and **Notes**. Write the title in Conventional Commits style, such as `feat: claim a permanent Slug`.

When other tickets block yours, record the blockers in three places:

- A `Blocked by: #5` line at the top of the body.
- A title suffix: `feat: claim a permanent Slug (blocked by #5)`. Remove the suffix when every blocker is closed.
- GitHub's native **Blocked by** relationship on the issue.

## Make the change

### Branch

`dev` is the default branch. Branch from the latest `dev`. Name the branch `<type>/<short-description>`, with a type from the commit list below:

```bash
git switch dev
git pull
git switch -c fix/dashboard-phone-buttons
```

Nobody pushes directly to `dev` or `main`. Every change reaches them through a pull request.

### Commit

Write every commit subject in [Conventional Commits](https://www.conventionalcommits.org/) style: `<type>: <summary>`, or `<type>(<scope>): <summary>`.

| Type | Use for |
|------|---------|
| `feat` | New or changed behavior a user can see |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Restructured code with the same behavior |
| `test` | Tests only |
| `perf` | A performance improvement |
| `style` | Formatting only |
| `build` | Build system, dependencies, deploy config |
| `ci` | CI configuration |
| `chore` | Anything else outside source and tests |

Write the summary in the imperative mood, lowercase after the colon, with no trailing period, in about 72 characters. If the change breaks something, add `!` after the type and a `BREAKING CHANGE:` line in the body. Examples:

- `feat(profile): claim the Slug on its own`
- `fix(account): delete the account in one atomic D1 batch`

### Change the database schema

The schema is in `lib/db/schema.ts`. After you change it, generate a migration and apply it to your local database:

```bash
npm run db:generate
npm run db:migrate:local
```

Commit the new files in `migrations/`. `npm test` applies every migration to an in-memory D1, so the tests run against the new schema.

**Apply a new migration to the live D1 database before the code that needs it merges into `dev`.** Previews of `dev` and of every pull request already run against the live D1 database, and a release to `main` deploys the live site. If the code arrives before the schema, the preview or the live site breaks. Write migrations so that the code already on `main` and `dev` still works after the migration runs.

Only people with access to the Cloudflare account can change the live database. Ask the repository owner to apply it, or, if you have access:

```bash
npx wrangler login
npx wrangler d1 migrations list csa-id --remote
npm run db:migrate:remote
```

The `list` command shows which migrations the live database has not applied yet.

### Stay on the free plan

The project runs on the Cloudflare Workers Free plan and must never need billing. Don't add R2, paid Workers features, paid add-ons, or any service that asks for a payment method. Keep the compressed Worker under the Free plan's 3 MiB limit. If your change needs a new Cloudflare resource, ask the repository owner in the issue before you add it.

## Open a pull request

### Run the checks

Run all four checks before you open a pull request. Each one must pass.

```bash
npm test
```

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npx opennextjs-cloudflare build
```

The last command builds the Worker the way production does. A change can pass `next build` and still fail here.

GitHub Actions runs the same four checks as the **checks** job on every pull request. A pull request can't merge until it passes.

### Submit

Open the pull request into `dev`:

```bash
git push -u origin HEAD
gh pr create --repo ymsrubio/CSA-ID --base dev
```

The pull request template asks for:

- `Closes #<n>`, so merging the pull request closes the ticket.
- A short summary of what changed and why.
- The preview link and proof that the change works there.
- The checklist of checks, plus the live migration if there is one.

### Test on the preview

Cloudflare Workers Builds builds every pull request branch and uploads it as a preview of the `csa-id` Worker. When it finishes, the **Workers Builds: csa-id** check on the pull request links to the build, and Cloudflare comments the preview URL on the pull request. Open it and check your change there, because some bugs only show on Cloudflare's real edge. Put the link and your evidence (screenshots, what you checked) in the pull request.

**The preview uses the live database.** It runs on the same Worker as the live site and shares its D1 database and KV namespace, so everything you do there changes real data:

- Use only your own test accounts and test Profiles.
- Never file an Abuse Report, delete, unpublish or edit a real student assistant's Profile.
- Never run account deletion, bulk changes or load tests against a preview. Do that locally.

Google sign-in and the report form's Turnstile check may not work on a preview URL, because Google and Turnstile only accept the hostnames registered for the live site. Test signed-in flows locally with the local development account.

Give the pull request a Conventional Commits title, because it becomes the commit subject on `main`.

### Review and merge

The repository owner reviews each pull request. Pull requests are squash-merged into `dev`, and the branch is deleted after the merge. After the merge, `dev` gets its own preview.

### Releases

Only the owner ships to the live site:

1. Open a pull request from `dev` into `main`, titled like `chore: release 2026-11-14`, listing the pull requests it ships.
2. Check `dev`'s preview once more and wait for the **checks** job to pass.
3. Merge with **Create a merge commit**, not squash, so `dev` and `main` keep the same history.

Merging into `main` deploys the Worker to the live site through Cloudflare Workers Builds.

### Hotfixes

A hotfix takes the same path, just faster. Branch `fix/...` from `dev`, open a pull request into `dev`, check the preview, merge, then open the release pull request from `dev` into `main` right away.

## Where to read more

- [README.md](README.md): what the app is, and the quickstart.
- [AGENTS.md](AGENTS.md): the rules a coding agent follows in this repository.
- [PRODUCT.md](PRODUCT.md): users, purpose, and constraints.
- [agent_technical_readme.md](agent_technical_readme.md): architecture, data model, validation, uploads, and routes.
- [docs/cloudflare-workers.md](docs/cloudflare-workers.md): bindings, preview, deploy, and OAuth on Cloudflare.
