begin;

create table if not exists public.app_configuration (
  key text primary key,
  value jsonb not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.location_resolution_cache (
  id uuid primary key default gen_random_uuid(),
  lat_bucket numeric(7,4) not null,
  lon_bucket numeric(7,4) not null,
  atoll_id uuid references public.atolls(id) on update restrict on delete set null,
  island_id uuid references public.islands(id) on update restrict on delete set null,
  location_unit_id uuid references public.location_units(id) on update restrict on delete set null,
  provider text not null,
  provider_label text,
  confidence numeric(5,4),
  resolved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(lat_bucket, lon_bucket)
);

create index if not exists idx_location_resolution_cache_expiry on public.location_resolution_cache(expires_at);
create index if not exists idx_location_resolution_cache_island on public.location_resolution_cache(island_id) where island_id is not null;

alter table public.app_configuration enable row level security;
alter table public.location_resolution_cache enable row level security;
revoke all on public.app_configuration from anon, authenticated;
revoke all on public.location_resolution_cache from anon, authenticated;

insert into public.app_configuration(key,value,is_active)
values
  ('ui.theme', '{"surface":"#ffffff","surfaceAlt":"#f8fafc","page":"#f4f7fb","text":"#172033","muted":"#667085","line":"#e4e9f1","brand":"#2563eb","brandSoft":"#eff6ff","success":"#168451","warning":"#a15c00","danger":"#b42318","radiusSm":12,"radiusMd":16,"radiusLg":24,"shadow":"0 12px 34px rgba(15,23,42,.06)"}'::jsonb, true),
  ('geolocation.provider', '{"provider":"nominatim","endpoint":"https://nominatim.openstreetmap.org/reverse","zoom":18,"format":"jsonv2","acceptLanguage":"en","cacheDays":30}'::jsonb, true)
on conflict (key) do nothing;

commit;
