# iFixIt — Customer Cancellation Policy Frozen Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Scope:** Customer cancellation behavior across PENDING, RESPONDED, ACCEPTED, INSPECTION_SCHEDULED, IN_PROGRESS, CANCELLED, and COMPLETED service-request states.

## 1. Request Lifecycle States

Approved high-level request lifecycle states:

```text
PENDING
RESPONDED
ACCEPTED
INSPECTION_SCHEDULED
IN_PROGRESS
CANCELLED
COMPLETED
```

Provider-response records are governed separately. The service request may move to RESPONDED when one or more eligible providers have responded and the customer has not yet selected a provider.

## 2. Zero-Fee Principle Before Work Starts

The approved MVP policy is zero-fee customer cancellation for every pre-IN_PROGRESS lifecycle state.

```text
PENDING
RESPONDED
ACCEPTED
INSPECTION_SCHEDULED
→ customer may cancel
→ ZERO FEE
```

No automatic cancellation penalty is charged in these states.

## 3. PENDING Cancellation

```text
PENDING
→ customer can cancel
→ ZERO FEE
```

Rules:
- Customer may cancel immediately.
- No cancellation fee or penalty applies.
- Any open provider-response/matching activity must be closed as part of cancellation.
- Cancellation must be timestamped and audit logged.

## 4. RESPONDED Cancellation

```text
RESPONDED
→ customer can cancel
→ ZERO FEE
```

Rules:
- Customer may cancel while provider responses are available but before a provider is selected.
- All active response-selection activity for the request must be closed.
- Responding providers must no longer be able to become selected for the cancelled request.
- No cancellation fee or penalty applies.

## 5. ACCEPTED Cancellation

```text
ACCEPTED
→ customer can cancel
→ selected provider released
→ ZERO FEE
```

Rules:
- ACCEPTED means the customer has selected a provider.
- Customer may cancel the request before work begins.
- Selected provider is released immediately.
- Cancellation reason is recorded according to platform policy.
- Provider is notified.
- No cancellation fee or penalty applies.

A configurable grace period may still be retained for messaging, analytics, or operational reporting:

```text
accepted_cancellation_grace_minutes = 5
```

The grace period does not change the zero-fee financial outcome.

## 6. INSPECTION_SCHEDULED Cancellation

```text
INSPECTION_SCHEDULED
→ customer can cancel
→ inspection cancelled
→ provider released
→ ZERO FEE
```

Rules:
- Customer may cancel after an inspection date/time has been agreed but before physical work begins.
- The scheduled inspection must be cancelled.
- Selected provider is released immediately.
- Customer/provider notifications must be issued.
- No cancellation fee or penalty applies.

The canonical request-status value is:

```text
INSPECTION_SCHEDULED
```

Backend transitions must use:

```text
update_request_status(request_id, 'INSPECTION_SCHEDULED')
```

and not `IN_SPECTION_SCHEDULED`.

## 7. IN_PROGRESS Cancellation

```text
IN_PROGRESS
→ no direct self-cancellation
→ provider/admin review required
```

Rules:
- Customer must not have a simple one-click direct cancellation once physical work has begun.
- Customer may request cancellation/review.
- Provider confirmation or authorized administrative intervention is required.
- The exact active-job cancellation review workflow remains a separate implementation module.

## 8. COMPLETED and CANCELLED

- COMPLETED requests are not eligible for customer cancellation.
- CANCELLED requests cannot be cancelled again.
- Any dispute, support, or completion challenge must use the applicable post-work workflow rather than cancellation.

## 9. Audit and History

All cancellations must preserve service-request history.

At minimum, retain:
- service_request_id
- previous_status
- cancelled_at
- cancelled_by
- cancellation_reason where applicable
- selected provider release timestamp where applicable
- inspection cancellation timestamp where applicable
- relevant provider-response history

Cancellation must not delete the service request or erase prior provider-response, provider-selection, scheduling, or job history.

## 10. Frozen State Transition Principle

```text
PENDING
→ customer can cancel
→ ZERO FEE

RESPONDED
→ customer can cancel
→ ZERO FEE

ACCEPTED
→ customer can cancel
→ selected provider released
→ ZERO FEE

INSPECTION_SCHEDULED
→ customer can cancel
→ inspection cancelled
→ provider released
→ ZERO FEE

IN_PROGRESS
→ no direct self-cancellation
→ provider/admin review required
```

## 11. Approved Lifecycle Context

```text
PENDING
→ RESPONDED
→ ACCEPTED
→ INSPECTION_SCHEDULED
→ IN_PROGRESS
→ COMPLETED
```

Alternative terminal state before completion:

```text
CANCELLED
```

This document supersedes the earlier fee-contingent accepted-stage cancellation wording. The approved MVP baseline is now zero-fee cancellation in all pre-IN_PROGRESS states.