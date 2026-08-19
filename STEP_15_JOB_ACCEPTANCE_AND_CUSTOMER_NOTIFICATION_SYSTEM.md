# iFixIt — Step 15: Job Acceptance & Customer Notification System

**Document Type:** Provider Acceptance / Customer Confirmation Specification  
**Status:** Implementation Guidance Baseline  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document records job-acceptance and customer-notification behavior that was not already fully explicit in the iFixIt blueprint.

Existing rules remain authoritative: server-side eligibility, concurrency-safe exclusive assignment, idempotency, status history, privacy, and the rule that notification failure must not roll back a valid acceptance transaction.

---

## 2. Canonical Flow

`Customer books/submits → lead/offer created → provider notified → provider reviews → Accept/Decline → server rechecks eligibility + assignment race → exclusive assignment committed → job confirmed → customer notified immediately → both parties see confirmed state`

`Job Confirmed` must never be displayed before the acceptance/assignment transaction commits successfully.

---

## 3. Provider Acceptance Channels

### In-App / Web — MVP

Provider request inbox supports:
- View Details
- Accept
- Decline
- response deadline/countdown where timeout policy applies

Acceptance confirmation may show:
- service
- target island
- requested time/window
- pricing/workflow context
- permitted customer/access details
- optional provider message to customer

Optional confirmations:
- provider is available
- provider can serve the location
- provider understands the request

A universal `I have all parts` confirmation is not required because diagnosis-required work may not know parts before inspection.

### WhatsApp — when integrated

WhatsApp Business may deliver an interactive job offer with:
- request/job reference
- service
- island/location summary
- requested time
- pricing/workflow summary
- safe problem summary
- `ACCEPT`, `DECLINE`, `VIEW` actions

Acceptance must use a verified webhook/signed server action. Links/tokens must be short-lived, scoped to provider + lead, replay-resistant, and revalidated server-side.

### SMS — backup/configurable

Where inbound SMS is supported, provider may respond `ACCEPT`/`DECLINE` or use a signed link.

Requirements:
- sending number must map to verified provider identity
- response must correlate to a specific active lead when multiple offers exist
- stale/replayed replies rejected
- same server-side eligibility/concurrency checks as app/WhatsApp

---

## 4. Provider Job Detail Before Acceptance

Provider may see:
- job/request reference
- exact service
- awaiting-response state
- response deadline
- customer display name where permitted
- target island
- address/access summary according to privacy policy
- urgency/date/time window
- description
- attachments/media
- pricing presentation/workflow context

Private customer contact/address details should be progressively disclosed and not exposed to every candidate provider unless operationally required.

---

## 5. Atomic Acceptance Transaction

Before acceptance succeeds, server checks:
1. lead/request still active
2. provider is the intended eligible provider
3. provider account active
4. approval/verification valid
5. provider not suspended
6. subscription entitlement valid where required
7. exact service still active for provider
8. island/service-area eligibility valid
9. availability still valid where enforced
10. no exclusive assignment already won by another provider
11. response timeout not expired

Successful transaction records:
- accepted lead/offer
- exclusive assignment
- closure of competing offers according to routing policy
- request/job status update
- provider reference
- server acceptance timestamp
- optional provider message
- status/history/audit event
- customer notification event

Retrying the same acceptance must not create duplicate jobs/assignments.

---

## 6. Provider Acceptance Confirmation

After success, provider should see:
- accepted service/job
- customer details now permitted by confirmed assignment
- location/access information
- requested/agreed date/time
- pricing/workflow context
- provider message sent, if any

Possible actions:
- View Job
- Call Customer
- WhatsApp/Message Customer
- Navigate when mapping is implemented
- Schedule/adjust time where permitted
- Set Reminder as client convenience

UI may say notification is `queued` or `sent` only according to actual state. It must not say `customer received/read your message` without an actual delivery/read receipt.

---

## 7. Provider Message on Acceptance

Provider may attach a short optional message such as arrival expectation or access question.

Requirements:
- length limit configurable
- stored in assignment/communication history
- sanitized for all channels
- included only where allowed
- no arbitrary HTML/script

