# iFixIt — Step 14: Provider Subscription Launch Promotion

**Document Type:** Commercial Subscription / Launch Promotion Specification  
**Status:** Approved Business Input — Implementation Requires Billing Validation  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document records the launch-period provider subscription promotional strategy that was not previously defined in the iFixIt blueprint.

It supplements the existing provider-subscription model and Step 12 subscription-entitlement architecture. It does not change the existing rule that customer-to-provider repair payments remain outside iFixIt MVP.

The launch campaign is designed to accelerate provider acquisition, gradually introduce paid subscription behavior, reward early adopters, and transition the marketplace to standard recurring pricing.

---

## 2. Commercial Baseline

Initial promoted plan:

- Plan: `Professional`
- Standard monthly price: `MVR 299`
- Initial launch benefits use the full Professional entitlement set configured for the plan.

Expected Professional entitlements from the supplied launch strategy:

- 30 leads per configured entitlement period
- priority search placement, subject to eligibility/ranking rules
- up to 3 service categories
- up to 3 island service areas
- up to 20 profile photos
- basic analytics

All plan entitlements must remain database-configurable rather than hard-coded.

Priority placement must never bypass provider approval, verification, subscription state, suspension rules, exact-service eligibility, island-matching rules, or safety controls.

---

## 3. Launch Promotional Pricing Timeline

The supplied launch promotion is recorded as follows:

| Promotion Stage | Registration / Campaign Period | Commercial Label | Provider Charge |
|---|---:|---:|---:|
| Stage 1 | Day 1–15 | 100% free | MVR 0 |
| Stage 2 | Day 16–30 | approximately 90% off | MVR 30 |
| Stage 3 | Day 31–60 | approximately 50% off | MVR 150 |
| Stage 4 | Day 61–90 | approximately 25% off | MVR 225 |
| Standard | Day 91+ / Month 4+ | full price | MVR 299 |

The platform should display the actual payable amount as the authoritative figure. Percentage labels are marketing descriptions and should be calculated from configured list price rather than relied on as billing inputs.

---

## 4. Promotion Eligibility

The system shall support promotion eligibility based on configurable campaign rules, including:

- campaign active/inactive status
- campaign start/end timestamp
- qualifying provider registration date/time
- qualifying plan
- qualifying account/provider status
- optional provider-count/cap limit
- optional promo code/source/campaign channel
- whether a provider can receive more than one promotion

Promotion qualification must be determined server-side and stored with the subscription/promotion record.

A provider must not obtain a more favorable stage by manipulating client time, account metadata, device time, or request payloads.

---

## 5. Billing Schedule Presentation

During registration/onboarding, a qualifying provider should be shown:

- registration date
- current promotion stage
- current payable amount
- standard list price
- future scheduled stages
- promotion end date
- standard recurring price after promotion
- whether a founding-provider lifetime discount applies

The provider must acknowledge the future pricing schedule before activating the promotional subscription when required by policy.

Example customer-facing concept:

```text
Days 1–15:  MVR 0
Days 16–30: MVR 30
Days 31–60: MVR 150
Days 61–90: MVR 225
Day 91+:    MVR 299 standard price
```

The actual billing engine must derive dates from authoritative campaign/subscription records rather than static screen text.

---

## 6. Subscription Dashboard Requirements

Provider dashboard should support:

- plan name
- current subscription status
- launch-promotion badge/status
- active promotional stage
- current charge
- next charge and date
- future promotional stages
- standard post-promotion rate
- applied founding-provider discount, if any
- billing/payment history
- payment-method management where supported
- total promotional savings calculated from actual billing periods

Upcoming charges should be clearly distinguished from already-paid charges.

---

## 7. Founding Provider Program

The platform shall support a `FOUNDING_PROVIDER` designation for qualifying early providers.

Possible benefits from the supplied strategy:

- Founding Provider badge
- priority support
- marketing-feature eligibility
- community/early-adopter access where implemented
- lifetime subscription discount according to qualification stage

