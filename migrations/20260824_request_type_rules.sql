create table if not exists public.request_type_settings (
  request_type text primary key check (request_type in ('URGENT','STANDARD','SCHEDULE')),
  is_enabled boolean not null default true,
  provider_response_minutes integer not null default 30 check (provider_response_minutes > 0),
  search_expiry_minutes integer not null default 120 check (search_expiry_minutes > 0),
  available_providers_only boolean not null default false,
  search_radius_km numeric(8,2) not null default 25 check (search_radius_km > 0),
  surcharge_percent numeric(6,2) not null default 0 check (surcharge_percent >= 0),
  max_providers integer not null default 5 check (max_providers > 0),
  dispatch_mode text not null default 'SIMULTANEOUS' check (dispatch_mode in ('SIMULTANEOUS','SEQUENTIAL')),
  operating_start time,
  operating_end time,
  min_advance_minutes integer not null default 0 check (min_advance_minutes >= 0),
  max_advance_days integer not null default 30 check (max_advance_days > 0),
  slot_minutes integer not null default 60 check (slot_minutes > 0),
  cancellation_cutoff_minutes integer not null default 60 check (cancellation_cutoff_minutes >= 0),
  reschedule_cutoff_minutes integer not null default 60 check (reschedule_cutoff_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.request_type_settings enable row level security;

grant select on public.request_type_settings to authenticated;
grant insert, update, delete on public.request_type_settings to authenticated;

drop policy if exists "request_type_settings_read" on public.request_type_settings;
create policy "request_type_settings_read"
on public.request_type_settings
for select
to authenticated
using (true);

drop policy if exists "request_type_settings_admin_insert" on public.request_type_settings;
create policy "request_type_settings_admin_insert"
on public.request_type_settings
for insert
to authenticated
with check ((select public.current_user_is_admin()));

drop policy if exists "request_type_settings_admin_update" on public.request_type_settings;
create policy "request_type_settings_admin_update"
on public.request_type_settings
for update
to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

drop policy if exists "request_type_settings_admin_delete" on public.request_type_settings;
create policy "request_type_settings_admin_delete"
on public.request_type_settings
for delete
to authenticated
using ((select public.current_user_is_admin()));

insert into public.request_type_settings (
  request_type,is_enabled,provider_response_minutes,search_expiry_minutes,
  available_providers_only,search_radius_km,surcharge_percent,max_providers,
  dispatch_mode,operating_start,operating_end,min_advance_minutes,max_advance_days,
  slot_minutes,cancellation_cutoff_minutes,reschedule_cutoff_minutes
)
values
 ('URGENT',true,10,60,true,15,0,8,'SIMULTANEOUS',null,null,0,7,30,30,30),
 ('STANDARD',true,60,480,false,25,0,5,'SEQUENTIAL',null,null,0,30,60,120,120),
 ('SCHEDULE',true,240,1440,false,25,0,5,'SEQUENTIAL','08:00','20:00',60,30,60,240,240)
on conflict (request_type) do nothing;
