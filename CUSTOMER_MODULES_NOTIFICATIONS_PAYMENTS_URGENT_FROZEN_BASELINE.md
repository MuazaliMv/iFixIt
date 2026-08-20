# iFixIt — Customer Modules: Notifications, Payments, Urgent Requests

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Branch:** docs/maldives-location-hierarchy

## 1. Scope

This baseline adds the following customer modules to the approved customer functional catalogue:

```text
UC-C28 — Manage Notifications & Communication Channels
UC-C29 — View and Handle Post-Inspection Invoicing / Payments
UC-C30 — Flag Urgent Requests
```

The catalogue therefore extends from UC-C01..UC-C27 to UC-C01..UC-C30.

## 2. UC-C28 — Manage Notifications & Communication Channels

### Approved MVP Channels

```text
IN-APP
PUSH
SMS
```

Viber is optional and may be enabled later when a supported integration is available.

### Approved Behavior

Customers may manage non-critical notification preferences and quiet hours.

Operational alerts may include:

```text
provider responses
clarification requests
provider selection
inspection scheduling / rescheduling
provider arrival
work start / status updates
cancellation
payment / receipt
completion
support updates
```

Quiet hours apply to ordinary/non-critical notifications. Critical operational notifications may bypass quiet hours where platform policy requires it.

Emergency-specific override logic is not part of the MVP because full EMERGENCY mode is not approved.

Notification delivery failures must not change service-request status.

## 3. UC-C29 — Post-Inspection Invoicing / Payments

### Approved Principle

There is no mandatory pre-work quote during initial provider matching.

The preferred commercial flow is:

```text
Provider responds
→ Customer compares providers
→ Customer selects provider
→ Inspection occurs
→ Scope / cost determined
→ Customer reviews cost
→ Customer approval where required
→ Work proceeds / completes
→ Payment
→ Receipt
```

### Approved Payment Methods

The architecture must support a common payment model for:

```text
CASH
BANK_TRANSFER / LOCAL ONLINE TRANSFER
ONLINE_GATEWAY
```

The exact local bank/gateway provider remains configurable and is not frozen here.

### Cost Breakdown

Customer should be able to view permitted line items such as:

```text
labour
materials / parts
transport / service charge where permitted
other approved items
discount where applicable
tax where applicable
total
```

### Payment Statuses

Recommended baseline statuses:

```text
UNPAID
PAYMENT_PENDING
PENDING_VERIFICATION
PAID
PAYMENT_FAILED
DISPUTED
REFUNDED
```

A bank-transfer reference alone must not automatically make the payment PAID if verification is required.

A gateway payment must rely on trusted gateway confirmation, not only a browser/client response.

Receipts are created for confirmed payments.

The approved pre-IN_PROGRESS customer cancellation policy remains ZERO FEE and must not create cancellation charges.

## 4. UC-C30 — Urgent Request Handling

### MVP Priority Levels

```text
NORMAL
URGENT
```

Full `EMERGENCY` dispatch mode is explicitly deferred.

### Urgent Request Principle

Urgency increases routing/notification priority only.

It does not bypass:

```text
FixIt Service Area geography
provider verification
category approval
service eligibility
availability rules where applicable
customer provider selection
```

### Urgent Matching Flow

```text
Customer marks request URGENT
→ resolve canonical FixIt Service Area
→ find active eligible providers for that exact service area/service
→ increase notification/routing priority
→ multiple providers may respond
→ customer views responders
→ customer compares providers
→ customer selects provider
```

First response does NOT automatically win the job.

The customer-choice model remains controlling:

```text
View responding providers
→ Compare
→ Select provider
```

### Geography

Urgent routing must use:

```text
service_location_id → locations.location_id
→ applicable FixIt Service Area
```

It must not use a hard-coded `ward_id` and must not automatically expand to sibling/parent service areas.

### Cancellation

Urgent requests remain subject to the approved cancellation rules:

```text
PENDING / RESPONDED / ACCEPTED / INSPECTION_SCHEDULED
→ customer may cancel
→ ZERO FEE

IN_PROGRESS
→ no direct customer cancellation
→ provider/admin review
```

## 5. Deferred EMERGENCY Mode

A future EMERGENCY mode may only be introduced after separately defining and approving:

```text
eligible emergency categories/services
provider emergency availability
response expectations
escalation behavior
safety disclaimers
notification overrides
no-provider handling
customer messaging
operational liability boundaries
```

Until then, the platform must not represent itself as an official emergency-response or emergency-dispatch service.

## 6. Final Frozen Customer Extension

```text
UC-C01..UC-C27  Existing core customer functions
UC-C28          Notifications & Communication
UC-C29          Post-Inspection Cost / Payment / Receipt
UC-C30          Urgent Request Handling (NORMAL / URGENT only)
```

This baseline preserves all previously approved rules for canonical Maldives geography, multiple provider responses with customer comparison/selection, inspection scheduling, service-request lifecycle, and zero-fee pre-IN_PROGRESS cancellation.
