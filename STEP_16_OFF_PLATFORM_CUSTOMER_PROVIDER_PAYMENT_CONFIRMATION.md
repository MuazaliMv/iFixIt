# iFixIt — Step 16: Off-Platform Customer ↔ Provider Payment Confirmation

**Document Type:** Repair Settlement / Off-Platform Payment Record Specification  
**Status:** Implementation Guidance Baseline  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

This document records the direct customer-to-provider repair-payment details that were not already fully explicit in the iFixIt blueprint.

The existing MVP rule remains authoritative:

> iFixIt does not collect, hold, settle, escrow, split, or pay out customer repair-service funds in MVP. Customers pay providers directly outside the platform.

This step adds only the supporting marketplace record/UX around that off-platform settlement:

- provider accepted payment methods
- provider payment instructions/details
- customer `I Have Paid` acknowledgement
- provider `Payment Received` acknowledgement
- off-platform payment-status record
- payment issue/dispute evidence
- customer/provider history and reporting

This does **not** turn iFixIt into a payment processor.

---

## 2. Core Payment Principle

Canonical repair settlement model:

`Job completed → final agreed job value recorded → customer pays provider directly → customer may acknowledge payment → provider may confirm receipt → iFixIt records the parties' declarations → job/payment history remains auditable`

The platform must clearly state wherever payment instructions appear:

`Payment is made directly to the provider. iFixIt does not process or hold this repair payment.`

---

## 3. Supported Off-Platform Payment Methods

Provider profile/settings may declare accepted payment methods such as:

- `CASH`
- `BANK_TRANSFER`
- `MOBILE_MONEY`
- `CARD_AT_PROVIDER`
- `OTHER`

The list must be configurable master/configuration data rather than hard-coded to specific brands.

Provider-specific method details may include:

### Bank transfer
- bank name
- account holder/name
- account/reference number
- branch/details where relevant

### Mobile money / local transfer
- provider/service label
- receiving phone/account identifier

### Card at provider
- simply indicates that the provider can accept card directly through their own terminal/device

The platform must not collect the customer's card number or route the repair payment in MVP.

---

## 4. Provider Payment Detail Management

Provider dashboard should support a `Payment Details` area where the provider can:

- enable/disable accepted methods
- maintain bank-transfer instructions
- maintain mobile-payment details
- mark cash accepted
- mark direct card payment accepted where applicable
- add safe payment notes/instructions

Requirements:

- provider can edit only their own payment details
- sensitive values should be access-controlled and displayed only where needed
- changes must be audited where they materially affect customer payment instructions
- historical jobs should preserve the payment-detail snapshot/reference used at the time where required for dispute evidence
- no provider may upload arbitrary executable content into payment instructions

---

## 5. Payment Information Screen

After the provider records job completion and the final authorized job value is known, the customer may see:

- service
- provider
- job/request reference
- completion date/time
- final agreed/recorded amount
- currency (MVR by default for MVP)
- provider accepted payment methods
- provider payment instructions according to the selected method
- direct-payment disclaimer

Possible actions:

- `I Have Paid the Provider`
- `Report Payment Issue`
- `Call / WhatsApp Provider` where contact policy allows
- `View Job`

The UI must never imply that clicking `I Have Paid` transfers money.

---

## 6. Customer Payment Acknowledgement

The customer may submit an off-platform payment acknowledgement.

Fields:

- job ID
- declared amount paid
- currency
- payment method used
- paid-at timestamp (optional customer input; server records submission time)
- notes optional
- evidence attachment optional (e.g. transfer receipt screenshot)

Customer declaration text should be clear, for example:

`I confirm that I paid the provider directly outside iFixIt.`

The customer must not be forced to assert that the provider received funds unless the customer actually knows this.

Therefore the source mockup checkbox `The provider has received the payment` is **not** a required customer assertion; provider receipt is recorded separately.

---

## 7. Provider Receipt Confirmation

The provider may confirm receipt for an eligible completed job.

Fields:

- job ID
- amount received
- currency
- payment method
- received-at timestamp optional
- notes optional

Provider declaration example:

`I confirm that I received this payment directly from the customer outside iFixIt.`

