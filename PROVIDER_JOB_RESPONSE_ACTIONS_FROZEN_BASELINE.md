# iFixIt — Provider Job Response Actions Frozen Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Scope:** Provider actions available when a service request/job offer is presented to an eligible provider.

## Approved Provider Response Actions

```text
ACCEPT
DECLINE
REQUEST_CLARIFICATION
```

## Meaning

### ACCEPT
The provider agrees to take responsibility for the offered job, subject to the downstream scheduling, staffing, pricing, and execution workflow.

### DECLINE
The provider refuses the offered job. A decline reason may be recorded separately for audit, matching quality, and operational analysis.

### REQUEST_CLARIFICATION
The provider does not yet accept or decline. The provider requests additional information needed to make a decision. This keeps the offer in a clarification state until the required information is supplied or the configured response deadline expires.

## Core Rules

1. These are the only approved provider response actions at the initial offer/assignment response stage.
2. `REQUEST_CLARIFICATION` is not equivalent to `ACCEPT` and must not reserve the job as accepted unless a later rule explicitly does so.
3. `DECLINE` ends that provider's active consideration for the current offer attempt.
4. `ACCEPT` transitions the provider offer into the accepted state and allows downstream job execution workflow to begin.
5. If no approved action is taken before the configured response deadline, the offer may transition to a separate timeout/no-response state. Timeout behavior is outside this freeze unless separately approved.
6. The customer service request remains a single request throughout provider offer attempts; provider responses must not create duplicate service requests.
7. All provider responses must be timestamped and audit logged.

## Frozen Principle

When a provider is offered or assigned a job for response, the provider can only choose one of:

```text
ACCEPT
DECLINE
REQUEST_CLARIFICATION
```

Further timeout, reassignment, escalation, and ranking consequences will be designed and frozen separately.
