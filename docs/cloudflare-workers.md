# Preview and deploy on Cloudflare Workers

The app runs on Cloudflare Workers through the OpenNext Cloudflare adapter (`@opennextjs/cloudflare`). It stays on the Workers Free plan: no R2, and nothing that needs billing enrollment.

## Before you start

1. Run `npm install`.
2. Sign in to Cloudflare once: `npx wrangler login`.
3. Create a `.dev.vars` file with `NEXTJS_ENV=development`. Git ignores it.

## Preview locally in the Workers runtime

```bash
npm run preview
```

This builds the app with OpenNext and serves it at `http://localhost:8787` in `workerd`, the same runtime as production. Local D1 and KV data live in `.wrangler/`. For fast UI work, `npm run dev` still runs `next dev`, and `initOpenNextCloudflareForDev()` in `next.config.ts` gives it the same local bindings.

## Deploy

```bash
npm run deploy
```

This builds the app and deploys the `csa-id` Worker to `https://csa-id.<account-subdomain>.workers.dev`. Wrangler prints the compressed upload size. Keep it under the 3 MiB Free plan limit.

## Bindings

`wrangler.jsonc` declares the bindings:

| Binding | Resource | Name |
|---------|----------|------|
| `DB` | D1 database | `csa-id` |
| `KV` | KV namespace | `csa-id` |
| `IMAGES` | Images binding | (none) |

Server code reads them through `lib/cloudflare.ts`:

```ts
import { getBindings } from "@/lib/cloudflare";

const { DB, KV } = getBindings();
```

Use `getBindingsAsync()` in code that runs outside a request, such as at module load or during static generation.

After you change `wrangler.jsonc`, run `npm run cf-typegen` to regenerate `cloudflare-env.d.ts`.

## Images

`next.config.ts` sets `images.unoptimized`. Next.js image optimization on Workers needs the Cloudflare Images binding, which can bill, so `<Image>` serves the original file.

## Google sign-in and the database

Sign-in uses Google OAuth through `oauth4webapi`. Users and Sessions live in D1, with the schema in `lib/db/schema.ts` and migrations in `migrations/`.

Add the OAuth client to `.dev.vars` for local work (git ignores it):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Create the OAuth client in Google Cloud Console with the redirect URI `<origin>/login/google/callback`, for example `http://localhost:8787/login/google/callback` locally and `https://csa-id.yuanmiguelrubio.workers.dev/login/google/callback` deployed. For production, set the same names with `wrangler secret put`.

Change the schema, then generate and apply a migration:

```bash
npm run db:generate
npm run db:migrate:local
```

Apply to the remote database with `npx wrangler d1 migrations apply csa-id --remote`.

Run the tests with `npm test`. They apply the migrations to an in-memory D1 through Miniflare.
