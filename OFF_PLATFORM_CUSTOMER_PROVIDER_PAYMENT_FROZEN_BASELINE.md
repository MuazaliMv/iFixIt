# Off-Platform Customer ↔ Provider Payment — Frozen Baseline

## Core rule
FixIt is **not** responsible for collecting, holding, routing, settling, refunding, or paying out customer service payments.

Payment occurs **directly between the customer and the provider outside FixIt**.

Examples include:
- cash paid directly to the provider;
- bank transfer made directly to the provider;
- another direct payment method agreed by customer and provider.

## FixIt does not
- collect customer money;
- hold escrow or wallet balances for service payments;
- act as merchant of record;
- route money to providers;
- deduct marketplace commissions from customer service payments;
- settle provider balances or run provider payout queues for customer service payments;
- guarantee receipt of funds;
- issue refunds on behalf of providers.

## FixIt may
- display provider-entered post-inspection cost information;
- display permitted provider payment instructions after the appropriate lifecycle stage;
- let the customer record that they paid directly;
- let the provider confirm that payment was received directly;
- store optional payment references/proof for audit/support purposes;
- store/view provider-issued invoices or receipts;
- facilitate a payment-related support/dispute case.

Customer-submitted proof or transfer reference is **not** authoritative confirmation of receipt. Provider confirmation is the platform-side acknowledgement that direct payment was received.

## Revised UC-C29 direction
UC-C29 is no longer an in-platform payment-processing flow. It is:

**View Post-Inspection Cost & Record Direct Payment Information**

Suggested sub-use cases:
1. Provider records cost breakdown.
2. Customer views cost breakdown.
3. Customer requests cost clarification.
4. Provider revises cost with version history.
5. Customer records intended direct payment method.
6. Customer views provider payment instructions.
7. Customer records direct-payment declaration.
8. Provider confirms direct payment received.
9. Provider disputes a customer payment declaration.
10. Customer views provider invoice/receipt document.
11. Customer views direct-payment record/history.
12. Customer raises payment-related support case.

Recommended informational statuses:
- NOT_RECORDED
- CUSTOMER_DECLARED_PAID
- CONFIRMED_BY_PROVIDER
- DISPUTED
- CANCELLED_RECORD

## Related architecture rules
- No customer payment gateway is required for the marketplace core.
- No provider payout queue exists for customer-to-provider service payments.
- Organization billing approvals may approve costs internally, but money still moves directly from organization/customer to provider.
- FixIt zero-fee cancellation means FixIt does not charge a cancellation fee before work starts. Any direct provider charges would require separately approved business rules.
- Any future FixIt revenue model (for example provider subscription fees) must be architecturally separate from customer-to-provider service payments.
