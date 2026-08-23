-- Keep matched provider offers visible for a practical response window.
-- Align offer visibility with the overall dispatch tier windows:
-- URGENT 30 minutes, STANDARD 60 minutes, SCHEDULED 120 minutes.

insert into public.app_configuration(key,value,is_active)
values ('matching.offer_windows_minutes','{"URGENT":30,"STANDARD":60,"SCHEDULED":120}'::jsonb,true)
on conflict(key) do update set value=excluded.value,is_active=true,updated_at=now();

create or replace function public.provider_offer_window_for_tier(p_tier text)
returns interval
language sql
stable
set search_path='public'
as $$
select make_interval(mins=>case upper(coalesce(p_tier,'STANDARD'))
 when 'URGENT' then coalesce((select (value->>'URGENT')::int from public.app_configuration where key='matching.offer_windows_minutes' and is_active),30)
 when 'SCHEDULED' then coalesce((select (value->>'SCHEDULED')::int from public.app_configuration where key='matching.offer_windows_minutes' and is_active),120)
 else coalesce((select (value->>'STANDARD')::int from public.app_configuration where key='matching.offer_windows_minutes' and is_active),60) end)
$$;
