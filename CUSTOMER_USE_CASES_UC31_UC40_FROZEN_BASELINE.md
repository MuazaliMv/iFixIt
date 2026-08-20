# Customer Use Cases UC-C31 to UC-C40 — Frozen Baseline

Status: APPROVED / FROZEN

This extension expands the customer functional baseline from UC-C01–UC-C30 to UC-C01–UC-C40.

## UC-C31 — Manage Password & Account Security
Sub-use cases: forgot password, send reset verification, verify reset code/link, set new password, confirm reset, change password while logged in, re-authenticate for sensitive actions, change registered phone, change registered email, view active sessions/devices, revoke session, logout other sessions, view security-event history.

Core rules: passwords are never stored in plaintext; reset requires verified recovery; sensitive identifier changes may require reverification; session revocation must be prompt and auditable.

## UC-C32 — Manage Customer–Provider Messaging
Sub-use cases: open job conversation, send text, send photo/attachment, receive provider message, mark read, view history, report inappropriate message, close conversation after job closure.

Core rules: messaging is service-request-linked; only authorized participants may access it; history is preserved; privacy/location-sharing rules still apply.

## UC-C33 — Manage Customer Support Cases
Sub-use cases: open support centre, create case, attach evidence, view status, reply, escalate unresolved case, close resolved case.

Core rules: support may be request-linked or account-related; case history is preserved; serious safety/fraud matters may escalate; customer sees clear status.

## UC-C34 — Report Provider / Safety Incident
Sub-use cases: open provider report, select incident type, enter details, add evidence, submit report, view incident status.

Core rules: safety/fraud incidents are distinct from routine complaints; reporting does not determine fault automatically; evidence and timeline are preserved.

## UC-C35 — Manage Saved Providers
Sub-use cases: save provider, view saved providers, remove saved provider, start new request from saved provider.

Core rules: saving does not bypass location/service eligibility or guarantee availability; re-requesting creates a new service request.

## UC-C36 — View Documents, Invoices & Service Reports
Sub-use cases: open request documents, view invoice/cost document, view receipt, view inspection report, view completion/service report, download customer document.

Core rules: documents are access-controlled and versioned/immutable where historical or financial accuracy requires it; receipt and invoice are distinct.

## UC-C37 — Handle Warranty / Post-Service Rework
Sub-use cases: report post-service problem, check warranty/rework eligibility, request provider callback/rework, track rework status, confirm rework resolution.

Core rules: warranty/rework does not reopen or mutate the original completed request; linked rework records preserve original history.

## UC-C38 — Manage Privacy & Data Rights
Sub-use cases: view privacy settings, view data shared with provider, revoke exact-location sharing where allowed, request personal data export, request account/data deletion, view privacy request status.

Core rules: identity verification is required for data-right requests; legal/transaction retention may limit deletion; exact-location sharing remains separately controlled.

## UC-C39 — Manage Delegated Job Access
Sub-use cases: open delegation settings, select delegate, assign delegated authority, set expiry, revoke delegated access, view delegation audit history.

Core rules: customer remains owner; delegation is explicit, limited, revocable, and auditable; onsite contact does not automatically gain digital access; protected actions remain owner-only unless explicitly permitted later.

## UC-C40 — Manage Customer Availability & Scheduling Preferences
Sub-use cases: view availability preferences, set preferred days, set preferred time window, mark unavailable period, allow/disallow same-day requests, apply preferences to new request, report provider delay, report customer unavailable/no-access, propose new time after delay/no-access.

Core rules: availability is a preference, not a guaranteed appointment; confirmed inspection schedule overrides generic preference for that job; provider delay and customer no-access are separate incident types.

## Updated customer baseline

The complete customer functional baseline is now:

- UC-C01–UC-C30: core marketplace and job lifecycle
- UC-C31: Password & Account Security
- UC-C32: Customer–Provider Messaging
- UC-C33: Customer Support Cases
- UC-C34: Provider / Safety Incident Reporting
- UC-C35: Saved Providers
- UC-C36: Documents, Invoices & Service Reports
- UC-C37: Warranty / Post-Service Rework
- UC-C38: Privacy & Data Rights
- UC-C39: Delegated Job Access
- UC-C40: Customer Availability & Scheduling Preferences

Total main customer use cases: **40**.