This action does not create a platform financial transaction. It records the provider's acknowledgement only.

---

## 8. Off-Platform Payment Status Model

Recommended logical statuses:

- `NOT_RECORDED`
- `CUSTOMER_REPORTED_PAID`
- `AWAITING_PROVIDER_CONFIRMATION`
- `CONFIRMED_BY_BOTH`
- `ISSUE_REPORTED`
- `DISPUTED`
- `RESOLVED`

Important distinction:

`CONFIRMED_BY_BOTH` means both parties have recorded matching declarations. It does **not** mean iFixIt independently verified movement of funds.

Customer and provider declarations may disagree on:

- amount
- method
- date
- whether payment occurred

A mismatch should move the off-platform payment record into a review/issue state rather than overwriting one party's declaration.

---

## 9. Job Lifecycle Relationship

Repair completion and repair-payment confirmation must remain separate concepts.

Recommended rule:

- provider can mark repair work completed according to the normal job state machine
- customer can confirm/reject completion according to job rules
- off-platform payment acknowledgement may follow completion
- review eligibility should continue to depend on an eligible completed/finalized platform job, not on iFixIt having processed money

A job may display a composite label such as `Completed — Payment Confirmed by Both Parties`, but payment confirmation should not be implemented as a hidden substitute for the canonical job state.

Whether job finalization is blocked until both payment declarations exist is a business-policy choice and should remain configurable; iFixIt must not force a false payment status merely to close a repair job.

---

## 10. Data Model Additions

Use a repair-settlement entity distinct from provider-subscription payments.

### `repair_payment_records`

Suggested fields:

- `id` UUID
- `job_id` UUID unique or versioned according to policy
- `customer_id` UUID
- `provider_id` UUID
- `agreed_job_amount` numeric
- `currency_code` default `MVR`
- `status`
- `customer_declared_amount` numeric nullable
- `customer_payment_method` nullable
- `customer_confirmed_at` nullable
- `customer_notes` nullable
- `provider_declared_amount` numeric nullable
- `provider_payment_method` nullable
- `provider_confirmed_at` nullable
- `provider_notes` nullable
- `discrepancy_flag` boolean
- `created_at`
- `updated_at`

### `repair_payment_evidence`

- `id`
- `repair_payment_record_id`
- `uploaded_by_user_id`
- `file_id/storage_key`
- `evidence_type`
- `created_at`

### `provider_payment_methods`

- `id`
- `provider_id`
- `method_type`
- `display_label`
- `details_encrypted_or_restricted`
- `is_active`
- `is_default`
- `created_at`
- `updated_at`

Physical schema must be synchronized with Step 6 before coding.

---

## 11. Payment Issue / Dispute Flow

Either party may report an off-platform payment issue linked to the repair-payment record or job.

Supported issue examples:

- `NON_PAYMENT`
- `UNDERPAYMENT`
- `OVERPAYMENT`
- `AMOUNT_DISAGREEMENT`
- `PAYMENT_METHOD_PROBLEM`
- `PAYMENT_DELAY`
- `RECEIPT_DISPUTE`
- `OTHER`

Flow:

`Issue reported → case/reference created → evidence collected → admin reviews declarations/job/quote/communication/evidence → parties contacted where needed → resolution recorded → parties notified → case closed/escalated`

Admin may record conclusions such as:

- customer declaration supported
- provider declaration supported
- amount corrected by agreement
- parties reached mutual agreement
- unresolved / external escalation recommended

Because iFixIt did not hold the money, admin must not claim to reverse, refund, charge back, or compensate the repair payment unless a future regulated/payment feature actually gives iFixIt that capability.

---

## 12. Evidence & Audit Requirements

The system should preserve:

- final approved/recorded job price or quote version
- customer payment declaration
- provider receipt declaration
- timestamps
- method declarations
- evidence attachments
- disagreement history
- admin resolution notes
- audit events for administrative changes

No ordinary UI action should destructively erase historical payment declarations after they become relevant to a dispute.

---

## 13. Notifications

Possible service notifications:

### To provider
- customer reported payment
- customer reported payment issue
- payment declaration mismatch
- admin requested evidence
- issue resolved

