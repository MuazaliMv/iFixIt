# iFixIt — Customer Cancellation Policy Frozen Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Scope:** Customer cancellation behavior for PENDING, ACCEPTED, and IN_PROGRESS service requests.

## 1. Request Lifecycle States

High-level request lifecycle states:

```text
PENDING
ACCEPTED
IN_PROGRESS
CANCELLED
COMPLETED
```

Provider-offer response states are governed separately and must not be mixed into the service-request lifecycle.

## 2. PENDING Cancellation

```text
PENDING
→ free cancellation
```

Rules:
- Customer may cancel immediately.
- No cancellation fee or penalty applies.
- Any active provider offer must be closed/cancelled as part of the cancellation transaction.
- Cancellation event must be timestamped and audit logged.

## 3. ACCEPTED Cancellation — Grace Period

```text
ACCEPTED within grace
→ free cancellation
```

Rules:
- A configurable cancellation grace period begins when the provider accepts the job.
- Default configuration:

```text
accepted_cancellation_grace_minutes = 5
```

- Customer may cancel freely during the grace period.
- Provider is released immediately.
- Cancellation must be recorded and the provider notified.

## 4. ACCEPTED Cancellation — After Grace Period

```text
ACCEPTED after grace
→ cancellation allowed
→ provider released
→ reason recorded
→ fee only if separately approved
```

Rules:
- Customer may still request/perform cancellation after the grace period subject to the platform workflow.
- Provider is released immediately once cancellation is confirmed.
- Cancellation reason must be recorded.
- No automatic cancellation fee is part of this baseline.
- A fee may apply only if a separate commercial/payment policy is explicitly approved and enabled.
- Any future fee policy must define amount/calculation, eligibility, exceptions, provider compensation, collection, refunds, and provider-fault scenarios separately.

## 5. IN_PROGRESS Cancellation

```text
IN_PROGRESS
→ no simple self-cancellation
→ provider confirmation or admin intervention
```

Rules:
- Customer must not have a simple one-click self-cancellation path once work is IN_PROGRESS.
- Cancellation requires either provider confirmation or authorized administrative intervention.
- The exact advanced onsite/shift-active cancellation workflow is outside this freeze and will be designed separately.

## 6. Audit and History

All cancellations must preserve service-request history.

At minimum, the system must retain:
- service_request_id
- previous_status
- cancellation_stage
- cancelled_at
- cancelled_by
- cancellation_reason where required
- whether the cancellation occurred within the accepted grace period
- provider release timestamp where applicable

Cancellation must not delete the service request or erase prior provider-offer/job history.

## 7. Frozen Principle

```text
PENDING
→ free cancellation

ACCEPTED within grace
→ free cancellation

ACCEPTED after grace
→ cancellation allowed
→ provider released
→ reason recorded
→ fee only if separately approved

IN_PROGRESS
→ no simple self-cancellation
→ provider confirmation or admin intervention
```

The grace period is configurable, with a default of 5 minutes from provider acceptance. Cancellation workflow and cancellation-fee policy remain separate concerns.