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

No custom domain is currently available. Treat all provider URLs as temporary:

- Keep every NFC card rewritable.
- Never lock a card read-only while it contains a provider-owned hostname.
- Move to a stable custom domain before treating NFC URLs as permanent.
- Revisit production Google OAuth domain requirements before public launch.

## 3. Approved Architecture

| Responsibility | Service | Required behavior |
| --- | --- | --- |
| Web application | Next.js App Router on Cloudflare Pages/Workers Free | Static-first public pages; dynamic authenticated dashboard |
| Database | Supabase Free PostgreSQL | Row Level Security on every exposed table |
| Authentication | Supabase Auth with Google OIDC only | Request only `openid`, `email`, and `profile` |
| Object storage | Supabase Storage Free | Store sanitized derivatives only; never store original uploads |
| Upload sanitization | Cloudflare Workers Free with the Images Free binding | Decode, resize, strip metadata, and re-encode before storage |
| Abuse challenge | Cloudflare Turnstile when risk signals trigger | Protect signup-adjacent and upload/report endpoints |
| Styling | Tailwind CSS plus validated CSS variables | Fixed layouts and allowlisted theme fields only |

Do not use Cloudflare R2: it requires billing enrollment and permits usage charges. Do not make Vercel Hobby the production dependency for an open or potentially commercial service.

Cloudflare Images storage is not part of this architecture. Use only the free Images transformation binding and save its sanitized output to Supabase Storage. When the transformation quota is exhausted, new uploads must fail clearly while existing assets continue to work.

## 4. Authentication and Authorization

### Google login

- Use Google OAuth through Supabase Auth.
- Do not implement passwords or magic links in v1.
- Store no Google access token or refresh token.
- Treat Google login as proof of control of a Google identity, not proof that Profile claims are genuine.
- Ask before copying the Google display name or avatar into the Draft Profile.
- Require confirmation that the User is at least 18.
- Require acceptance of the current Terms version before first publication; record its version and timestamp.

### Authorization rules

- A User may read and update only their Draft Profile and Draft Social Links.
- Anonymous visitors may read only a Published Profile and its Published Social Links when its parent Profile is `published`.
- Publication and unpublication execute server-side as one transaction.
- Administrative authorization comes from a server-controlled allowlist of Google subject IDs or verified emails. It never comes from Profile data or client-editable claims.
- Service-role credentials stay server-side and must never be exposed to the browser.

## 5. Data Model

Use relational columns and tables for fields that require validation or ordering. Do not replace this model with unrestricted theme or social-link JSON.

The migration below is the baseline. Add indexes, check constraints, grants, and policies in the same migration rather than relying on application validation alone.

```sql
create extension if not exists pgcrypto;

create type public.profile_status as enum (
  'draft',
  'published',
  'suspended'
);

create type public.social_service as enum (
  'linkedin',
  'instagram',
  'facebook',
  'github',
  'website'
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug varchar(64) unique,
  status public.profile_status not null default 'draft',

  -- Editable draft fields
  display_name varchar(128) not null default '',
  role_title varchar(128) not null default '',
  bio varchar(500) not null default '',
  avatar_path text,
  background_path text,
  layout_key varchar(32) not null default 'classic',
  primary_color varchar(7) not null default '#2563eb',
  accent_color varchar(7) not null default '#7c3aed',

  terms_version varchar(32),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_slug check (
    slug is null or slug ~ '^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$'
  ),
  constraint valid_primary_color check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint valid_accent_color check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint known_layout check (layout_key in ('classic', 'minimal', 'bold'))
);

create table public.draft_social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  service public.social_service not null,
  url text not null,
  display_order smallint not null,
  enabled boolean not null default true,
  unique (profile_id, service),
  unique (profile_id, display_order),
  check (display_order between 0 and 9)
);

-- A separate snapshot prevents draft edits from leaking publicly.
create table public.published_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  slug varchar(64) not null unique,
  display_name varchar(128) not null,
  role_title varchar(128) not null,
  bio varchar(500) not null,
  avatar_path text,
  background_path text,
  layout_key varchar(32) not null,
  primary_color varchar(7) not null,
  accent_color varchar(7) not null,
  published_at timestamptz not null default now()
);

create table public.published_social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.published_profiles(profile_id) on delete cascade,
  service public.social_service not null,
  url text not null,
  display_order smallint not null,
  unique (profile_id, service),
  unique (profile_id, display_order)
);

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  category varchar(32) not null,
  details varchar(1000) not null default '',
  reporter_contact varchar(320),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index profiles_user_id_idx on public.profiles(user_id);
create index published_profiles_slug_idx on public.published_profiles(slug);
create index abuse_reports_unresolved_idx
  on public.abuse_reports(created_at)
  where resolved_at is null;

alter table public.profiles enable row level security;
alter table public.draft_social_links enable row level security;
alter table public.published_profiles enable row level security;
alter table public.published_social_links enable row level security;
alter table public.abuse_reports enable row level security;

create policy "owners read profiles"
on public.profiles for select to authenticated
using (auth.uid() = user_id);

create policy "owners update draft profiles"
on public.profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "owners read draft links"
on public.draft_social_links for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);

create policy "owners manage draft links"
on public.draft_social_links for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  )
);

create policy "public reads published snapshots"
on public.published_profiles for select to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.status = 'published'
  )
);

create policy "public reads published links"
on public.published_social_links for select to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.status = 'published'
  )
);
```

