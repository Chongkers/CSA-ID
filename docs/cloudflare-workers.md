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

Server code reads them through `lib/cloudflare.ts`:

```ts
import { getBindings } from "@/lib/cloudflare";

const { DB, KV } = getBindings();
```

Use `getBindingsAsync()` in code that runs outside a request, such as at module load or during static generation.

After you change `wrangler.jsonc`, run `npm run cf-typegen` to regenerate `cloudflare-env.d.ts`.

## Images

`next.config.ts` sets `images.unoptimized`. Next.js image optimization on Workers needs the Cloudflare Images binding, which can bill, so `<Image>` serves the original file.
