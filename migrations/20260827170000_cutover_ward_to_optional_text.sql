begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Stage 1 of the Ward cutover is deliberately additive. The legacy UUID
-- columns remain temporarily for deployed Edge Function compatibility, but
-- application writes and active database automation use this text field.
alter table public.user_service_addresses
  add column if not exists ward text;

-- A clean replay currently installs this legacy trigger before reaching this
-- migration. Remove it before the backfill so the technical copy does not
-- create history rows or keep the retired Ward-ID contract alive.
drop trigger if exists trg_service_address_history on public.user_service_addresses;
drop function if exists public.capture_service_address_history();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_service_addresses'::regclass
      and conname = 'user_service_addresses_ward_length'
  ) then
    alter table public.user_service_addresses
      add constraint user_service_addresses_ward_length
      check (ward is null or char_length(ward) <= 120) not valid;
  end if;
end
$$;

-- Preserve every resolvable Ward label before retiring the UUID relationship.
update public.user_service_addresses a
set ward = nullif(btrim(u.display_name), '')
from public.location_units u
where a.service_location_unit_id = u.id
  and nullif(btrim(coalesce(a.ward, '')), '') is null
  and nullif(btrim(coalesce(u.display_name, '')), '') is not null;

update public.auth_profiles p
set ward = nullif(btrim(u.display_name), '')
from public.location_units u
where p.primary_location_unit_id = u.id
  and nullif(btrim(coalesce(p.ward, '')), '') is null
  and nullif(btrim(coalesce(u.display_name, '')), '') is not null;

update public.auth_profiles p
set ward = a.ward
from public.user_service_addresses a
where p.default_service_address_id = a.id
  and nullif(btrim(coalesce(p.ward, '')), '') is null
  and nullif(btrim(coalesce(a.ward, '')), '') is not null;

do $$
begin
  if exists (
    select 1
    from public.user_service_addresses a
    where a.service_location_unit_id is not null
      and nullif(btrim(coalesce(a.ward, '')), '') is null
  ) then
    raise exception 'Ward text backfill is incomplete for one or more Service Addresses';
  end if;

  if exists (
    select 1
    from public.auth_profiles p
    where p.primary_location_unit_id is not null
      and nullif(btrim(coalesce(p.ward, '')), '') is null
  ) then
    raise exception 'Ward text backfill is incomplete for one or more profiles';
  end if;
end
$$;

alter table public.user_service_addresses
  validate constraint user_service_addresses_ward_length;

comment on column public.user_service_addresses.ward is
  'Optional Ward or locality text. Canonical MVP address data does not require a location_units foreign key.';
comment on column public.user_service_addresses.service_location_unit_id is
  'Deprecated compatibility column. Do not read or write from MVP application code; remove only after Edge Function cutover validation.';
comment on column public.auth_profiles.primary_location_unit_id is
  'Deprecated compatibility column. Ward is stored as optional text; remove only after Edge Function cutover validation.';

-- Resolve only through the approved atolls/islands hierarchy. Ward remains
-- optional text and is never converted back into a location_units key.
create schema if not exists private;
create or replace function private.resolve_profile_address_links()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  new.primary_atoll_id := null;
  new.primary_island_id := null;

  if nullif(trim(coalesce(new.state_region, '')), '') is null
     or nullif(trim(coalesce(new.city, '')), '') is null then
    return new;
  end if;

  select a.id into new.primary_atoll_id
  from public.atolls a
  where a.is_active = true
    and (
      lower(a.display_name) = lower(new.state_region)
      or lower(a.official_name) = lower(new.state_region)
    )
  order by case when lower(a.display_name) = lower(new.state_region) then 0 else 1 end,
           a.sort_order
  limit 1;

  if new.primary_atoll_id is null then
    return new;
  end if;

  select i.id into new.primary_island_id
  from public.islands i
  where i.is_active = true
    and i.atoll_id = new.primary_atoll_id
    and (
      lower(i.display_name) = lower(new.city)
      or lower(i.canonical_name) = lower(new.city)
    )
  order by case when lower(i.display_name) = lower(new.city) then 0 else 1 end,
           i.sort_order
  limit 1;

  return new;
end;
$function$;

revoke all on function private.resolve_profile_address_links() from public, anon, authenticated;
grant execute on function private.resolve_profile_address_links() to service_role;

create or replace function public.apply_global_maldives_profile_location_correction()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_atoll_id uuid;
  v_island_id uuid;
