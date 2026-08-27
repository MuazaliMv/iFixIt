-- Stage 1 of legacy repair catalogue cleanup.
-- These tables are retained temporarily because historical migrations/functions still reference them,
-- but runtime application roles must not create new data in them.

revoke insert, update, delete on table public.repair_services from anon, authenticated;
revoke insert, update, delete on table public.service_subcategories from anon, authenticated;

comment on table public.repair_services is
  'LEGACY: do not use for new iFixMV service catalogue data. Canonical catalogue is public.service_categories.';

comment on table public.service_subcategories is
  'LEGACY: subcategories removed from the active iFixMV service flow. Retained temporarily for dependency cleanup only.';