This does not require full in-platform chat.

---

## 8. Customer Confirmation Experience

Immediately after committed acceptance, customer should see a state such as:

`Provider Accepted / Job Confirmed`

Customer may see:
- provider name/business
- photo/logo
- rating/review count
- verification badges
- contact actions according to privacy settings
- service
- date/time
- island/address summary
- provider acceptance message
- current state and reference

Possible actions:
- View Job
- Call Provider
- WhatsApp/Message Provider
- Report Issue

Live tracking/map actions are deferred unless mapping/tracking is actually implemented.

---

## 9. Customer Notification Channels

Acceptance is a high-priority service event.

Supported channels may include:
- in-app notification
- push
- SMS
- email
- WhatsApp where integrated

Channel delivery follows notification preferences and mandatory service-notice policy. The platform should not blindly send all channels if policy/preferences say otherwise.

A durable in-app/job-status record remains available even if every external channel fails.

Suggested notification content:
- provider accepted your job
- provider name
- service
- time
- island/location summary
- provider message if present
- View Job action
- Call/Reply actions where enabled

---

## 10. Customer Active-Job Timeline

Customer active-job view should support a chronological event timeline, for example:

- request submitted
- provider accepted
- provider message sent
- appointment confirmed
- provider on the way (future/optional)
- provider arrived (future/optional)
- work started
- work completed

Timeline events must come from authoritative event/state records rather than client-only UI state.

---

## 11. Notification Delivery Tracking

Recommended notification event metadata:
- notification/event ID
- recipient
- job/request ID
- event type (`JOB_ACCEPTED`)
- channel
- template/version
- queued_at
- sent_at
- delivered_at where supported
- read_at where supported
- failure reason
- retry count

Acceptance success is independent from notification delivery success.

---

## 12. Worker Statistics

Provider metrics may update from authoritative acceptance events, including:
- leads received
- accepted leads
- declined leads
- acceptance rate
- response time
- last acceptance timestamp

Do not increment `leads_received` only when acceptance occurs; lead receipt and acceptance are separate events.

---

## 13. API / Integration Requirements

Conceptual endpoints/events:
- `POST /provider/leads/{id}/accept`
- `POST /provider/leads/{id}/decline`
- `GET /provider/leads/{id}`
- verified WhatsApp acceptance webhook
- verified inbound-SMS handler where enabled
- `JOB_ACCEPTED` domain event

Any action link must be signed/opaque, short-lived and single-purpose.

---

## 14. Acceptance Race Handling

If multiple providers receive an offer, only one may win an exclusive assignment where the routing model requires one provider.

Losers must receive a safe state such as:
- `Already assigned`
- `Offer no longer available`

They must not receive customer private details after losing the assignment race.

---

## 15. Acceptance Criteria

1. Provider can accept from in-app flow.
2. WhatsApp/SMS acceptance, when enabled, uses verified server-side correlation.
3. Acceptance rechecks service, geography, approval, suspension, subscription and availability rules.
4. Concurrent accepts cannot create two exclusive active assignments.
5. Customer status changes to confirmed only after transaction commit.
6. Optional provider message is stored and included safely in customer notification.
7. Customer sees provider identity and confirmed job information after acceptance.
8. External notification failures do not undo accepted assignment.
9. Notification UI never claims delivery/read state without evidence.
10. Timeline records request and acceptance events with authoritative timestamps.
11. Provider statistics distinguish lead receipt from acceptance.
12. Stale WhatsApp/SMS actions cannot accept an expired/closed lead.
13. Customer private details are not exposed to losing candidate providers.

---

## 16. Cross-Document Rule

This step supplements:
- `STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`
- `STEP_4_FINAL_UI_AND_SCREEN_SPECIFICATION.md`
- `STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`
- `STEP_7_API_CONTRACTS.md`
- `STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`
- `STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`
- `STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md`

**The provider acceptance transaction remains the source of truth. Notifications communicate the result; they do not create the assignment themselves.**
