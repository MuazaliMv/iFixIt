create table if not exists public.whatsapp_delivery_events (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  recipient_wa_id text,
  status text not null,
  event_timestamp timestamptz,
  error_code text,
  error_title text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_delivery_events_message_id_idx
  on public.whatsapp_delivery_events(message_id);

create index if not exists whatsapp_delivery_events_created_at_idx
  on public.whatsapp_delivery_events(created_at desc);

alter table public.whatsapp_delivery_events enable row level security;
revoke all on table public.whatsapp_delivery_events from anon, authenticated;
