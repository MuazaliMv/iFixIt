create table if not exists public.request_form_fields (
  id uuid primary key default gen_random_uuid(),
  field_key text not null unique,
  label text not null,
  field_type text not null default 'text' check (field_type in ('text','textarea','select','checkbox','date','time','number','photo','location','service')),
  is_enabled boolean not null default true,
  is_required boolean not null default false,
  is_protected boolean not null default false,
  sort_order integer not null default 0,
  applies_to text[] not null default array['ALL']::text[],
  options jsonb not null default '[]'::jsonb,
  help_text text,
  min_length integer,
  max_length integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_form_fields_applies_to_valid check (applies_to <@ array['ALL','URGENT','STANDARD','SCHEDULE']::text[])
);

alter table public.request_form_fields enable row level security;

grant select on public.request_form_fields to authenticated;
grant insert, update, delete on public.request_form_fields to authenticated;

drop policy if exists "request_form_fields_read" on public.request_form_fields;
create policy "request_form_fields_read"
on public.request_form_fields
for select
to authenticated
using (true);

drop policy if exists "request_form_fields_admin_insert" on public.request_form_fields;
create policy "request_form_fields_admin_insert"
on public.request_form_fields
for insert
to authenticated
with check ((select public.current_user_is_admin()));

drop policy if exists "request_form_fields_admin_update" on public.request_form_fields;
create policy "request_form_fields_admin_update"
on public.request_form_fields
for update
to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

drop policy if exists "request_form_fields_admin_delete" on public.request_form_fields;
create policy "request_form_fields_admin_delete"
on public.request_form_fields
for delete
to authenticated
using ((select public.current_user_is_admin()) and not is_protected);

insert into public.request_form_fields (field_key,label,field_type,is_enabled,is_required,is_protected,sort_order,applies_to,options,help_text,min_length,max_length)
values
 ('service_category','Service category','service',true,true,true,10,array['ALL'],'[]'::jsonb, 'Choose the main service required.',null,null),
 ('service_subcategory','Service type','select',true,false,true,20,array['ALL'],'[]'::jsonb, 'Choose a more specific service where available.',null,null),
 ('service_location','Service location','location',true,true,true,30,array['ALL'],'[]'::jsonb, 'Choose the island/city and ward/area for the job.',null,null),
 ('description','Problem description','textarea',true,true,true,40,array['ALL'],'[]'::jsonb, 'Describe what needs to be fixed.',10,1000),
 ('urgency','Request type','select',true,true,true,50,array['ALL'],'["URGENT","STANDARD","SCHEDULE"]'::jsonb, 'Choose Urgent, Standard or Schedule.',null,null),
 ('preferred_date','Preferred date','date',true,true,false,60,array['SCHEDULE'],'[]'::jsonb, 'Required for scheduled requests.',null,null),
 ('onsite_contact','On-site contact','text',true,false,false,70,array['ALL'],'[]'::jsonb, 'Use when someone else will meet the provider.',2,120),
 ('customer_notes','Additional notes','textarea',true,false,false,80,array['ALL'],'[]'::jsonb, 'Anything else the provider should know.',null,1000),
 ('photos','Photos','photo',true,false,false,90,array['ALL'],'[]'::jsonb, 'Add up to 3 photos of the issue.',null,null)
on conflict (field_key) do update set
 label=excluded.label,
 field_type=excluded.field_type,
 is_enabled=excluded.is_enabled,
 is_protected=excluded.is_protected,
 sort_order=excluded.sort_order,
 applies_to=excluded.applies_to,
 options=excluded.options,
 updated_at=now();
