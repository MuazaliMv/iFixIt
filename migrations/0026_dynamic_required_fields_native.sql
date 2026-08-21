-- 0026 Dynamic Required Fields - iFixIt native architecture
-- Applied to production Supabase project on 2026-08-21.
-- Server-gateway tables intentionally use RLS with no direct client policies.

create table if not exists profile_field_registry (
  field_key text primary key,
  entity_scope text not null check (entity_scope in ('CUSTOMER','PROVIDER','BOTH')),
  display_name text not null,
  section text not null check (section in ('personal','contact','business','verification','address','operations')),
  storage_table text not null check (storage_table in ('auth_profiles','provider_onboarding_profiles')),
  storage_column text not null,
  data_type text not null check (data_type in ('text','integer','boolean')),
  validation_rules jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'NORMAL' check (sensitivity in ('NORMAL','SENSITIVE')),
  editable_by_user boolean not null default true,
  can_be_required boolean not null default true,
  is_active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_table, storage_column, entity_scope)
);

create table if not exists required_field_rules (
  field_key text primary key references profile_field_registry(field_key) on delete restrict,
  is_required boolean not null default false,
  effective_at timestamptz not null default now(),
  grace_period_days integer not null default 0 check (grace_period_days >= 0 and grace_period_days <= 365),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists required_field_rule_audit (
  id uuid primary key default gen_random_uuid(),
  field_key text not null references profile_field_registry(field_key) on delete restrict,
  old_required boolean,
  new_required boolean not null,
  old_grace_period_days integer,
  new_grace_period_days integer,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists profile_field_status (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  field_key text not null references profile_field_registry(field_key) on delete restrict,
  is_completed boolean not null default false,
  is_required_snapshot boolean not null default false,
  prompt_count integer not null default 0 check (prompt_count >= 0),
  last_prompted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auth_user_id, field_key)
);

create table if not exists profile_prompt_queue (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  missing_field_keys jsonb not null default '[]'::jsonb,
  priority text not null default 'MEDIUM' check (priority in ('HIGH','MEDIUM','LOW')),
  channel text not null default 'IN_APP' check (channel in ('IN_APP','EMAIL','SMS','PUSH')),
  status text not null default 'PENDING' check (status in ('PENDING','SENT','DISMISSED','COMPLETED','CANCELLED')),
  retry_count integer not null default 0 check (retry_count >= 0),
  next_retry_at timestamptz,
  sent_at timestamptz,
  dismissed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profile_completion_summary (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('CUSTOMER','PROVIDER')),
  completeness integer not null default 100 check (completeness between 0 and 100),
  missing_required_field_keys jsonb not null default '[]'::jsonb,
  required_total integer not null default 0,
  required_completed integer not null default 0,
  optional_total integer not null default 0,
  optional_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_registry_scope_active on profile_field_registry(entity_scope, is_active, priority);
create index if not exists idx_required_rule_required on required_field_rules(is_required) where is_required = true;
create index if not exists idx_required_rule_audit_field_created on required_field_rule_audit(field_key, created_at desc);
create index if not exists idx_profile_field_status_user_required on profile_field_status(auth_user_id, is_required_snapshot, is_completed);
create index if not exists idx_profile_prompt_pending_retry on profile_prompt_queue(status, next_retry_at) where status = 'PENDING';
create index if not exists idx_profile_prompt_user_status on profile_prompt_queue(auth_user_id, status, created_at desc);
create index if not exists idx_profile_completion_role on profile_completion_summary(role, completeness);

alter table profile_field_registry enable row level security;
alter table required_field_rules enable row level security;
alter table required_field_rule_audit enable row level security;
alter table profile_field_status enable row level security;
alter table profile_prompt_queue enable row level security;
alter table profile_completion_summary enable row level security;

insert into profile_field_registry(field_key,entity_scope,display_name,section,storage_table,storage_column,data_type,validation_rules,sensitivity,editable_by_user,can_be_required,is_active,priority)
values
 ('profile.full_name','BOTH','Full Name','personal','auth_profiles','full_name','text','{"min_length":2,"max_length":120}'::jsonb,'NORMAL',true,true,true,10),
 ('profile.email','BOTH','Email Address','contact','auth_profiles','email','text','{"format":"email","max_length":254}'::jsonb,'SENSITIVE',false,true,true,20),
 ('provider.public_name','PROVIDER','Public Name','business','provider_onboarding_profiles','public_name','text','{"min_length":2,"max_length":120}'::jsonb,'NORMAL',true,true,true,30),
 ('provider.business_name','PROVIDER','Business Name','business','provider_onboarding_profiles','business_name','text','{"min_length":2,"max_length":180}'::jsonb,'NORMAL',true,true,true,40),
 ('provider.description','PROVIDER','Service Description','business','provider_onboarding_profiles','description','text','{"min_length":10,"max_length":1200}'::jsonb,'NORMAL',true,true,true,50),
 ('provider.experience_years','PROVIDER','Years of Experience','business','provider_onboarding_profiles','experience_years','integer','{"min":0,"max":80}'::jsonb,'NORMAL',true,true,true,60),
 ('provider.service_area_text','PROVIDER','Service Area','operations','provider_onboarding_profiles','service_area_text','text','{"min_length":2,"max_length":200}'::jsonb,'NORMAL',true,true,true,70),
 ('provider.availability_status','PROVIDER','Availability Status','operations','provider_onboarding_profiles','availability_status','text','{"allowed":["AVAILABLE","BY_APPOINTMENT","BUSY","UNAVAILABLE"]}'::jsonb,'NORMAL',true,true,true,80)
on conflict (field_key) do nothing;

insert into required_field_rules(field_key,is_required,effective_at,grace_period_days)
select field_key,false,now(),0 from profile_field_registry
on conflict (field_key) do nothing;

insert into app_configuration(key,value,is_active)
values
 ('profile_requirements.version','{"version":1}'::jsonb,true),
 ('profile_completion.block_requests','{"enabled":false,"grace_period_days":7}'::jsonb,true),
 ('profile_completion.weights','{"required":0.7,"optional":0.3}'::jsonb,true),
 ('profile_prompt.frequency','{"initial_delay_hours":24,"retry_interval_hours":72,"max_retries":3}'::jsonb,true)
on conflict (key) do nothing;
