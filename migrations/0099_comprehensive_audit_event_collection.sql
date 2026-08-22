-- ============================================================
-- iFixIt
-- Comprehensive audit event collection
-- Captures the ten Admin Activity Log models at the database layer.
-- ============================================================

create or replace function public.audit_redact_json(payload jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(payload, '{}'::jsonb)
    - 'password'
    - 'password_hash'
    - 'encrypted_password'
    - 'token'
    - 'token_hash'
    - 'access_token'
    - 'refresh_token'
    - 'refresh_token_hash'
    - 'reset_token_hash'
    - 'otp'
    - 'otp_code'
    - 'secret'
    - 'client_secret'
    - 'service_role_key';
$$;

create or replace function public.capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  row_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  row_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  clean_new jsonb;
  clean_old jsonb;
  actor uuid;
  entity uuid;
  entity_text text;
  model text;
  event_name text;
  severity_name text := 'info';
  result_name text := 'success';
begin
  clean_new := public.audit_redact_json(row_new);
  clean_old := public.audit_redact_json(row_old);
  actor := auth.uid();

  if actor is null then
    begin
      actor := coalesce(
        nullif(row_new->>'actor_user_id','')::uuid,
        nullif(row_new->>'assigned_by','')::uuid,
        nullif(row_new->>'approved_by','')::uuid,
        nullif(row_old->>'actor_user_id','')::uuid,
        nullif(row_old->>'assigned_by','')::uuid,
        nullif(row_old->>'approved_by','')::uuid
      );
    exception when invalid_text_representation then
      actor := null;
    end;
  end if;

  entity_text := coalesce(
    row_new->>'id', row_old->>'id',
    row_new->>'request_id', row_old->>'request_id',
    row_new->>'job_id', row_old->>'job_id',
    row_new->>'user_id', row_old->>'user_id',
    row_new->>'provider_user_id', row_old->>'provider_user_id',
    row_new->>'auth_user_id', row_old->>'auth_user_id'
  );

  begin
    entity := nullif(entity_text,'')::uuid;
  exception when invalid_text_representation then
    entity := null;
  end;

  model := case
    when tg_table_schema = 'auth' or tg_table_name in ('auth_attempts','auth_sessions','otp_challenges') then 'authentication'
    when tg_table_name in ('users','auth_profiles','user_roles','user_service_addresses','user_deletion_requests','user_deletion_audit','profile_completion_summary','profile_field_status','profile_prompt_queue') then 'user'
    when tg_table_name like 'provider_%' and tg_table_name not in ('provider_subscriptions','provider_subscription_payments','provider_payout_profiles') then 'provider'
    when tg_table_name in ('repair_requests','request_intake','request_media','request_messages','request_message_reads','request_inspections','request_estimates','request_completion_media','request_work_completions','request_reviews') then 'request'
    when tg_table_name in ('request_status_history','service_job_status_history') then 'status'
    when tg_table_name in ('request_provider_dispatch_offers','request_provider_responses','service_jobs') then 'assignment'
    when tg_table_name in ('service_categories','service_subcategories','repair_services','provider_service_categories','provider_service_listings','service_location_availability') then 'service'
    when tg_table_name in ('provider_subscriptions','provider_subscription_payments','provider_payout_profiles') then 'payment'
    when tg_table_name in ('roles','permissions','role_permissions','admin_access_tokens','provider_access_tokens','required_field_rules','required_field_rule_audit','app_configuration') then 'security'
    else 'system'
  end;

  event_name := model || '.' || tg_table_name || '.' || lower(tg_op);

  if tg_op = 'DELETE' then severity_name := 'warning'; end if;

  if coalesce(row_new->>'result', row_old->>'result','') ~* '(fail|error|denied|blocked|invalid)' then
    severity_name := 'error';
    result_name := 'failed';
  elsif coalesce(row_new->>'status', row_old->>'status','') ~* '(fail|error|rejected|cancelled|suspended|revoked|expired)' then
    severity_name := 'warning';
    result_name := 'warning';
  end if;

  insert into public.security_events (
    user_id, event_type, severity, entity_type, entity_id, metadata, created_at
  ) values (
    actor,
    event_name,
    severity_name,
    tg_table_name,
    entity,
    jsonb_build_object(
      'log_model', model,
      'operation', tg_op,
      'result', result_name,
      'table_schema', tg_table_schema,
      'table_name', tg_table_name,
      'entity_reference', entity_text,
      'actor_user_id', actor,
      'old_values', case when tg_op in ('UPDATE','DELETE') then clean_old else null end,
      'new_values', case when tg_op in ('INSERT','UPDATE') then clean_new else null end
    ),
    now()
  );

  return case when tg_op = 'DELETE' then old else new end;
exception when others then
  -- Audit logging must never break the business transaction.
  raise warning 'capture_audit_event failed for %.%: %', tg_table_schema, tg_table_name, sqlerrm;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'activity_logs','admin_access_tokens','app_configuration','auth_attempts','auth_profiles','auth_sessions','customer_notifications',
    'data_source_registry','location_resolution_cache','otp_challenges','permissions','profile_completion_summary','profile_field_registry',
    'profile_field_status','profile_prompt_queue','provider_access_tokens','provider_onboarding_profiles','provider_payout_profiles',
    'provider_profiles','provider_service_areas','provider_service_categories','provider_service_listings','provider_subscription_payments',
    'provider_subscriptions','provider_verification_documents','provider_weekly_hours','repair_requests','repair_services','request_completion_media',
    'request_estimates','request_inspections','request_intake','request_media','request_message_reads','request_messages',
    'request_provider_dispatch_offers','request_provider_responses','request_reviews','request_sla_escalations','request_status_history',
    'request_work_completions','required_field_rule_audit','required_field_rules','role_permissions','roles','service_categories',
    'service_job_status_history','service_jobs','service_location_availability','service_subcategories','user_deletion_audit',
    'user_deletion_requests','user_roles','user_service_addresses','users','whatsapp_delivery_events'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('drop trigger if exists audit_capture_changes on public.%I', t);
      execute format('create trigger audit_capture_changes after insert or update or delete on public.%I for each row execute function public.capture_audit_event()', t);
    end if;
  end loop;
end $$;

drop trigger if exists audit_capture_auth_events on auth.audit_log_entries;
create trigger audit_capture_auth_events
after insert on auth.audit_log_entries
for each row execute function public.capture_audit_event();

create index if not exists security_events_created_at_desc_idx on public.security_events (created_at desc);
create index if not exists security_events_event_type_idx on public.security_events (event_type);
create index if not exists security_events_entity_type_idx on public.security_events (entity_type);
create index if not exists security_events_log_model_idx on public.security_events ((metadata->>'log_model'));
