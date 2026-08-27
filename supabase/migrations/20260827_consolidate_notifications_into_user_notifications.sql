begin;

-- Canonical notification store: public.user_notifications.
-- Historical customer_notifications rows must already be mirrored there.
do $$
begin
  if exists (
    select 1
    from public.customer_notifications c
    where not exists (
      select 1 from public.user_notifications u
      where u.source_type='customer_notifications'
        and u.source_id=c.id::text
    )
  ) then
    raise exception 'Cannot consolidate notifications: unmigrated customer notification rows exist';
  end if;
end $$;

alter table public.user_notifications
  add constraint user_notifications_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_notifications
  add constraint user_notifications_request_id_fkey
  foreign key (request_id) references public.request_intake(id) on delete cascade;

drop trigger if exists trg_customer_notification_unified on public.customer_notifications;
drop function if exists public.mirror_customer_notification_to_unified();
drop table public.customer_notifications;

create view public.customer_notifications
with (security_invoker = true)
as
select
  id,
  user_id,
  request_id,
  notification_type,
  title,
  message,
  nullif(metadata->>'dispatch_attempt','')::integer as dispatch_attempt,
  created_at,
  read_at
from public.user_notifications
where role='CUSTOMER';

create or replace function public.route_legacy_customer_notification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ticket text;
  v_id uuid;
begin
  select ticket_number into v_ticket
  from public.request_intake
  where id = new.request_id;

  insert into public.user_notifications(
    user_id, role, notification_type, title, message,
    request_id, ticket_number, source_type, source_id,
    action_href, metadata, created_at, read_at
  ) values (
    new.user_id,
    'CUSTOMER',
    new.notification_type,
    new.title,
    new.message,
    new.request_id,
    v_ticket,
    'customer_notifications_compat',
    coalesce(new.id, gen_random_uuid())::text,
    case when v_ticket is not null then '/requests/' || v_ticket else '/requests' end,
    jsonb_build_object('dispatch_attempt', new.dispatch_attempt),
    coalesce(new.created_at, now()),
    new.read_at
  )
  returning id into v_id;

  new.id := v_id;
  new.created_at := coalesce(new.created_at, now());
  return new;
end $$;

create trigger trg_customer_notifications_compat_insert
instead of insert on public.customer_notifications
for each row execute function public.route_legacy_customer_notification();

revoke all on public.customer_notifications from anon, authenticated;
grant select on public.customer_notifications to authenticated;

comment on view public.customer_notifications is
  'LEGACY compatibility view. Canonical notification storage is public.user_notifications.';
comment on table public.user_notifications is
  'Canonical notification storage for CUSTOMER, PROVIDER, and ADMIN notifications.';

commit;
