-- Restore ownership integrity after 20260826213000_preserve_service_address_history_after_deletion.sql.
-- Forward-only remediation: applied migrations are never rewritten.

drop trigger if exists trg_service_address_history
  on public.user_service_addresses;

alter table public.service_address_history
  drop constraint if exists service_address_history_user_id_fkey;

alter table public.service_address_history
  add constraint service_address_history_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;
