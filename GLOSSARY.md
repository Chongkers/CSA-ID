# Digital Profile

The public identity-page context for people who publish selected contact information and optionally open the page using an NFC card.

## Language

**User**:
A person who signs in with a Google account and owns exactly one Profile.
_Avoid_: Account, cardholder, member

**Profile**:
A User's customizable public identity page, identified by one permanent Slug.
_Avoid_: ID, badge, card profile, webpage

**Slug**:
The permanent, unique text identifier in a Profile's public URL.
_Avoid_: Username, handle, profile ID

**Draft Profile**:
A Profile visible only to its User and not available at its public URL.
_Avoid_: Private profile, hidden profile

**Published Profile**:
A Profile available to anyone who knows its public URL.
_Avoid_: Public ID, active card

**Suspended Profile**:
A Profile made unavailable by an administrator in response to abuse or risk while its ownership and reserved Slug are retained.
_Avoid_: Banned account, deleted profile

**Social Link**:
A URL on a Profile belonging to one of the supported social or contact services.
_Avoid_: Embed, integration

**Administrator**:
A trusted operator authorized independently of Profile data to review reports and suspend Profiles.
_Avoid_: Admin profile, moderator account

**Abuse Report**:
A request for an Administrator to review a Published Profile for impersonation, malicious links, or prohibited content.
_Avoid_: Complaint, flag

**NFC Card**:
An independently programmed physical tag containing a Profile's public URL; it is not registered or managed by the system.
_Avoid_: Profile, account, managed card
