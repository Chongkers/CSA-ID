# Digital Profile System - Agent Technical README

This document is the implementation contract for the public Digital Profile and its management dashboard. Use the canonical domain language in [`GLOSSARY.md`](./GLOSSARY.md).

## 1. Product Boundary

The product is a public identity page that can optionally be opened from an NFC card. NFC is an access method, not a managed domain entity.

- One Google-authenticated **User** owns exactly one **Profile**.
- A Profile has one permanent **Slug** and public URL: `/id/<slug>`.
- Registration is open to any eligible Google user; there is no invitation allowlist.
- The system does not register, activate, transfer, revoke, or inventory NFC cards.
- A physical NFC card contains only the Profile URL and is programmed separately with a phone application.
- Published content is user-provided and is not identity-verified.

### Lifecycle

Profiles use explicit states:

- `draft`: visible only to the owner.
- `published`: the current published snapshot is publicly readable.
- `suspended`: unavailable publicly because an Administrator intervened.

Edits change the Draft Profile only. Publishing validates and copies the complete draft into a separate immutable-at-rest published snapshot. Unpublishing immediately removes public access while retaining the draft. A publish may take up to 60 seconds to become visible at every cache location.

The Slug becomes permanent as soon as it is chosen. Deleted, suspended, and unpublished Slugs remain reserved so an old NFC card can never resolve to a different person.

## 2. Non-Negotiable Constraints

### Zero-billing operation

The deployed system must not depend on automatic paid overages.

- Prefer hard quota failure, degraded service, or temporary downtime over charges.
- Reject uploads and writes before application-level quotas are exceeded.
- Existing public pages should remain available from cache when dashboard or database services are restricted.
- Free-tier availability, pricing, and quotas can change. Recheck official provider documentation before every production deployment.
- The service has no commercial uptime guarantee.

“Free” does not mean unlimited. The initial target is 100-1,000 registered users and tens of thousands of monthly public-page views.

### Current domain constraint

No custom domain is currently available. Treat all provider URLs, including the `workers.dev` hostname, as temporary:

- Keep every NFC card rewritable.
- Never lock a card read-only while it contains a provider-owned hostname.
- Move to a stable custom domain before treating NFC URLs as permanent.
- Revisit production Google OAuth domain requirements before public launch.

## 3. Approved Architecture

| Responsibility | Service | Required behavior |
| --- | --- | --- |
| Web application | Next.js App Router on Cloudflare Workers Free through the OpenNext Cloudflare adapter (`@opennextjs/cloudflare`) | Static-first public pages; dynamic authenticated dashboard; compressed Worker bundle within the Free plan size limit |
| Database | Cloudflare D1 Free (SQLite), accessed only through Drizzle ORM | Schema and migrations in Drizzle; authorization enforced in server code (see section 5) |
| Authentication | Google OIDC through Arctic, with server-side Sessions stored in D1 | Request only `openid`, `email`, and `profile`; no third-party auth service |
| Image storage | Workers KV Free | Store sanitized derivatives only; never store original uploads |
| Upload sanitization | Cloudflare Workers Free with the Images Free binding | Decode, resize, strip metadata, and re-encode before storage |
| Abuse challenge | Cloudflare Turnstile when risk signals trigger | Protect signup-adjacent and upload/report endpoints |
| Styling | Tailwind CSS plus validated CSS variables | Fixed layouts and allowlisted theme fields only |

Everything runs in one Worker with D1 and KV bindings. The bindings exist only inside the Worker; no database or storage credential is ever sent to the browser, and the browser never talks to D1 or KV directly.

Do not use Cloudflare R2: it requires billing enrollment and permits usage charges. Do not enable Workers Paid or any other plan that bills for overages. Do not make Vercel Hobby the production dependency for an open or potentially commercial service.

Cloudflare Images storage is not part of this architecture. Use only the free Images transformation binding and save its sanitized output to Workers KV. When the transformation quota or the KV write quota is exhausted, new uploads must fail clearly while existing assets continue to work.

D1 and KV Free quotas (rows read and written per day, KV reads and writes per day, storage size) are hard limits that fail requests rather than bill. Design reads so public traffic is served mostly from cache, and recheck the current limits in Cloudflare's documentation before every production deployment.

## 4. Authentication

### Google login