begin
  if new.country is null or btrim(new.country) = '' then
    new.country := 'Maldives';
  end if;

  if new.state_region is not null and new.city is not null then
    select a.id into v_atoll_id
    from public.atolls a
    where a.is_active = true
      and public.mv_normalize_location_text(new.state_region) in (
        public.mv_normalize_location_text(a.display_name),
        public.mv_normalize_location_text(a.official_name),
        public.mv_normalize_location_text(a.code)
      )
    order by case
      when public.mv_normalize_location_text(new.state_region) = public.mv_normalize_location_text(a.display_name) then 0
      else 1
    end
    limit 1;

    if v_atoll_id is not null then
      select i.id into v_island_id
      from public.islands i
      where i.is_active = true
        and i.atoll_id = v_atoll_id
        and public.mv_normalize_location_text(new.city) in (
          public.mv_normalize_location_text(i.display_name),
          public.mv_normalize_location_text(i.canonical_name)
        )
      order by case
        when public.mv_normalize_location_text(new.city) = public.mv_normalize_location_text(i.display_name) then 0
        else 1
      end
      limit 1;
    end if;

    new.primary_atoll_id := v_atoll_id;
    new.primary_island_id := v_island_id;
  else
    new.primary_atoll_id := null;
    new.primary_island_id := null;
  end if;

  if new.postal_code is not null and new.postal_code !~ '^[0-9]{5}$' then
    new.postal_code := null;
  end if;

  if new.provider_country is null or btrim(new.provider_country) = '' then
    new.provider_country := 'Maldives';
  end if;
  if new.provider_postal_code is not null and new.provider_postal_code !~ '^[0-9]{5}$' then
    new.provider_postal_code := null;
  end if;

  return new;
end;
$function$;

revoke all on function public.apply_global_maldives_profile_location_correction() from public, anon, authenticated;
grant execute on function public.apply_global_maldives_profile_location_correction() to service_role;

-- Snapshot the exact selected/default address as text. No request progression
-- or insertion is gated on a Ward ID.
create or replace function public.bind_request_service_address_snapshot()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_address public.user_service_addresses%rowtype;
begin
  if new.customer_auth_user_id is null then
    return new;
  end if;

  select a.* into v_address
  from public.user_service_addresses a
  left join public.auth_profiles p on p.user_id = new.customer_auth_user_id
  where a.user_id = new.customer_auth_user_id
    and a.is_active = true
    and (a.id = new.service_address_id or a.id = p.default_service_address_id or a.is_default = true)
  order by (a.id = new.service_address_id) desc,
           (a.id = p.default_service_address_id) desc,
           a.is_default desc,
           a.updated_at desc
  limit 1;

  if v_address.id is null then
    return new;
  end if;

  new.service_address_id := v_address.id;
  new.service_address_label := v_address.label;
  new.service_address_line1 := v_address.address_line1;
  new.service_address_line2 := v_address.address_line2;
  new.service_address_city := v_address.city;
  new.service_address_state_region := v_address.state_region;
  new.service_address_postal_code := v_address.postal_code;
  new.service_address_country := coalesce(v_address.country, 'Maldives');
  new.service_address_access_instructions := v_address.access_instructions;
  new.service_atoll_id := v_address.service_atoll_id;
  new.service_island_id := v_address.service_island_id;
  new.service_location_text := concat_ws(', ',
    nullif(btrim(v_address.address_line1), ''),
    nullif(btrim(v_address.address_line2), ''),
    nullif(btrim(v_address.ward), ''),
    nullif(btrim(v_address.city), ''),
    nullif(btrim(v_address.state_region), '')
  );
  return new;
end;
$function$;

create or replace function public.handle_service_address_removal_default()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_was_default boolean;
  v_next public.user_service_addresses%rowtype;
begin
  v_user_id := old.user_id;
  v_was_default := coalesce(old.is_default, false);
  if tg_op = 'UPDATE' and not (old.is_active = true and new.is_active = false) then
    return new;
  end if;
  if not v_was_default then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select * into v_next
  from public.user_service_addresses
  where user_id = v_user_id
    and is_active = true
    and id <> old.id
  order by updated_at desc nulls last, created_at desc nulls last, id
  limit 1;

  if found then
    update public.user_service_addresses
    set is_default = (id = v_next.id)
    where user_id = v_user_id and is_active = true;

    update public.auth_profiles
    set default_service_address_id = v_next.id,
        address_line1 = v_next.address_line1,
        address_line2 = v_next.address_line2,
        city = v_next.city,
        ward = v_next.ward,
        state_region = v_next.state_region,
        postal_code = v_next.postal_code,
        country = coalesce(v_next.country, 'Maldives'),
        primary_atoll_id = v_next.service_atoll_id,
        primary_island_id = v_next.service_island_id,
        updated_at = now()
    where user_id = v_user_id;
  else
    update public.auth_profiles
    set default_service_address_id = null,
        address_line1 = null,
        address_line2 = null,
        city = null,
        ward = null,
        state_region = null,
        postal_code = null,
        country = null,
        primary_atoll_id = null,
        primary_island_id = null,
        updated_at = now()
    where user_id = v_user_id;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.handle_service_address_removal_default() from public, anon, authenticated;
grant execute on function public.handle_service_address_removal_default() to service_role;

commit;
