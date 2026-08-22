-- Controlled consolidation phase 2
-- No rows are deleted. Legacy RBAC identities are preserved as historical data.

alter table public.security_events drop constraint if exists security_events_user_id_fkey;
alter table public.security_events add constraint security_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;

alter table public.role_permissions drop constraint if exists role_permissions_granted_by_fkey;
alter table public.role_permissions add constraint role_permissions_granted_by_fkey foreign key (granted_by) references auth.users(id) on delete set null;

alter table public.user_roles drop constraint if exists user_roles_assigned_by_fkey;
alter table public.user_roles add constraint user_roles_assigned_by_fkey foreign key (assigned_by) references auth.users(id) on delete set null;

alter table public.auth_attempts drop constraint if exists auth_attempts_user_id_fkey;
alter table public.auth_attempts add constraint auth_attempts_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.auth_sessions drop constraint if exists auth_sessions_user_id_fkey;
alter table public.auth_sessions add constraint auth_sessions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.provider_profiles drop constraint if exists provider_profiles_user_id_fkey;
alter table public.provider_profiles add constraint provider_profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.provider_profiles drop constraint if exists provider_profiles_approved_by_fkey;
alter table public.provider_profiles add constraint provider_profiles_approved_by_fkey foreign key (approved_by) references auth.users(id) on delete set null;

alter table public.repair_requests drop constraint if exists repair_requests_customer_id_fkey;
alter table public.repair_requests add constraint repair_requests_customer_id_fkey foreign key (customer_id) references auth.users(id) on delete cascade;

revoke insert, update, delete, truncate on table public.user_roles from anon, authenticated;
revoke insert, update, delete, truncate on table public.role_permissions from anon, authenticated;
revoke insert, update, delete, truncate on table public.auth_attempts from anon, authenticated;
revoke insert, update, delete, truncate on table public.auth_sessions from anon, authenticated;
revoke insert, update, delete, truncate on table public.repair_requests from anon, authenticated;

comment on table public.user_roles is 'LEGACY RBAC HISTORY. The six rows use the pre-Supabase identity model and are preserved unchanged. Active role authorization uses public.auth_profiles.role.';
comment on table public.role_permissions is 'LEGACY RBAC CONFIGURATION. Active application authorization uses public.auth_profiles.role and Edge Function checks.';
comment on table public.auth_attempts is 'LEGACY AUTH TABLE. Current authentication is Supabase Auth. Preserved for historical/schema compatibility.';
comment on table public.auth_sessions is 'LEGACY AUTH TABLE. Current sessions are Supabase Auth. Preserved for historical/schema compatibility.';
comment on table public.repair_requests is 'LEGACY REQUEST TABLE. Current service requests use public.request_intake. Preserved for historical/schema compatibility.';
comment on table public.users is 'LEGACY IDENTITY ARCHIVE. IDs do not correspond to Supabase Auth users. Do not use for current authentication/profile data.';

update public.data_source_registry
set migration_status='DEPENDENCY_HOLD', notes=coalesce(notes,'') || ' Legacy users are a separate pre-Supabase identity namespace. Safe actor/session dependencies migrated to auth.users; user_roles.user_id remains historical and intentionally unmapped.'
where domain_key='account_identity';