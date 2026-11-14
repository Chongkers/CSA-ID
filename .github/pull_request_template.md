Closes #

<!-- Feature and fix pull requests target `dev`. Only the owner opens release pull requests from `dev` into `main`. -->

## Summary

<!-- What changed and why, in a few sentences. Use the terms in GLOSSARY.md. -->

## Preview

<!-- The preview URL from the "Workers Builds: csa-id" check or Cloudflare's comment, and what you checked there.
     Add the `verify` evidence (screenshots, status messages) for a change a user can see.
     The preview uses the LIVE database: use only test accounts, and never report, delete or edit real Profiles. -->

Preview URL:

## Checklist

- [ ] The pull request targets `dev` (or is a release from `dev` into `main`)
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npx opennextjs-cloudflare build` passes
- [ ] The change works on the preview, checked only with test accounts
- [ ] No new migration, or the new migration is already applied to the live D1 database (`npm run db:migrate:remote`)
- [ ] If an AI agent did the work, it followed `AGENTS.md`
- [ ] The title follows Conventional Commits, such as `feat(profile): claim the Slug on its own`
