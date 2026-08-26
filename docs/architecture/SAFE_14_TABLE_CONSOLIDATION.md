# Safe 14-table MVP consolidation

## Frozen MVP table set

The approved public MVP table set is exactly:

1. `auth_profiles`
2. `user_roles`
3. `atolls`
4. `islands`
5. `service_categories`
6. `provider_profiles`
7. `provider_service_categories`
8. `provider_service_areas`
9. `user_service_addresses`
10. `request_intake`
11. `request_media`
12. `request_status_history`
13. `request_messages`
14. `security_events`

## Safety rule

No production table may be dropped as part of consolidation. Legacy objects are eligible for archive only after all of the following are true:

- required data has been copied into an approved MVP table or explicitly retained as audit/history;
- application, Edge Function, SQL, RLS, trigger, view, and foreign-key references no longer require the legacy table;
- row-count and ownership checks pass;
- the NEW → ACCEPTED → PROCESSING → COMPLETED request flow passes;
- authentication/OTP and provider/customer ownership checks pass;
- the archive preflight query reports zero blocking dependencies.

## Current production preflight (2026-08-26)

Production currently has 67 public base tables: the 14 approved MVP tables plus 53 legacy/redundant candidates.

The archive gate is **blocked** because approved tables still reference legacy tables. Confirmed blockers include:

- `user_roles.user_id → users.id`
- `user_roles.role_id → roles.id`
- `auth_profiles.primary_location_unit_id → location_units.id`
- `provider_service_areas.location_unit_id → location_units.id`
- `user_service_addresses.service_location_unit_id → location_units.id`
- `request_intake.service_location_unit_id → location_units.id`

These dependencies must be migrated before any archive operation.

## Known consolidation mappings

- `users` → `auth_profiles` / Supabase `auth.users`
- `roles`, `permissions`, `role_permissions`, `user_permission_overrides` → active authorization in `auth_profiles.role`; retain required role history in `user_roles`/`security_events`
- `activity_logs`, `auth_attempts`, `whatsapp_delivery_events` → `security_events`
- `provider_onboarding_profiles` → `provider_profiles`
- `provider_service_listings` → `provider_service_categories` for MVP category membership
- `service_jobs` → `request_intake`
- `service_job_status_history` → `request_status_history`
- `request_message_reads` → `request_messages.read_at` for MVP read state
- `repair_requests` → `request_intake`

## Archive sequence

1. Inventory all 53 candidate tables and dependencies.
2. Copy/merge required rows into the approved MVP model.
3. Change application and database references to the approved tables.
4. Run ownership, count, RLS, trigger, and request-flow validation.
5. Create immutable archive copies/snapshots.
6. Re-run the archive gate and require zero blockers.
7. Archive legacy tables in a separate migration.
8. Remove archived tables only in a later cleanup migration after production verification.

A failing gate means stop. It must never be bypassed by dropping a referenced table.