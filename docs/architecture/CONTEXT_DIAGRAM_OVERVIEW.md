# iFixIt — Architecture Context Overview

**Status:** Consolidated architecture index  
**Scope:** Context diagrams, implementation status, and migration traceability  
**Date:** 2026-08-19

## Purpose

This package consolidates the iFixIt system-context views into one GitHub source of truth. The diagrams describe the target MVP architecture, while `IMPLEMENTED_VS_TARGET_ARCHITECTURE.md` distinguishes what is already represented in committed migrations from what remains planned.

## Context Diagram Levels

- [`CONTEXT_DIAGRAM_LEVEL_0.md`](CONTEXT_DIAGRAM_LEVEL_0.md) — external actors and systems around iFixIt.
- [`CONTEXT_DIAGRAM_LEVEL_1.md`](CONTEXT_DIAGRAM_LEVEL_1.md) — major iFixIt capabilities and external dependencies.
- [`CONTEXT_DIAGRAM_LEVEL_2.md`](CONTEXT_DIAGRAM_LEVEL_2.md) — channels, application domains, cross-cutting services, data layer, and trust boundaries.
- [`CONTEXT_DIAGRAM_LEVEL_3.md`](CONTEXT_DIAGRAM_LEVEL_3.md) — detailed target system-of-systems view and implementation boundaries.
- [`IMPLEMENTED_VS_TARGET_ARCHITECTURE.md`](IMPLEMENTED_VS_TARGET_ARCHITECTURE.md) — authoritative implementation-status matrix.

## Architectural Principles

1. Canonical Maldives geography uses Atoll → Island IDs; free text is never the authoritative matching key.
2. Local-first matching uses Tier 0 through Tier 3, with cross-atoll expansion requiring explicit authorization.
3. Direct Provider Booking and Smart Matching are separate supported booking models.
4. Customer repair payments remain directly between customer and provider; iFixIt does not hold repair funds in MVP.
5. Provider subscriptions are the initial platform monetization model.
6. `FIXED_PRICE` and `DIAGNOSIS_REQUIRED` workflows remain distinct.
7. Provider acceptance must be atomic and concurrency-safe.
8. Server-side authorization and ownership checks are authoritative; UI controls are not security boundaries.
9. Sensitive actions and administrative overrides require auditability.

## Current Migration Traceability

| Migration | Architecture capability |
|---|---|
| `0001_core_domain.sql` | Users, Atolls, Islands, Provider Profiles, Repair Requests |
| `0002_auth_rbac.sql` | OTP/authentication foundation, sessions, roles, permissions, security events |
| `0003_location_catalogue.sql` | Island aliases, service catalogue, workflow metadata |
| `0004_provider_onboarding_service_areas_availability.sql` | Provider exact services, pricing, service areas, availability, verification metadata |
| `0005_search_tier_matching_engine.sql` | Search, Tier 0–3 matching, matching audit, leads, assignments, atomic acceptance |

## Planned Migration Sequence

The architecture remains intentionally modular. The planned sequence after 0005 is:

`0006 Repair Requests & Job Lifecycle → 0007 Inspection / Quotation / Completion → 0008 Off-Platform Payment Acknowledgement → 0009 Reviews / Complaints / Notifications → 0010 Subscriptions / Promotions → 0011 Admin / Reporting → 0012 Security / Performance Hardening`

## Diagram Status Rule

These context diagrams are **target architecture diagrams**, not a claim that every depicted service is already implemented. When a diagram and current code appear to differ, use `IMPLEMENTED_VS_TARGET_ARCHITECTURE.md` together with the latest committed migration as the implementation source of truth.
