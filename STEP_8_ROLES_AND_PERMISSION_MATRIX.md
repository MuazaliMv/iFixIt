# iFixIt — Step 8: Roles & Permission Matrix

**Document Type:** Authorization Specification  
**Status:** Draft for approval  
**Version:** 1.0  
**Date:** 2026-08-19

---

## 1. Purpose

Defines who can see and perform each protected action. Backend authorization is authoritative; UI visibility is secondary.

Roles:
- Visitor
- Customer
- Provider / Technician
- Business Provider
- Admin
- Limited Admin (permission-driven subset)
- System Automation

---

## 2. Authorization Model

A protected action is allowed only when all required checks pass:

`Authenticated AND AccountActive AND RoleAllowed AND PermissionAllowed AND Ownership/RelationshipAllowed AND EntityStateAllowsAction`

For provider marketplace actions, also require provider eligibility.

---

## 3. Permission Codes

Recommended admin permission codes:
- `customer.view`
- `customer.manage`
- `provider.view`
- `provider.verify`
- `provider.approve`
- `provider.suspend`
- `service.view`
- `service.manage`
- `location.view`
- `location.manage`
- `request.view_all`
- `request.assign`
- `request.reassign`
- `job.view_all`
- `job.correct_state`
- `quotation.view_all`
- `complaint.view`
- `complaint.resolve`
- `warranty.view`
- `warranty.manage`
- `review.moderate`
- `subscription.view`
- `subscription.manage`
- `payment.view`
- `payment.reconcile`
- `report.view`
- `audit.view`
- `config.manage`

---

## 4. Core Permission Matrix

Legend: `✓` allowed, `Own` own/related resource only, `—` denied, `P` explicit admin permission required.

| Function | Visitor | Customer | Provider | Admin |
|---|---:|---:|---:|---:|
| Browse services | ✓ | ✓ | ✓ | ✓ |
| Search public providers | ✓ | ✓ | ✓ | ✓ |
| View public provider profile | ✓ | ✓ | ✓ | ✓ |
| Create repair request | — | ✓ | — | P if support function added |
| View repair request | — | Own | Assigned/related | P |
| Cancel repair request | — | Own when allowed | — | P |
| Upload customer problem media | — | Own | — | P |
| Manage customer profile | — | Own | — | P |
| Create provider application | — | ✓ | ✓ | — |
| Manage provider profile | — | — | Own | P |
| Select provider services | — | — | Own | P |
| Select provider areas | — | — | Own | P |
| Manage availability | — | — | Own | P |
| Submit verification | — | — | Own | P if admin-assisted |
| Review verification | — | — | — | P |
| Approve provider | — | — | — | P |
| Suspend/reactivate provider | — | — | — | P |
| Receive lead | — | — | Own | P view-all |
| Accept/decline lead | — | — | Own | — |
| Assign provider | — | — | — | P |
| Reassign provider | — | — | — | P |
| Schedule inspection | — | — | Assigned | P |
| Record diagnosis | — | — | Assigned | P |
| Create quote | — | — | Assigned | P if corrective admin flow |
| View quote | — | Own | Assigned | P |
| Approve/reject quote | — | Own | — | — |
| Start repair | — | — | Assigned | P in correction-only flow |
| Add progress | — | — | Assigned | P |
| Add parts/labour | — | — | Assigned | P |
| Complete repair | — | — | Assigned | P in correction-only flow |
| Confirm completion | — | Own | — | — |
| Dispute completion | — | Own | — | P support |
| Submit review | — | Own eligible job | — | — |
| Edit review | — | Own within window | — | — |
| Moderate review | — | — | — | P |
| Submit complaint | — | Own/related | Own/related | P if staff-created allowed |
| Resolve complaint | — | — | — | P |
| View warranty | — | Own | Related | P |
| Submit warranty claim | — | Own | — | — |
| Resolve/manage warranty claim | — | — | Related where policy allows | P |
| View subscription | — | — | Own | P |
| Renew subscription | — | — | Own | — |
| Extend subscription | — | — | — | P |
| View payment | — | Own if customer payments enabled | Own | P |
| Reconcile payment | — | — | — | P |
| Manage service catalogue | — | — | — | P |
| Manage locations | — | — | — | P |
| View reports | — | — | Own dashboard only | P |
| View audit log | — | — | — | P |
| Manage configuration | — | — | — | P |

---

## 5. Customer Ownership Rules

Customer may access only resources linked to their authenticated customer profile, including:
- repair requests
- jobs
- quotations
- reviews
- complaints
- warranties
- warranty claims
- payment records if customer payments are later enabled

Changing a URL or resource ID must not grant access to another customer’s record.

---

## 6. Provider Relationship Rules

Provider private access is limited to:
- own provider profile/configuration
- leads explicitly addressed to provider
- assignments/jobs assigned to provider
- inspections/quotes/parts/labour for assigned jobs
- own subscription/payments
- reviews about their completed work through provider-safe projection
- complaints/warranty claims where provider participation is authorized

Provider must not see unrelated customer requests or private competitor data.

---

## 7. Business Provider Rule

Business Provider initially receives same core marketplace permissions as Provider/Technician. Staff/team sub-roles are deferred unless separately approved.

Architecture should allow future roles such as:
- Business Owner
- Dispatcher
- Technician Staff
- Finance Staff

No such future role should be granted implicitly in MVP.

---

## 8. Admin Segregation of Duties

Recommended admin profiles:

### Operations Admin
- requests/jobs
- assignments/reassignments
- complaints
- warranty operations

### Provider Admin
- provider verification
- approval
- suspension/reactivation

### Finance Admin
- subscription
- payments
- reconciliation

### Catalogue Admin
- services
- locations

### Reporting/Audit Admin
- reports
- audit read-only

### Platform Admin
- all approved permissions
- MFA mandatory

Sensitive permissions should not be automatically granted merely because a user has an `admin` label.

---

## 9. High-Risk Actions

Require explicit permission + confirmation + audit reason where relevant:
- provider rejection/suspension
- provider reactivation after suspension
- manual assignment/reassignment
- job state correction
- subscription extension/override
- payment reconciliation/correction
- complaint resolution
- review moderation
- warranty administrative override
- system configuration change

---

## 10. UI Rules

- Hide navigation the user cannot access.
- Hide actions impossible for role/relationship.
- Disable actions temporarily unavailable due to state where showing context is useful.
- Never rely on hidden buttons for security.
- On server denial, show safe `403`/not-authorized state without leaking resource details.

---

## 11. Step 8 Approval Gate

- [ ] Core roles approved
- [ ] Permission codes approved
- [ ] Customer ownership rules approved
- [ ] Provider relationship rules approved
- [ ] Admin segregation approved
- [ ] High-risk action controls approved
- [ ] UI permission behavior approved

After approval, proceed to Step 9 Formal State Transition Matrices.
