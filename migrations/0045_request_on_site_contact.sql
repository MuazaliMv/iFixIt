alter table public.request_intake
  add column if not exists is_on_site_same_as_customer boolean not null default true,
  add column if not exists on_site_contact_name text,
  add column if not exists on_site_contact_phone text;

comment on column public.request_intake.is_on_site_same_as_customer is 'Whether the person at the service location is the requesting customer.';
comment on column public.request_intake.on_site_contact_name is 'Snapshot of the person available at the service location for this request.';
comment on column public.request_intake.on_site_contact_phone is 'Snapshot phone number for the on-site contact. Provider visibility is gated by customer confirmation.';
