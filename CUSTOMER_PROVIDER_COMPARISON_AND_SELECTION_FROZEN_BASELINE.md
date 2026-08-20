# iFixIt — Customer Provider Comparison & Selection Frozen Baseline

**Status:** FROZEN / APPROVED BASELINE  
**Date:** 2026-08-20  
**Scope:** Customer ability to receive responses from multiple eligible providers, compare them, and select the provider for a service request.

## 1. Core Principle

The platform may present one service request to multiple eligible providers. More than one provider may respond to the same service request.

The customer retains the final selection right among responding eligible providers.

```text
Service Request
→ multiple eligible provider responses
→ customer views responding providers
→ customer compares responses/providers
→ customer selects one provider
```

## 2. Customer Use Case

```text
View Responding Providers
→ Compare
→ Select Provider
```

The customer must not be forced to accept the first provider who responds unless a separately approved emergency/automatic-assignment rule explicitly says otherwise.

## 3. Provider Offer Compatibility

Each provider response is tracked independently through `provider_job_offers`.

Approved provider response actions remain:

```text
ACCEPT
DECLINE
REQUEST_CLARIFICATION
```

System-generated no-response outcome remains:

```text
NO_RESPONSE_TIMEOUT
```

A provider response of `ACCEPT` means the provider is willing to take the job; it does not by itself make that provider the final assigned provider when multiple eligible providers are being considered by the customer.

Final provider assignment occurs when the customer selects one accepted/responding provider.

## 4. Selection Rule

Once the customer selects a provider:

```text
selected provider
→ becomes assigned provider for the service request

other open/responding provider offers
→ closed/cancelled as not selected
```

The underlying `service_request_id` remains unchanged.

## 5. Customer Comparison

The customer may compare permitted provider information, including where available:

- provider/company name
- provider type (company or freelancer)
- verified/approved service categories
- offered service relevant to the request
- permitted rating/review information
- response/quote information when applicable
- availability or proposed visit timing when applicable

Private company personnel information must not be exposed merely for comparison.

## 6. Geography and Eligibility

Only providers already eligible under approved matching rules may receive/respond to the request.

```text
correct FixIt Service Area
AND requested service eligibility
AND active/approved provider state
AND applicable availability/business rules
```

Customer selection must not bypass geographic or service eligibility rules.

## 7. Conflict Resolution with Sequential-Only Assumptions

Any earlier draft assumption requiring exactly one active provider offer at a time is not authoritative where it conflicts with this approved customer-choice model.

The approved direction is:

```text
multiple eligible providers may respond
→ customer compares
→ customer selects
```

Provider timeout/reassignment logic must therefore be designed to coexist with a configurable multi-provider response pool rather than assuming customer assignment to the first accepting provider.

## 8. Frozen Principle

```text
View responding providers
→ Compare
→ Select provider
```

This is part of the customer journey and must be supported by matching, provider-offer tracking, UI, and final provider-assignment logic.
