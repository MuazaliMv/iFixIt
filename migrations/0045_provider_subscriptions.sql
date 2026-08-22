begin;

create table if not exists public.provider_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'TRIAL' check (status in ('TRIAL','ACTIVE','EXPIRED')),
  trial_started_at timestamptz not null,
  current_period_started_at timestamptz not null,
  current_period_ends_at timestamptz not null,
  monthly_price_mvr numeric(10,2) not null default 250.00 check (monthly_price_mvr = 250.00),
  last_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.provider_subscriptions(id) on delete cascade,
  amount_mvr numeric(10,2) not null default 250.00 check (amount_mvr = 250.00),
  gateway text not null default 'BML',
  gateway_reference text,
  status text not null default 'PENDING' check (status in ('PENDING','PAID','FAILED','CANCELLED')),
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists provider_subscription_payments_gateway_reference_uq
  on public.provider_subscription_payments(gateway, gateway_reference)
  where gateway_reference is not null;
create index if not exists provider_subscription_payments_provider_created_idx
  on public.provider_subscription_payments(provider_user_id, created_at desc);
create index if not exists provider_subscriptions_period_end_idx
  on public.provider_subscriptions(current_period_ends_at);

alter table public.provider_subscriptions enable row level security;
alter table public.provider_subscription_payments enable row level security;
revoke all on public.provider_subscriptions from anon, authenticated;
revoke all on public.provider_subscription_payments from anon, authenticated;
grant all on public.provider_subscriptions to service_role;
grant all on public.provider_subscription_payments to service_role;

-- Existing providers receive a fresh 30-day launch trial so rollout does not lock them out.
insert into public.provider_subscriptions(provider_user_id,status,trial_started_at,current_period_started_at,current_period_ends_at)
select ap.user_id,'TRIAL',now(),now(),now()+interval '30 days'
from public.auth_profiles ap
where (ap.role='PROVIDER' or ap.provider_approved=true)
on conflict (provider_user_id) do nothing;

create or replace function public.ensure_provider_subscription_row()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (new.role='PROVIDER' or new.provider_approved=true) then
    insert into public.provider_subscriptions(provider_user_id,status,trial_started_at,current_period_started_at,current_period_ends_at)
    values (new.user_id,'TRIAL',coalesce(new.created_at,now()),coalesce(new.created_at,now()),coalesce(new.created_at,now())+interval '30 days')
    on conflict (provider_user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auth_profiles_provider_subscription on public.auth_profiles;
create trigger trg_auth_profiles_provider_subscription
after insert or update of role, provider_approved on public.auth_profiles
for each row execute function public.ensure_provider_subscription_row();

commit;