### To customer
- provider confirmed receipt
- provider reported payment issue
- payment declaration mismatch
- admin requested evidence
- issue resolved

Channels follow configured notification preferences and service-notification policy.

Notification failure must not alter the recorded declaration/issue transaction.

---

## 14. Privacy & Security

Provider bank/mobile payment details are personal/financial-contact data and must be protected appropriately.

Requirements:

- expose only to customers who have a legitimate service/payment relationship where policy requires
- do not index provider bank details publicly
- do not include sensitive account details in analytics/log output
- use encryption/restricted storage for sensitive fields
- enforce ownership and role authorization server-side
- apply file security to uploaded payment evidence
- rate-limit abuse/report endpoints
- audit admin access/corrections to payment-dispute records where appropriate

---

## 15. Reporting

Reporting may include:

- recorded completed-job value
- percentage of completed jobs with customer payment acknowledgement
- percentage with provider receipt confirmation
- confirmation mismatch rate
- payment issues by type
- unresolved payment issue count
- average time from completion to dual confirmation

All dashboards must clearly distinguish:

- **provider subscription revenue processed by iFixIt**
from
- **repair job value / off-platform settlement declarations not processed by iFixIt**

---

## 16. Explicit Non-Goals for MVP

This feature does **not** add:

- customer repair checkout through iFixIt
- escrow
- wallet
- stored-value account
- card acquiring for repair jobs
- provider payouts
- split payments
- platform repair commission
- automatic repair refunds
- chargebacks handled by iFixIt

Those remain future-phase capabilities only if separately approved and legally/operationally supported.

---

## 17. Important Reconciliation Notes

The source proposal includes claims such as `No regulatory burden`, `No payment risk`, and `No dispute liability` for the platform.

These should **not** be treated as guaranteed legal conclusions. The product architecture reduces payment-processing complexity because iFixIt does not hold repair funds, but privacy, consumer-protection, recordkeeping, advertising, complaint-handling, subscription billing and other obligations may still apply.

The system specification therefore records the technical/business boundary without making categorical legal-liability promises.

---

## 18. Acceptance Criteria

1. Provider can configure supported direct payment methods without enabling iFixIt repair-payment processing.
2. Customer sees a clear direct-payment disclaimer before payment acknowledgement.
3. Customer can declare an off-platform payment against only their own eligible job.
4. Provider can confirm receipt only for an assigned/eligible job.
5. Customer and provider declarations are stored independently.
6. A mismatch does not silently overwrite either declaration.
7. `CONFIRMED_BY_BOTH` is shown only after both qualifying declarations agree according to configured reconciliation rules.
8. No repair-payment confirmation creates a provider payout, wallet balance, escrow balance or platform-held repair transaction.
9. Payment evidence is protected by ownership/role access rules.
10. Payment issues can be linked to the job and complaint/dispute workflow.
11. Admin resolution is audited and cannot fabricate a platform refund that never occurred.
12. Repair job value is reported separately from provider-subscription revenue.
13. External notification failure does not roll back a valid acknowledgement.
14. Review eligibility continues to follow completed/finalized job rules rather than requiring platform payment processing.
15. Provider bank/mobile details are not exposed publicly without a legitimate service/payment context.

---

## 19. Cross-Document Rule

This step supplements but does not replace:

- `MVP_BUSINESS_MODEL_AND_SCOPE_FREEZE.md`
- `STEP_3_DETAILED_USE_CASES_AND_BUSINESS_RULES.md`
- `STEP_6_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`
- `STEP_7_API_CONTRACTS.md`
- `STEP_8_ROLES_AND_PERMISSION_MATRIX.md`
- `STEP_9_FORMAL_STATE_TRANSITION_MATRICES.md`
- `STEP_10_TEST_CASES_AND_ACCEPTANCE_CRITERIA.md`
- `STEP_12_BUSINESS_SPECIFICATION_RECONCILIATION.md`
- `STEP_13_CUSTOMER_COMPLAINT_AND_RATING_SYSTEM.md`

**Repair-service funds remain outside iFixIt MVP. This document records only the parties' off-platform payment methods, acknowledgements, evidence and disputes.**
