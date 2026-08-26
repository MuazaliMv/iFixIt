create or replace function public.bind_request_service_address_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
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
    and (a.id = p.default_service_address_id or a.is_default = true)
  order by (a.id = p.default_service_address_id) desc, a.is_default desc, a.updated_at desc
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
  new.service_location_unit_id := v_address.service_location_unit_id;
  new.service_location_text := concat_ws(', ',
    nullif(btrim(v_address.address_line1),''),
    nullif(btrim(v_address.address_line2),''),
    nullif(btrim(v_address.city),''),
    nullif(btrim(v_address.state_region),'')
  );
  return new;
end;
$$;

drop trigger if exists trg_bind_request_service_address_snapshot on public.request_intake;
create trigger trg_bind_request_service_address_snapshot
before insert on public.request_intake
for each row execute function public.bind_request_service_address_snapshot();

revoke all on function public.bind_request_service_address_snapshot() from public, anon, authenticated;
grant execute on function public.bind_request_service_address_snapshot() to service_role;