### Required database functions and triggers

Implement and test these in migrations:

1. `updated_at` trigger for `profiles`.
2. Slug immutability trigger: allow `NULL -> chosen slug` once; reject every later change.
3. Reserved Slug retention when an account is deleted. A separate `reserved_slugs` table must outlive the Profile row.
4. Transactional `publish_profile(profile_id)` function that:
   - verifies ownership, age confirmation, accepted Terms, required fields, link validity, and a chosen Slug;
   - replaces the published Profile and Social Link snapshots atomically;
   - changes status to `published` unless it is `suspended`.
5. Transactional unpublish operation that changes status to `draft` without deleting the draft.

Direct client writes to published snapshots and abuse reports must have no permissive RLS policy. Use narrow server endpoints for publication, reports, suspension, export, and deletion.

## 6. Validation Rules

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

## 7. Image Upload Pipeline

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
6. Store only the re-encoded bytes at a versioned owner-scoped Supabase path.
7. Atomically update the Draft Profile to the new path.
8. Delete the replaced derivative after the database update succeeds.

Never retain the source upload. If sanitization quota is exhausted, return a clear quota error and leave the existing asset unchanged.

## 8. Route Responsibilities

### `GET /id/[slug]`

- Public and authentication-free.
- Read only from the Published Profile snapshot.
- Return a neutral unavailable page for missing, draft, suspended, or deleted Profiles; do not reveal which state applies.
- Emit `noindex, nofollow` until discoverability becomes an explicit opt-in feature.
- Clearly label content as user-provided and expose a report-abuse link.
- Cache at the edge with a target propagation delay of at most 60 seconds.
- Target a Lighthouse performance score above 95 on mobile and a warm-cache TTFB below 200 ms.

### `GET /dashboard`

- Require a valid Supabase session.
- Create one Draft Profile on first login if none exists.
- Let the User edit and preview draft fields without changing the Published Profile.
- Make Publish, Unpublish, Export JSON, and Delete Account explicit actions.
- Show publication status and the possible 60-second propagation period.

### Server mutation endpoints

- Validate origin, authentication, authorization, rate limit, and body size before parsing the full body.
- `POST /api/profile/publish`: execute the transactional publish function and trigger cache invalidation.
- `POST /api/profile/unpublish`: remove public availability immediately and invalidate cache.
- `POST /api/uploads/avatar` and `/background`: execute the sanitization pipeline.
- `POST /api/reports`: apply abuse controls and create an Abuse Report using server credentials.
- `GET /api/profile/export`: return the User's Profile and Social Links as JSON.
- `DELETE /api/account`: unpublish immediately, revoke access, reserve the Slug, and schedule personal data and derivatives for deletion.

## 9. Administration and Abuse Handling

- The initial Administrator is the project owner.
- Profiles display no verification badge.
- The Administrator can review reports, suspend a Profile, and remove its public images.
- Suspension retains ownership and the reserved Slug.
- Record administrative actions in an append-only audit table containing actor, action, target, timestamp, and reason.
- Terms must prohibit impersonation, malicious links, illegal material, harassment, and infringement.

## 10. Caching and Failure Behavior

- Use versioned immutable image paths with long-lived cache headers.
- Cache Published Profile output; never cache authenticated dashboard responses publicly.
- Publishing and unpublishing must invalidate the affected Slug.
- If Supabase is unavailable, serve a valid cached public response where available and fail dashboard writes safely.
- If a free quota is exhausted, return a specific user-facing error; never retry in a way that creates an unbounded cost or request loop.
- Keep deployment portable enough to replace a free-tier provider whose terms change.

## 11. NFC Encoding

- Chip: NTAG215 or any tag with enough capacity for the final URL.
- Record: NDEF URI.
- Payload: `https://<stable-domain>/id/<slug>`.
- Program cards outside this system with an NFC-writing phone application.
- Keep cards writable while using a temporary provider hostname.
- Lock a card read-only only after a custom domain is controlled, routing is tested, and the Slug is final.

## 12. Completion Checklist

An implementation is incomplete until all applicable checks pass:

- [ ] Google is the only v1 authentication method; no Google OAuth tokens are persisted.
- [ ] One User cannot create or own a second Profile.
- [ ] A chosen Slug cannot change or be reused after deletion.
- [ ] Draft edits never alter the current Published Profile before Publish succeeds.
- [ ] User A cannot read or mutate User B's draft data or storage objects.
- [ ] Anonymous users can read Published snapshots but no draft or suspended data.
- [ ] Publication and unpublication are transactional and invalidate the correct cache key.
- [ ] All Social Link services enforce HTTPS and hostname rules.
- [ ] Original uploads, metadata, animation, SVG, and excessive dimensions are rejected or removed.
- [ ] Replacing an image does not leave an unbounded number of stored derivatives.
- [ ] Abuse reports are rate-limited and administrative suspension removes public access.
- [ ] Public pages emit `noindex, nofollow`, require no login, and identify content as user-provided.
- [ ] Account deletion unpublishes immediately, reserves the Slug, and removes personal data and assets through a retryable job.
- [ ] Free-tier exhaustion produces bounded failure and cannot trigger paid overages.
- [ ] NFC cards remain writable until a stable custom domain exists.
- [ ] Mobile Chrome and Safari layouts, keyboard navigation, focus states, contrast, and reduced motion are verified.
