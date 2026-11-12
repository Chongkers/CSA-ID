# Contributing

This guide takes you from a fresh clone to a merged pull request. Read [GLOSSARY.md](GLOSSARY.md) first and use its terms (User, Profile, Slug, Draft Profile, Published Profile, and so on) in issues, commits, code and tests.

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
   echo "NEXTJS_ENV=development" > .dev.vars
   ```

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

Coding agents follow the same rules in [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

## Make the change

### Branch

Branch from the latest `main`. Name the branch `<type>/<short-description>`, with a type from the commit list below:

```bash
git switch main
git pull
git switch -c fix/dashboard-phone-buttons
```

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

**Apply a new migration to the live D1 database before the code that needs it merges.** Merging to `main` deploys the Worker at once. If the code arrives before the schema, the live site breaks. Write migrations so that the code already on `main` still works after the migration runs.

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

### Submit

```bash
git push -u origin HEAD
gh pr create --repo ymsrubio/CSA-ID
```

The pull request template asks for:

- `Closes #<n>`, so merging the pull request closes the ticket.
- A short summary of what changed and why.
- The checklist of checks, plus the live migration if there is one.

Give the pull request a Conventional Commits title, because it becomes the commit subject on `main`.

### Review and merge

The repository owner reviews each pull request. Pull requests are squash-merged into `main`, and the branch is deleted after the merge.

Merging to `main` deploys the Worker through Cloudflare Workers Builds. The Workers Builds check on a pull request is expected to fail and does not block a merge. Rely on the local `npx opennextjs-cloudflare build` instead.

## Where to read more

- [README.md](README.md): what the app is, and the quickstart.
- [PRODUCT.md](PRODUCT.md): users, purpose, and constraints.
- [agent_technical_readme.md](agent_technical_readme.md): architecture, data model, validation, uploads, and routes.
- [docs/cloudflare-workers.md](docs/cloudflare-workers.md): bindings, preview, deploy, and OAuth on Cloudflare.
