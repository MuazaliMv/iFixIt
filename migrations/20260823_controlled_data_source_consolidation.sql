-- Controlled, non-destructive consolidation of duplicate/legacy data sources.
-- No rows or tables are deleted by this migration.

create table if not exists public.data_source_registry (
  domain_key text primary key,
  canonical_source text not null,
  legacy_sources text[] not null default '{}',
  migration_status text not null default 'CANONICAL',
  notes text,
  updated_at timestamptz not null default now(),
  constraint data_source_registry_status_check check (migration_status in ('CANONICAL','DEPRECATED_READ_ONLY','DEPENDENCY_HOLD'))
);

alter table public.data_source_registry enable row level security;
revoke all on table public.data_source_registry from anon, authenticated;
grant select, insert, update, delete on table public.data_source_registry to service_role;

insert into public.data_source_registry(domain_key,canonical_source,legacy_sources,migration_status,notes,updated_at)
values
 ('account_identity','auth.users + public.auth_profiles',array['public.users'],'DEPENDENCY_HOLD','public.users remains because legacy FK-backed RBAC/audit structures still reference it. New application profile data is canonical in auth_profiles.',now()),
 ('provider_profile','public.provider_onboarding_profiles',array['public.provider_profiles'],'DEPRECATED_READ_ONLY','provider_profiles is empty; onboarding profile is the canonical provider profile.',now()),
 ('provider_services','public.provider_service_categories',array['public.provider_service_listings'],'DEPRECATED_READ_ONLY','Pricing/listing onboarding was removed. Historical listing rows are retained read-only.',now()),
 ('provider_payout','none',array['public.provider_payout_profiles'],'DEPRECATED_READ_ONLY','Provider payout collection was removed. Existing rows, if any, are retained only for history.',now()),
 ('service_addresses','public.auth_profiles (primary) + public.user_service_addresses (saved service locations)',array['public.users address fields'],'DEPENDENCY_HOLD','Legacy users address columns remain while public.users is dependency-held.',now())
on conflict (domain_key) do update set
 canonical_source=excluded.canonical_source,
 legacy_sources=excluded.legacy_sources,
 migration_status=excluded.migration_status,
 notes=excluded.notes,
 updated_at=now();

comment on table public.provider_profiles is 'DEPRECATED READ-ONLY: canonical provider profile is public.provider_onboarding_profiles. Retained temporarily for legacy FK compatibility; do not use for new application data.';
comment on table public.provider_service_listings is 'DEPRECATED READ-ONLY: provider pricing/listing onboarding has been removed. Canonical service membership is public.provider_service_categories. Historical rows retained.';
comment on table public.provider_payout_profiles is 'DEPRECATED READ-ONLY: provider payout setup has been removed. Do not collect new payout data.';
comment on table public.users is 'LEGACY DEPENDENCY HOLD: application account/profile source of truth is auth.users + public.auth_profiles. Retained because legacy FK-backed tables still reference public.users.';

revoke insert, update, delete, truncate on table public.provider_profiles from anon, authenticated;
revoke insert, update, delete, truncate on table public.provider_service_listings from anon, authenticated;
revoke insert, update, delete, truncate on table public.provider_payout_profiles from anon, authenticated;
revoke insert, update, delete, truncate on table public.users from anon, authenticated;
