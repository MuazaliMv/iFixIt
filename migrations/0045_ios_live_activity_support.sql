create table if not exists public.ios_live_activity_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.request_intake(id) on delete cascade,
  ticket_number text not null,
  activity_id text not null,
  push_token text not null,
  environment text not null default 'production' check (environment in ('development','production')),
  is_active boolean not null default true,
  last_status text,
  last_provider_count integer not null default 0,
  last_deadline_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  unique(user_id, activity_id)
);

create index if not exists ios_live_activity_tokens_request_idx
  on public.ios_live_activity_tokens(request_id) where is_active;
create index if not exists ios_live_activity_tokens_user_idx
  on public.ios_live_activity_tokens(user_id) where is_active;

alter table public.ios_live_activity_tokens enable row level security;
revoke all on public.ios_live_activity_tokens from anon, authenticated;
grant select, insert, update, delete on public.ios_live_activity_tokens to service_role;
