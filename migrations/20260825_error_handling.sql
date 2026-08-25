-- Centralized client runtime error reporting.
-- Users may only insert their own narrowly-scoped runtime error records.

drop policy if exists security_events_client_error_insert on public.security_events;

create policy security_events_client_error_insert
on public.security_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and event_type = 'system.client_error'
  and entity_type = 'application_runtime'
  and coalesce(metadata->>'source','') = 'client-runtime'
);

grant insert on table public.security_events to authenticated;
