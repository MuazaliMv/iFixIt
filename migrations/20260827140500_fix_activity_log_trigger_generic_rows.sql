create or replace function public.activity_log_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  j_old jsonb;
  j_new jsonb;
  j_row jsonb;
  v_actor uuid;
  v_subject uuid;
  v_request uuid;
  v_entity_id text;
  v_action text;
  v_role text;
begin
  if tg_op = 'DELETE' then
    j_old := public.activity_log_redact(to_jsonb(old));
    j_new := null;
    j_row := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    j_old := null;
    j_new := public.activity_log_redact(to_jsonb(new));
    j_row := to_jsonb(new);
  else
    j_old := public.activity_log_redact(to_jsonb(old));
    j_new := public.activity_log_redact(to_jsonb(new));
    j_row := to_jsonb(new);
  end if;

  v_actor := auth.uid();
  begin
    v_subject := coalesce(
      nullif(j_row->>'user_id','')::uuid,
      nullif(j_row->>'customer_id','')::uuid,
      nullif(j_row->>'provider_user_id','')::uuid,
      nullif(j_row->>'provider_id','')::uuid,
      nullif(j_row->>'auth_user_id','')::uuid
    );
  exception when others then
    v_subject := null;
  end;

  begin
    v_request := coalesce(
      nullif(j_row->>'request_id','')::uuid,
      case when tg_table_name='request_intake' then nullif(j_row->>'id','')::uuid else null end
    );
  exception when others then
    v_request := null;
  end;

  v_entity_id := coalesce(j_row->>'id',j_row->>'ticket_number',v_subject::text);
  select upper(coalesce(ap.role,'CUSTOMER')) into v_role
  from public.auth_profiles ap
  where ap.user_id=v_actor
  limit 1;

  if tg_op='INSERT' then
    v_action:='CREATE';
  elsif tg_op='DELETE' then
    v_action:='DELETE';
  else
    v_action:='UPDATE';
  end if;

  if tg_table_name='provider_profiles' and tg_op='UPDATE' then
    if (j_old->>'is_suspended') is distinct from (j_new->>'is_suspended') then
      v_action := case when coalesce((j_new->>'is_suspended')::boolean,false) then 'PROVIDER_SUSPENDED' else 'PROVIDER_REACTIVATED' end;
    elsif (j_old->>'approval_status') is distinct from (j_new->>'approval_status') then
      v_action := 'PROVIDER_APPROVAL_CHANGED';
    elsif (j_old->>'verification_status') is distinct from (j_new->>'verification_status') then
      v_action := 'PROVIDER_VERIFICATION_CHANGED';
    end if;
  elsif tg_table_name='request_intake' then
    if tg_op='INSERT' then
      v_action := 'REQUEST_CREATED';
    elsif tg_op='UPDATE' and (j_old->>'status') is distinct from (j_new->>'status') then
      v_action := 'REQUEST_STATUS_CHANGED';
    elsif tg_op='DELETE' then
      v_action := 'REQUEST_DELETED';
    end if;
  elsif tg_table_name='service_jobs' and tg_op='UPDATE' and (j_old->>'status') is distinct from (j_new->>'status') then
    v_action := 'SERVICE_JOB_STATUS_CHANGED';
  elsif tg_table_name='auth_attempts' and tg_op='INSERT' then
    v_action := coalesce(j_row->>'event_type','AUTH_ATTEMPT');
  elsif tg_table_name='auth_sessions' then
    if tg_op='INSERT' then
      v_action := 'SESSION_CREATED';
    elsif tg_op='UPDATE' and (j_old->>'revoked_at') is null and (j_new->>'revoked_at') is not null then
      v_action := 'LOGOUT_OR_SESSION_REVOKED';
    else
      v_action := 'SESSION_UPDATED';
    end if;
  end if;

  insert into public.activity_logs(
    actor_user_id,subject_user_id,actor_role,action,module,entity_type,entity_id,request_id,old_values,new_values,metadata
  ) values (
    v_actor,coalesce(v_subject,v_actor),v_role,v_action,tg_table_name,tg_table_name,v_entity_id,v_request,j_old,j_new,
    jsonb_build_object('operation',tg_op,'schema',tg_table_schema)
  );

  return case when tg_op='DELETE' then old else new end;
end;
$function$;
