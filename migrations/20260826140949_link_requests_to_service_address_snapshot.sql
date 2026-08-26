alter table public.request_intake
  add column if not exists service_address_id uuid references public.user_service_addresses(id) on delete set null,
  add column if not exists service_address_label text,
  add column if not exists service_address_line1 text,
  add column if not exists service_address_line2 text,
  add column if not exists service_address_city text,
  add column if not exists service_address_state_region text,
  add column if not exists service_address_postal_code text,
  add column if not exists service_address_country text,
  add column if not exists service_address_access_instructions text;

create index if not exists idx_request_intake_service_address_id
  on public.request_intake(service_address_id)
  where service_address_id is not null;

insert into public.user_service_addresses (
  user_id,label,address_line1,address_line2,city,state_region,postal_code,country,
  service_atoll_id,service_island_id,service_location_unit_id,is_default,is_active
)
select
  p.user_id,
  'Primary Service Address',
  p.address_line1,
  p.address_line2,
  p.city,
  p.state_region,
  p.postal_code,
  coalesce(nullif(p.country,''),'Maldives'),
  p.primary_atoll_id,
  p.primary_island_id,
  p.primary_location_unit_id,
  true,
  true
from public.auth_profiles p
where p.address_line1 is not null
  and btrim(p.address_line1) <> ''
  and not exists (
    select 1
    from public.user_service_addresses a
    where a.user_id=p.user_id and a.is_active=true
  );

update public.auth_profiles p
set default_service_address_id = a.id
from public.user_service_addresses a
where a.user_id=p.user_id
  and a.is_default=true
  and a.is_active=true
  and p.default_service_address_id is null;