- Implement the Google OAuth authorization-code flow with Arctic, using `state` and PKCE.
- Request only the `openid`, `email`, and `profile` scopes.
- Verify the ID token claims (issuer, audience, expiry) and require `email_verified`.
- Identify a User by Google's subject ID (`sub`), never by email address.
- Do not implement passwords or magic links in v1.
- Store no Google access token, refresh token, or ID token. Discard them once the callback has read the claims.
- Treat Google login as proof of control of a Google identity, not proof that Profile claims are genuine.
- Ask before copying the Google display name or avatar into the Draft Profile.
- Require confirmation that the User is at least 18.
- Require acceptance of the current Terms version before first publication; record its version and timestamp.

### Sessions

Sessions are implemented in application code and stored in D1.

- On sign-in, generate a session token from at least 32 cryptographically random bytes.
- Send the token only in a cookie marked `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
- Store only the SHA-256 hash of the token in the `sessions` table, with an expiry timestamp. A leaked database row must not be usable as a cookie.
- Validate a request by hashing the cookie value and looking up an unexpired row. Treat a missing, expired, or unknown token as signed out.
- Renew the expiry (sliding expiration) when a valid Session is used after half its lifetime has passed.
- Sign-out deletes the Session row and clears the cookie.
- Account deletion and administrative revocation delete every Session row of the affected User.

## 5. Authorization

D1 has no Row Level Security. Authorization is enforced in server code, and every query must follow the owner-scoping rule:

> **Owner-scoping rule:** every read or write of owner data is scoped to the User ID taken from the validated Session, never to an ID taken from the request. Owner tables filter on `user_id = <session user>`; child tables reach the owner through a join on `profiles.user_id`.

Enforce the rule through structure, not reviewer attention:

- Put all D1 access in one server-only data-access module. Route handlers, Server Actions, and Server Components call its functions and never import the Drizzle client directly.
- Owner-data functions take the authenticated User (as returned by the session check) as their first argument and apply the `user_id` filter inside the function. They accept no `user_id` or `profile_id` from the caller's request input.
- Public reads go through one function that looks up a Published Profile by Slug and returns a result only when the parent Profile's status is `published`.
- Administrative functions are separate, check the Administrator allowlist themselves, and write an audit entry in the same batch as the action.
- Writes to the Published Profile snapshot, Abuse Reports, and the audit log happen only in narrow server functions (publish, unpublish, report, suspend, delete). No generic update path reaches them.
- Every owner-data function has a test proving that User A cannot read or change User B's rows or images.

Rules the data-access layer enforces:

- A User may read and update only their own Profile, Draft Profile fields, and Draft Social Links.
- Anonymous visitors may read only a Published Profile and its Published Social Links when the parent Profile is `published`.
- Publication and unpublication execute server-side as one atomic D1 batch.
- Administrative authorization comes from a server-controlled allowlist of Google subject IDs, stored in Worker configuration. It never comes from Profile data or client-editable claims.
- The D1 and KV bindings, the Google client secret, and the Turnstile secret stay in the Worker and must never be exposed to the browser.

## 6. Data Model

Use relational columns and tables for fields that require validation or ordering. Do not replace this model with unrestricted theme or social-link JSON.

Define the schema in Drizzle (`sqliteTable`) and generate migrations with `drizzle-kit`; apply them to D1 with `wrangler d1 migrations apply`. The SQL below is the baseline the migrations must produce. Add indexes, check constraints, and triggers in the same migration rather than relying on application validation alone.

SQLite conventions used here:

- IDs are `text` UUIDs generated by the server (`crypto.randomUUID()`).
- Timestamps are `integer` Unix epoch seconds.
- Enumerations are `text` columns with `check (... in (...))`.
- Booleans are `integer` 0 or 1.
- SQLite has no regular expressions in D1, so format checks use `length` and `glob`. The server-side Zod validation in section 7 remains the full rule.
- D1 enforces foreign keys.

```sql
create table users (
  id text primary key,
  google_sub text not null unique,
  email text not null,
  age_confirmed_at integer,
  created_at integer not null default (unixepoch())
);

create table sessions (
  token_hash text primary key,          -- SHA-256 hex of the cookie token
  user_id text not null references users(id) on delete cascade,
  expires_at integer not null,
  created_at integer not null default (unixepoch())
);

-- Outlives every Profile so a Slug can never be reused.
create table reserved_slugs (
  slug text primary key check (
    length(slug) between 3 and 64
    and slug not glob '*[^a-z0-9-]*'
    and slug not glob '-*'
    and slug not glob '*-'
  ),
  reserved_at integer not null default (unixepoch())
);

