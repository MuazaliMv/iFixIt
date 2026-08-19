# iFixIt — Implemented vs Target Architecture

**Status:** Implementation traceability source of truth  
**Current database implementation:** migrations 0001–0006  
**Date:** 2026-08-19

## Status Definitions

- **IMPLEMENTED FOUNDATION** — represented by committed migration/schema logic today.
- **DOCUMENTED / PLANNED** — approved or documented requirement, but not yet fully implemented in committed migrations/application services.
- **TARGET / OPTIONAL INTEGRATION** — external infrastructure or technology choice shown in architecture diagrams but not yet selected/implemented as an authoritative dependency.

## Capability Matrix

| Capability | Status | Current source / next step |
|---|---|---|
| Users | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Phone / OTP authentication data model | IMPLEMENTED FOUNDATION | `0002_auth_rbac.sql` |
| Roles / permissions / user-role mappings | IMPLEMENTED FOUNDATION | `0002_auth_rbac.sql` |
| Auth sessions / attempts / security events | IMPLEMENTED FOUNDATION | `0002_auth_rbac.sql` |
| Canonical Atolls / Islands | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Island aliases | IMPLEMENTED FOUNDATION | `0003_location_catalogue.sql` |
| Category → Subcategory → Exact Service | IMPLEMENTED FOUNDATION | `0003_location_catalogue.sql` |
| FIXED_PRICE / DIAGNOSIS_REQUIRED metadata | IMPLEMENTED FOUNDATION | `0003_location_catalogue.sql` |
| Provider profiles | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Legal registration vs operational base | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` |
| Provider exact services | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Provider service pricing | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Provider approved service islands | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Weekly availability / overrides | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Verification document metadata | IMPLEMENTED FOUNDATION | `0004_provider_onboarding_service_areas_availability.sql` |
| Repair request core | IMPLEMENTED FOUNDATION | `0001_core_domain.sql` + 0003 binding |
| Direct Provider Booking model | IMPLEMENTED FOUNDATION | 0001 + `0005_search_tier_matching_engine.sql` |
| Smart Matching model | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Tier 0–3 matching | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Matching-attempt audit / candidates | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Provider leads / offer expiry / decline | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Exclusive assignments / atomic acceptance | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Direct Booking fallback consent | IMPLEMENTED FOUNDATION | `0005_search_tier_matching_engine.sql` |
| Repair job core | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Job state machine | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Job status history | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Job scheduling history | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Job progress/timeline events | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Request↔job coarse status synchronization | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Job creation from accepted assignment | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Safe job reassignment linkage | IMPLEMENTED FOUNDATION | `0006_repair_jobs_lifecycle.sql` |
| Inspections | DOCUMENTED / PLANNED | Migration 0007 |
| Versioned quotations / customer approval | DOCUMENTED / PLANNED | Migration 0007 |
| Completion evidence / warranty foundation | DOCUMENTED / PLANNED | Migration 0007 |
| Off-platform payment acknowledgement | DOCUMENTED / PLANNED | Migration 0008 |
| Payment disagreement/dispute records | DOCUMENTED / PLANNED | Migration 0008 |
| Reviews / ratings | DOCUMENTED / PLANNED | Migration 0009 |
| Complaints / moderation | DOCUMENTED / PLANNED | Migration 0009 |
| Multi-channel notification engine | DOCUMENTED / PLANNED | Migration 0009 |
| Provider subscriptions | DOCUMENTED / PLANNED | Migration 0010 |
| Promotional campaigns / Founding Provider | DOCUMENTED / PLANNED | Migration 0010 |
| Subscription eligibility bound to matching | DOCUMENTED / PLANNED | Migration 0010 |
| Admin operational reporting | DOCUMENTED / PLANNED | Migration 0011 |
| Security / performance hardening | DOCUMENTED / PLANNED | Migration 0012 |
| WhatsApp Business API | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| SMS gateway | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| Email / push provider | TARGET / OPTIONAL INTEGRATION | Integration adapter; provider/vendor not yet frozen |
| Object storage | TARGET / OPTIONAL INTEGRATION | Private media/document storage required; vendor not yet frozen |
| Maps / routing vendor | TARGET / OPTIONAL INTEGRATION | Supplementary; canonical islands remain authoritative |
| Identity / business verification vendor | TARGET / OPTIONAL INTEGRATION | Optional integration |
| Redis / cache technology | TARGET / OPTIONAL INTEGRATION | Not required for business correctness |
| Queue / worker technology | TARGET / OPTIONAL INTEGRATION | Runtime/vendor not frozen |
| Kubernetes | TARGET / OPTIONAL INTEGRATION | Deployment option, not an approved requirement |
| Full in-app chat | TARGET / OPTIONAL / DEFERRED | Not required for MVP unless explicitly approved |

## Data Model Standard

New database work must follow [`DATA_MODEL_STANDARD.md`](DATA_MODEL_STANDARD.md): domain-driven normalized PostgreSQL, canonical master data, explicit state machines, append-oriented history, strict financial-domain separation and forward-only migrations.

## Non-Negotiable Rules Regardless of Implementation Phase

1. Free-text island strings never determine provider eligibility.
2. Cross-atoll assignment is never silent.
3. UI visibility never substitutes for server-side authorization.
4. Direct Booking cannot silently reassign the customer to another provider.
5. Customer repair money is not held, escrowed, split, refunded or paid out by iFixIt in MVP.
6. Provider subscription payments are distinct from repair-payment acknowledgement.
7. DIAGNOSIS_REQUIRED repair work cannot bypass customer approval of the current quotation version.
8. Exclusive provider acceptance must remain atomic/concurrency-safe.
9. Sensitive administrative decisions require audit history.
10. Repair request, lead, assignment and repair job remain separate domain entities.

## Migration Roadmap

```text
0001 Core Domain                         IMPLEMENTED
0002 Authentication & RBAC              IMPLEMENTED
0003 Location Master & Service Catalogue IMPLEMENTED
0004 Provider Onboarding                IMPLEMENTED
0005 Search & Tier-Based Matching       IMPLEMENTED
0006 Repair Jobs & Lifecycle            IMPLEMENTED
0007 Inspection / Quotation / Completion NEXT
0008 Off-Platform Payment Acknowledgement
0009 Reviews / Complaints / Notifications
0010 Provider Subscriptions / Promotions
0011 Admin / Reporting
0012 Security / Performance Hardening
```

## Usage Rule

For developers and reviewers, this matrix bridges target architecture and committed implementation. Do not infer that an architecture box is production-ready merely because it appears in a diagram.
