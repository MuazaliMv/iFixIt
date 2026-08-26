alter table public.service_address_history
  drop constraint if exists service_address_history_user_id_fkey;

alter table public.service_address_history
  drop constraint if exists service_address_history_operation_check;

alter table public.service_address_history
  add constraint service_address_history_operation_check
  check (operation = any (array['INSERT'::text,'UPDATE'::text,'DEACTIVATE'::text,'DELETE'::text]));

create or replace function public.capture_service_address_history()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  op text;
  src public.user_service_addresses%rowtype;
begin
  if tg_op = 'DELETE' then
    op := 'DELETE';
    src := old;
  elsif tg_op = 'INSERT' then
    op := 'INSERT';
    src := new;
  elsif old.is_active = true and new.is_active = false then
    op := 'DEACTIVATE';
    src := new;
  else
    op := 'UPDATE';
    src := new;
  end if;

  if tg_op = 'DELETE'
     or tg_op = 'INSERT'
     or row(old.label, old.address_line1, old.address_line2, old.city, old.state_region,
            old.postal_code, old.country, old.service_atoll_id, old.service_island_id,
            old.service_location_unit_id, old.access_instructions, old.is_default, old.is_active)
        is distinct from
        row(new.label, new.address_line1, new.address_line2, new.city, new.state_region,
            new.postal_code, new.country, new.service_atoll_id, new.service_island_id,
            new.service_location_unit_id, new.access_instructions, new.is_default, new.is_active) then
    insert into public.service_address_history (
      service_address_id, user_id, operation, label, address_line1, address_line2, city,
      state_region, postal_code, country, service_atoll_id, service_island_id,
      service_location_unit_id, access_instructions, is_default, is_active, changed_at
    ) values (
      src.id, src.user_id, op, src.label, src.address_line1, src.address_line2, src.city,
      src.state_region, src.postal_code, src.country, src.service_atoll_id, src.service_island_id,
      src.service_location_unit_id, src.access_instructions, src.is_default, src.is_active, now()
    );
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

drop trigger if exists trg_service_address_history on public.user_service_addresses;
create trigger trg_service_address_history
after insert or update or delete on public.user_service_addresses
for each row execute function public.capture_service_address_history();
