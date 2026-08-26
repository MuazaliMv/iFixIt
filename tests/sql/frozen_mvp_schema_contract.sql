-- Run against the migrated FixIt database.
-- This script intentionally fails until the full frozen 14-table inventory is reconciled.

do $contract$
declare
  v_table_count integer;
begin
  select count(*) into v_table_count
  from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE';

  if v_table_count <> 14 then
    raise exception 'Frozen MVP schema requires exactly 14 public tables; found %', v_table_count;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public'
      and t.relname='service_address_history'
      and c.conname='service_address_history_user_id_fkey'
      and c.contype='f'
  ) then
    raise exception 'Missing required ownership FK: service_address_history_user_id_fkey';
  end if;

  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname='user_service_addresses'
      and t.tgname='trg_service_address_history'
      and not t.tgisinternal
  ) then
    raise exception 'Unapproved trigger exists: public.user_service_addresses.trg_service_address_history';
  end if;
end
$contract$;