The badge must indicate platform early-adopter status only and must not imply government certification, superior technical qualification, or guaranteed service quality.

---

## 8. Lifetime Early-Adopter Discount Schedule

The supplied lifetime-discount schedule is recorded as a commercial rule candidate:

| Initial Qualification Period | Lifetime Discount Candidate |
|---|---:|
| Days 1–15 | 20% |
| Days 16–30 | 15% |
| Days 31–60 | 10% |
| Days 61–90 | 5% |
| Day 91+ | 0% |

Implementation rules:

- lifetime discount must be stored as an explicit entitlement/discount record
- it must not be inferred later from mutable registration metadata
- rules must define whether the discount survives cancellation/reactivation
- rules must define whether it applies after plan upgrade/downgrade
- rules must define whether it stacks with other promotions
- rules must define whether it applies to tax/fees or only base subscription amount
- admin override must require permission, reason, and audit history

Because these edge cases were not specified in the source strategy, they remain **NEEDS DECISION** before billing implementation.

---

## 9. Promotional Notifications

The notification engine shall support campaign-stage reminders and conversion messaging.

Suggested campaign messages/timing from the supplied strategy include:

- Days 1–3: free-listing onboarding message
- Days 5–7: provider acquisition/social-proof reminder
- Days 12–14: free-period ending reminder
- Day 15: final free-period reminder
- Day 16: first paid promotional-stage notice
- Day 30: next-stage price-change notice
- Month 2: 50%-stage reminder
- end of Month 2: Month 3 price-change reminder

Requirements:

- message templates must be configurable
- exact timing must be configurable
- channels follow user notification preferences and mandatory billing-notice rules
- billing notices should state actual charge and effective date
- marketing scarcity messages such as `only X spots left` must only be displayed when backed by an actual configured capacity/count; they must not be fabricated

---

## 10. Promotion Data Model Additions

Recommended entities/fields:

### `subscription_campaigns`

- `id`
- `code`
- `name`
- `plan_id`
- `status`
- `starts_at`
- `ends_at`
- `standard_price_snapshot`
- `currency_code`
- `provider_limit` nullable
- `created_at`
- `updated_at`

### `subscription_campaign_stages`

- `id`
- `campaign_id`
- `stage_no`
- `start_offset_days`
- `end_offset_days`
- `charge_amount`
- `marketing_discount_percent` nullable
- `created_at`

### `provider_campaign_enrollments`

- `id`
- `provider_id`
- `campaign_id`
- `subscription_id`
- `qualified_at`
- `qualification_stage`
- `founding_provider`
- `lifetime_discount_percent` nullable
- `status`
- `created_at`

### `subscription_price_schedule`

- `id`
- `subscription_id`
- `effective_from`
- `effective_to` nullable
- `base_price`
- `promotion_discount`
- `lifetime_discount`
- `final_charge`
- `currency_code`
- `source_campaign_id` nullable
- `created_at`

Exact physical schema will be synchronized into Step 6 before implementation.

---

## 11. Billing Calculation Rules

The billing system must treat monetary amounts as authoritative configuration and compute any displayed percentage/savings from those amounts.

Required calculation properties:

- deterministic
- idempotent
- timezone-safe
- server-authoritative
- auditable
- historical price snapshots preserved
- no silent retroactive pricing changes

Every generated charge should identify:

- list/base price
- promotional discount
- lifetime/founding discount
- other approved discount, if any
- tax/fees if applicable
- final charge amount
- currency
- effective billing period

---

## 12. Important Commercial Reconciliation Note

The supplied strategy states `Total Savings in First 3 Months: MVR 791` by adding the savings shown for each promotional row.

That figure should **not be hard-coded** because the first 30 days are two halves of the same first monthly period while the base plan is stated as `MVR 299/month`.

If the intended commercial structure is:

- Month 1 total charge = MVR 30
- Month 2 total charge = MVR 150
- Month 3 total charge = MVR 225

