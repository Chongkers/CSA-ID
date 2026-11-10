# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are eight student assistants at the Mapúa University Center for Student Advising. During tutoring sessions, each assistant shares their public profile with peer advisees by tapping an NFC card.

Peer advisees are the public audience. They view the assistant's identity and contact links, then follow a link to complete a session evaluation.

## Product Purpose

The product gives each student assistant a virtual business card with one permanent, NFC-friendly public URL. The assistant can maintain their photo, background, profile details, and supported social links without rewriting the NFC card.

Success means a peer advisee can tap a card during a tutoring session, identify the student assistant, and reach the existing evaluation form with little friction.

## Positioning

This is a tutoring-session identity and evaluation handoff for Mapúa University CSA student assistants. Unlike a general social-link page, the permanent NFC profile connects a specific peer-advising interaction to the assistant's existing evaluation form.

## Operating Context

- Eight student assistants will receive physical NFC cards.
- Cards are programmed separately with a phone-based NFC tool.
- Peer advisees tap a card during or immediately after a tutoring session.
- Each card opens its assistant's public Profile without requiring the advisee to sign in.
- The Profile links to an existing evaluation form. The form URL has not yet been supplied.
- The application does not create, host, or store evaluation responses.
- Frontend implementation and integration contracts live in this project workflow. A separate implementer owns backend initialization.

## Capabilities and Constraints

- One Google-authenticated User owns one Profile.
- Google is the only login method in the first version.
- Registration remains open to any Google user until an approved-user mechanism becomes practical.
- Each Profile has a permanent, non-reusable Slug suitable for an NFC URL.
- Assistants can edit a private draft, preview it, and explicitly publish changes.
- Profiles support a photo, background image, short identity information, controlled themes, supported Social Links, and an external evaluation-form link.
- Published Profiles are readable without authentication and clearly identify their content as user-provided.
- NFC cards are not registered, transferred, or managed inside the application.
- Hosting, database, authentication, and storage must remain within strict free-tier limits. Quota failure or temporary downtime is preferable to paid overages.
- No custom domain is currently available. NFC cards remain writable until a stable domain is controlled.
- The initial workload is eight intended student assistants, while the architecture avoids preventing later growth.
- The product is non-commercial.

## Brand Commitments

“Digital Profile” is a temporary working name. The product may use the Mapúa University and Center for Student Advising names, logos, and official branding with authorization. The supplied CSA seal and Mapúa red, gold, and modular-square visual references live in [`public/brand`](./public/brand/). The permanent product name has not yet been supplied.

## Evidence on Hand

- [`agent_technical_readme.md`](./agent_technical_readme.md) contains the current architecture, security model, data model, and implementation requirements.
- [`GLOSSARY.md`](./GLOSSARY.md) defines the canonical domain language.
- A frontend scaffold is in progress in the Next.js application files.
- No testimonials, usage metrics, evaluation results, or other promotional proof have been supplied. Future work must not fabricate them.

## Product Principles

1. Make the tutoring-session handoff immediate: tap, identify the assistant, open the evaluation.
2. Keep the public URL stable while allowing the assistant to update the Profile behind it.
3. Show only information the assistant deliberately publishes.
4. Prefer bounded failure over unexpected infrastructure cost.
5. Keep evaluation responses in the existing evaluation system rather than duplicating sensitive data.

## Accessibility & Inclusion

The public Profile is mobile-first because peer advisees reach it from an NFC tap. Public and dashboard surfaces must support keyboard navigation, visible focus, sufficient contrast, reduced motion, screen-reader labels, and responsive layouts on common mobile browsers.

## Open Decisions

- Permanent product name.
- Final evaluation-form URL and whether it is shared or specific to each assistant.
- Stable custom domain for permanent NFC URLs.