create table profiles (
  id text primary key,
  user_id text not null unique references users(id) on delete cascade,
  slug text unique references reserved_slugs(slug), -- format checked on reserved_slugs
  status text not null default 'draft'
    check (status in ('draft', 'published', 'suspended')),

  -- Editable draft fields
  display_name text not null default '' check (length(display_name) <= 128),
  role_title text not null default '' check (length(role_title) <= 128),
  bio text not null default '' check (length(bio) <= 500),
  avatar_key text,
  background_key text,
  layout_key text not null default 'classic'
    check (layout_key in ('classic', 'minimal', 'bold')),
  primary_color text not null default '#2563eb'
    check (primary_color glob '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  accent_color text not null default '#7c3aed'
    check (accent_color glob '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),

  terms_version text,
  terms_accepted_at integer,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch())
);

create table draft_social_links (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  service text not null
    check (service in ('linkedin', 'instagram', 'facebook', 'github', 'website')),
  url text not null check (url glob 'https://*'),
  display_order integer not null check (display_order between 0 and 9),
  enabled integer not null default 1 check (enabled in (0, 1)),
  unique (profile_id, service),
  unique (profile_id, display_order)
);

-- A separate snapshot prevents draft edits from leaking publicly.
create table published_profiles (
  profile_id text primary key references profiles(id) on delete cascade,
  slug text not null unique references reserved_slugs(slug),
  display_name text not null,
  role_title text not null,
  bio text not null,
  avatar_key text,
  background_key text,
  layout_key text not null,
  primary_color text not null,
  accent_color text not null,
  published_at integer not null default (unixepoch())
);

create table published_social_links (
  id text primary key,
  profile_id text not null references published_profiles(profile_id) on delete cascade,
  service text not null
    check (service in ('linkedin', 'instagram', 'facebook', 'github', 'website')),
  url text not null check (url glob 'https://*'),
  display_order integer not null check (display_order between 0 and 9),
  unique (profile_id, service),
  unique (profile_id, display_order)
);

create table abuse_reports (
  id text primary key,
  profile_id text references profiles(id) on delete set null,
  slug text not null references reserved_slugs(slug),
  category text not null check (length(category) <= 32),
  details text not null default '' check (length(details) <= 1000),
  reporter_contact text check (length(reporter_contact) <= 320),
  created_at integer not null default (unixepoch()),
  resolved_at integer
);

-- Append-only; actor and target are plain values so entries survive account deletion.
create table admin_audit_log (
  id text primary key,
  actor_google_sub text not null,
  action text not null
    check (action in ('suspend', 'unsuspend', 'remove_images', 'resolve_report')),
  target_profile_id text not null,
  target_slug text,
  reason text not null check (length(reason) between 1 and 1000),
  created_at integer not null default (unixepoch())
);

create index sessions_user_id_idx on sessions(user_id);
create index sessions_expires_at_idx on sessions(expires_at);
create index abuse_reports_unresolved_idx
  on abuse_reports(created_at)
  where resolved_at is null;
create index admin_audit_log_target_idx on admin_audit_log(target_profile_id);
```

`profiles.user_id` and `published_profiles.slug` are already indexed by their `unique` constraints.

### Required triggers and server operations

Implement and test these in migrations or in the data-access module:

1. `updated_at` trigger on `profiles` (`after update ... set updated_at = unixepoch()`).
2. Slug immutability trigger: `before update of slug on profiles` that raises an error unless the old value is `NULL`. A Slug can be chosen once and never changed.
3. Slug claim: one D1 batch that inserts into `reserved_slugs` and then sets `profiles.slug`. The `reserved_slugs` primary key makes two concurrent claims produce exactly one winner. Account deletion never deletes from `reserved_slugs`.
4. Append-only audit log: `before update` and `before delete` triggers on `admin_audit_log` that raise an error.
5. Publish: the server loads the owner's Profile and Draft Social Links, verifies age confirmation, accepted Terms, required fields, link validity, a chosen Slug, and that the status is not `suspended`. It then runs one D1 batch that deletes and re-inserts the `published_profiles` row and its `published_social_links`, and updates the status to `published` with a `where status != 'suspended'` guard. D1 batches are atomic; D1 has no interactive transactions, so every check that must hold at write time is repeated as a `where` guard in the batch.
6. Unpublish: one D1 batch that changes status to `draft` (`where status = 'published'`) and deletes the `published_profiles` row, which cascades to its links. The draft is kept.
7. Expired Session cleanup: delete rows where `expires_at < unixepoch()`, either on a Cron Trigger or opportunistically during sign-in.

No client-reachable endpoint may write to `published_profiles`, `published_social_links`, `abuse_reports`, or `admin_audit_log` except through the narrow server operations for publication, reports, suspension, export, and deletion.

## 7. Validation Rules

Apply equivalent Zod validation on the server and constraints in the database where practical.

### Profile

- `display_name`: 1-128 trimmed characters.
- `role_title`: 0-128 trimmed characters.
- `bio`: 0-500 characters.
- `slug`: lowercase ASCII letters, digits, and internal hyphens; 3-64 characters; blocked-name list required.
- `layout_key`: fixed allowlist only.
- colors: six-digit hexadecimal values only.
- arbitrary HTML, CSS, JavaScript, embeds, and custom components are unsupported.

### Social Links

- HTTPS only.
- Maximum ten links; one per supported service.
- LinkedIn, Instagram, Facebook, and GitHub URLs must match an allowlisted canonical hostname for that service.
- `website` may use any syntactically valid public HTTPS URL.
- Reject credentials in URLs, localhost, private/reserved IP targets, and misleading Unicode hostnames.
- Render external links with safe browser attributes and show the destination hostname.

## 8. Image Upload Pipeline

Treat every upload as hostile. The browser never writes original files directly to public storage.

### Accepted input

- JPEG, PNG, or non-animated WebP only.
- Avatar input: at most 2 MB.
- Background input: at most 4 MB.
- Reject SVG, GIF, video, animated WebP, malformed files, and excessive pixel dimensions.
- Each Profile has at most one avatar and one background.

### Required flow

1. Authenticate the User and verify Profile ownership.
2. Apply per-user and per-IP rate limits; invoke Turnstile when risk signals trigger.
3. Reject missing or excessive `Content-Length`, and enforce the limit again while streaming.
4. Inspect decoded type, animation state, dimensions, and total pixel area with the Cloudflare Images binding.
5. Fully decode and re-encode without metadata:
   - avatar: crop to at most `400x400`, WebP;
   - background: fit within `1920x1080`, WebP.
6. Store only the re-encoded bytes in Workers KV under a new versioned, owner-scoped key, for example `img/<profile_id>/avatar/<random-version>.webp`, with the content type in the KV metadata.
7. Update the Draft Profile's `avatar_key` or `background_key` to the new key, scoped to the owner.
8. Delete the replaced KV key after the D1 update succeeds, unless the current Published Profile still references it; in that case delete it when the next publish, unpublish, or account deletion releases it.

Serve images from a Worker route that reads the key from KV and returns it with `Cache-Control: public, max-age=31536000, immutable`. Because every replacement writes a new key, a cached URL never shows a different image. A key that is not found returns a short-lived 404 and is never cached as immutable.

Never retain the source upload. If the Images transformation quota or the KV write quota is exhausted, return a clear quota error and leave the existing asset unchanged.

## 9. Route Responsibilities

### `GET /id/[slug]`

- Public and authentication-free.
- Read only from the Published Profile snapshot.
- Return a neutral unavailable page for missing, draft, suspended, or deleted Profiles; do not reveal which state applies.
- Emit `noindex, nofollow` until discoverability becomes an explicit opt-in feature.
- Clearly label content as user-provided and expose a report-abuse link.
- Cache at the edge with a target propagation delay of at most 60 seconds.
- Target a Lighthouse performance score above 95 on mobile and a warm-cache TTFB below 200 ms.

### `GET /login/google` and `GET /login/google/callback`

- Start the Arctic authorization-code flow with `state` and PKCE, storing both in short-lived `HttpOnly` cookies.
- On callback, verify `state`, exchange the code, validate the ID token claims, and require `email_verified`.
- Find or create the User by Google subject ID, create a Session, set the session cookie, and redirect to the dashboard.
- Discard the Google tokens; never write them to D1, KV, logs, or cookies.

### `POST /logout`

- Delete the Session row and clear the cookie.

### `GET /dashboard`

- Require a valid Session; redirect to the login page when it is missing, expired, or unknown.
- Create one Draft Profile on first login if none exists.
- Let the User edit and preview draft fields without changing the Published Profile.
- Make Publish, Unpublish, Export JSON, and Delete Account explicit actions.
- Show publication status and the possible 60-second propagation period.

### Server mutation endpoints

- Validate origin, authentication, authorization, rate limit, and body size before parsing the full body.
- `POST /api/profile/publish`: execute the atomic publish batch and trigger cache invalidation.
- `POST /api/profile/unpublish`: remove public availability immediately and invalidate cache.
- `POST /api/uploads/avatar` and `/background`: execute the sanitization pipeline.
- `POST /api/reports`: apply abuse controls and create an Abuse Report from server code.
- `GET /api/profile/export`: return the User's Profile and Social Links as JSON.
- `DELETE /api/account`: unpublish immediately, delete every Session, keep the Slug in `reserved_slugs`, and delete the User's D1 rows and KV images. Deleting the `users` row cascades to Sessions, the Profile, and its Social Links. KV deletion must be retryable so a partial failure cannot leave orphaned images.

## 10. Administration and Abuse Handling

- The initial Administrator is the project owner.
- Profiles display no verification badge.
- The Administrator can review reports, suspend a Profile, and remove its public images.
- Suspension retains ownership and the reserved Slug.
- Record administrative actions in the append-only `admin_audit_log` table containing actor, action, target, timestamp, and reason, written in the same D1 batch as the action.
- Removing public images deletes their KV keys and clears the matching keys on the Profile and Published Profile.
- Terms must prohibit impersonation, malicious links, illegal material, harassment, and infringement.

## 11. Caching and Failure Behavior

- Use versioned immutable image keys with long-lived cache headers.
- Cache Published Profile output; never cache authenticated dashboard responses publicly.
- Publishing and unpublishing must invalidate the affected Slug.
- If D1 or KV is unavailable or over quota, serve a valid cached public response where available and fail dashboard writes safely.
- If a free quota is exhausted, return a specific user-facing error; never retry in a way that creates an unbounded cost or request loop.
- Keep deployment portable enough to replace a free-tier provider whose terms change: keep D1 access behind the data-access module and Drizzle schema, and image storage behind one small storage interface.

## 12. NFC Encoding

- Chip: NTAG215 or any tag with enough capacity for the final URL.
- Record: NDEF URI.
- Payload: `https://<stable-domain>/id/<slug>`.
- Program cards outside this system with an NFC-writing phone application.
- Keep cards writable while using a temporary provider hostname.
- Lock a card read-only only after a custom domain is controlled, routing is tested, and the Slug is final.

## 13. Completion Checklist

An implementation is incomplete until all applicable checks pass:

- [ ] Google (through Arctic) is the only v1 authentication method; no Google access, refresh, or ID tokens are persisted.
- [ ] Sessions store only a token hash in D1; expired, tampered, and signed-out Session cookies are rejected.
- [ ] The app builds and runs on Cloudflare Workers Free through OpenNext, within the Free plan bundle size limit, with no R2 or paid plan.
- [ ] One User cannot create or own a second Profile.
- [ ] A chosen Slug cannot change or be reused after deletion; two concurrent claims produce one winner.
- [ ] Draft edits never alter the current Published Profile before Publish succeeds.
- [ ] Every D1 query follows the owner-scoping rule, and tests prove User A cannot read or mutate User B's draft data or KV images.
- [ ] Anonymous users can read Published snapshots but no draft or suspended data.
- [ ] Publication and unpublication run as single atomic D1 batches and invalidate the correct cache key.
- [ ] All Social Link services enforce HTTPS and hostname rules.
- [ ] Original uploads, metadata, animation, SVG, and excessive dimensions are rejected or removed.
- [ ] Replacing an image does not leave an unbounded number of stored derivatives.
- [ ] Abuse reports are rate-limited and administrative suspension removes public access.
- [ ] Only allowlisted Administrators reach admin actions, and audit log entries cannot be updated or deleted.
- [ ] Public pages emit `noindex, nofollow`, require no login, and identify content as user-provided.
- [ ] Account deletion unpublishes immediately, ends every Session, reserves the Slug, and removes D1 personal data and KV images through a retryable step.
- [ ] Exhausting a D1, KV, Images, or Workers free quota produces bounded failure and cannot trigger paid overages.
- [ ] NFC cards remain writable until a stable custom domain exists.
- [ ] Mobile Chrome and Safari layouts, keyboard navigation, focus states, contrast, and reduced motion are verified.