then compared with three standard months (`3 × 299 = MVR 897`), the promotional first-three-month charge is `MVR 405`, producing `MVR 492` of savings before any lifetime discount.

If a different billing interpretation is intended, finance/business owners must approve it explicitly and the system should calculate the result from the configured schedule.

Therefore:

- staged charge amounts are recorded
- `MVR 791` is treated as an illustrative source figure, not an authoritative billing constant
- billing-period normalization is **NEEDS DECISION** before production charging

---

## 13. Financial Projection Treatment

The supplied provider/revenue forecasts are retained as business-planning assumptions only, not system requirements.

The example counts (`50`, `30`, `15`, `5`) appear to represent acquisition cohorts rather than a recurring subscription cohort model. Production financial forecasting should model:

- provider registration cohort
- activation rate
- promotional stage
- payment success
- churn
- retention
- lifetime discount
- upgrade/downgrade
- reactivation
- taxes/fees where applicable

These projections must not drive subscription state changes.

---

## 14. Admin Requirements

Authorized finance/platform admins should be able to:

- create/edit/activate/deactivate campaigns
- configure stages and charges before campaign activation
- configure provider limits
- inspect provider campaign qualification
- view upcoming scheduled charges
- view promotional conversion metrics
- view founding-provider entitlements
- make approved corrections with audit reason

Once a campaign has active enrollments, changes affecting already-promised pricing should be versioned rather than silently overwriting historical terms.

---

## 15. Reporting

Campaign reporting should support:

- providers enrolled by stage
- activation rate
- payment conversion by stage
- promotion-to-standard conversion rate
- churn before/after standard pricing
- founding-provider count
- lifetime-discount liability/impact
- subscription revenue by cohort
- average revenue per promoted provider
- renewal rate
- campaign acquisition source where captured

---

## 16. Acceptance Criteria

At minimum:

1. A provider qualifying in Days 1–15 receives MVR 0 current-stage pricing.
2. A provider qualifying in Days 16–30 receives the configured MVR 30 stage where campaign rules specify it.
3. Stage qualification uses server-authoritative campaign time.
4. Dashboard displays current and next charge correctly.
5. Subscription history preserves the campaign and price applied at each billing period.
6. Expired/inactive promotion does not apply to non-qualifying providers.
7. Founding Provider status is preserved according to configured entitlement rules.
8. Lifetime-discount percentage is stored explicitly and audited.
9. Admin cannot silently alter historical charged periods.
10. Marketing percentage/savings display is computed from configured amounts.
11. A fake scarcity message cannot be generated without actual capacity/count data.
12. Subscription eligibility continues to obey provider approval, suspension, verification and payment rules.
13. Customer repair-payment scope remains unaffected.
14. Campaign financial reporting is cohort-based and does not change transactional truth.

---

## 17. Decisions Still Required Before Billing Code

The promotional structure is now documented, but the following must be finalized before production billing:

- whether Day 1–15 / Day 16–30 are one split Month-1 charge or separate billable periods
- exact effective date of the campaign
- whether qualifying stage is based on platform launch date or each provider's own registration age
- whether the lifetime discount applies immediately after the 90-day promotion or from the first paid standard renewal
- stacking rules between promotional and lifetime discounts
- treatment after cancellation/reactivation
- upgrade/downgrade behavior
- tax/fee treatment
- refund/charge reversal rules for subscription payments
- whether the Professional 30-lead entitlement is enforced during launch
- whether priority placement is part of MVP or later commercial ranking

Until these are approved, the implementation must remain configurable and must not infer unsupported billing behavior.

---

## 18. Cross-Document Rule

This document adds the launch-promotion model to the subscription architecture.

Existing authoritative rules remain:

- provider subscription is the initial iFixIt monetization model
- payment success alone does not approve a provider
- approval alone does not bypass a required subscription
- suspension overrides new marketplace eligibility
- customer repair settlement remains outside iFixIt MVP
- plan entitlements and prices should be configuration/master data rather than application-code constants

**Launch subscription promotion is now recorded in the iFixIt blueprint.**