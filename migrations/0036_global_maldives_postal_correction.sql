create table if not exists public.maldives_postal_codes (
  id uuid primary key default gen_random_uuid(),
  atoll_id uuid not null references public.atolls(id) on delete cascade,
  island_id uuid not null references public.islands(id) on delete cascade,
  location_unit_id uuid references public.location_units(id) on delete cascade,
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  source text not null default 'verified_locality',
  is_verified boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists maldives_postal_codes_unit_unique
  on public.maldives_postal_codes(location_unit_id)
  where location_unit_id is not null and is_active;
create unique index if not exists maldives_postal_codes_island_unique
  on public.maldives_postal_codes(island_id)
  where location_unit_id is null and is_active;

insert into public.maldives_postal_codes(atoll_id,island_id,location_unit_id,postal_code,source,is_verified,is_active)
select a.id,i.id,lu.id,'23000','verified_hulhumale',true,true
from public.atolls a
join public.islands i on i.atoll_id=a.id
join public.location_units lu on lu.island_id=i.id and lu.unit_type='WARD'
where lower(a.display_name)='kaafu atoll'
  and lower(i.display_name) in ('malé city','male city')
  and lower(lu.display_name) in ('hulhumalé phase 1','hulhumale phase 1','hulhumalé phase 2','hulhumale phase 2')
on conflict do nothing;

create or replace function public.mv_normalize_location_text(v text)
returns text language sql immutable as $$
  select trim(regexp_replace(lower(translate(coalesce(v,''), 'éÉáÁíÍóÓúÚ', 'eEaAiIoOuU')), '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.apply_global_maldives_profile_location_correction()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_atoll_id uuid;
  v_island_id uuid;
  v_unit_id uuid;
  v_postal text;
begin
  if new.country is null or btrim(new.country)='' then new.country := 'Maldives'; end if;

  if new.state_region is not null and new.city is not null then
    select a.id into v_atoll_id
    from public.atolls a
    where a.is_active=true
      and public.mv_normalize_location_text(new.state_region) in (
        public.mv_normalize_location_text(a.display_name),
        public.mv_normalize_location_text(a.official_name),
        public.mv_normalize_location_text(a.code)
      )
    limit 1;

    if v_atoll_id is not null then
      select i.id into v_island_id
      from public.islands i
      where i.is_active=true and i.atoll_id=v_atoll_id
        and public.mv_normalize_location_text(new.city) in (
          public.mv_normalize_location_text(i.display_name),
          public.mv_normalize_location_text(i.canonical_name)
        )
      limit 1;
    end if;

    if v_island_id is not null and coalesce(btrim(new.ward),'')<>'' then
      select lu.id into v_unit_id
      from public.location_units lu
      where lu.is_active=true and lu.island_id=v_island_id and lu.unit_type='WARD'
        and public.mv_normalize_location_text(new.ward) in (
          public.mv_normalize_location_text(lu.display_name),
          public.mv_normalize_location_text(lu.canonical_name)
        )
      limit 1;
    end if;

    new.primary_atoll_id := v_atoll_id;
    new.primary_island_id := v_island_id;
    new.primary_location_unit_id := v_unit_id;

    select pc.postal_code into v_postal
    from public.maldives_postal_codes pc
    where pc.is_active=true and pc.is_verified=true
      and pc.atoll_id=v_atoll_id and pc.island_id=v_island_id
      and (pc.location_unit_id=v_unit_id or (pc.location_unit_id is null and v_unit_id is null))
    order by case when pc.location_unit_id is not null then 0 else 1 end
    limit 1;

    if v_postal is not null then new.postal_code := v_postal;
    elsif new.postal_code is not null and new.postal_code !~ '^[0-9]{5}$' then new.postal_code := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_global_maldives_profile_location_correction on public.auth_profiles;
create trigger trg_global_maldives_profile_location_correction
before insert or update of state_region,city,ward,postal_code,country
on public.auth_profiles
for each row execute function public.apply_global_maldives_profile_location_correction();
