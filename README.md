# CSA Digital Profile

A virtual business card for the student assistants of the Mapúa University Center for Student Advising. Each student assistant signs in with Google, fills in a Profile, and claims a permanent Slug. Their NFC Card opens the Published Profile at `/id/<slug>`, where a peer advisee sees who they are, their Social Links, and a link to the session evaluation form.

Live site: <https://csa-id.yuanmiguelrubio.workers.dev>

## Stack

- Next.js 16 (App Router), React 19, TypeScript.
- One Cloudflare Worker, built with the OpenNext Cloudflare adapter.
- Cloudflare D1 for data, KV for uploaded images, and the Images binding.
- Google sign-in through `oauth4webapi`, with Sessions stored in D1.
- Cloudflare Workers Free plan only. Nothing in this project may need billing.

## Quickstart

You need Node.js and npm.

```bash
git clone https://github.com/ymsrubio/CSA-ID.git
cd CSA-ID
npm ci
echo "NEXTJS_ENV=development" > .dev.vars
npm run db:migrate:local
npm run dev
```

Open <http://localhost:3000/login> and select **Use local development account**. You can now edit a Profile in the dashboard without Google credentials.

For Google sign-in, the Workers runtime preview, and the checks to run before a pull request, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

| File | What it covers |
|------|----------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Local setup, tickets, branches, commits, pull requests, migrations |
| [GLOSSARY.md](GLOSSARY.md) | Domain terms: User, Profile, Slug, Draft / Published / Suspended Profile, and others |
| [PRODUCT.md](PRODUCT.md) | Who the product is for, its purpose, and its constraints |
| [agent_technical_readme.md](agent_technical_readme.md) | Technical contract: architecture, data model, validation, uploads, routes |
| [docs/cloudflare-workers.md](docs/cloudflare-workers.md) | Bindings, preview, deploy, and Google OAuth setup on Cloudflare |
