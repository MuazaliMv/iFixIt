-- phone_verified_at is the only source of truth for phone verification.

create or replace function public.execute_confirmed_personal_deletion(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_row public.user_deletion_requests%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.user_deletion_requests where id=p_request_id and user_id=v_user for update;
  if not found then raise exception 'Deletion request not found'; end if;
  if v_row.status<>'CONFIRMED' then raise exception 'Explicit confirmation required before deletion'; end if;
  if v_row.target_type='ACCOUNT' then raise exception 'Account deletion is completed only after the recovery period'; end if;

  if v_row.target_type='PROFILE_PHOTO' then
    update public.auth_profiles set profile_photo_url=null where user_id=v_user;
  elsif v_row.target_type='PHONE' then
    update public.auth_profiles set phone_number=null, phone_verified_at=null where user_id=v_user;
  elsif v_row.target_type='ADDRESS' then
    if exists(select 1 from public.request_intake r join public.user_service_addresses a on a.id=v_row.target_id where a.auth_user_id=v_user and r.customer_auth_user_id=v_user and r.status not in ('COMPLETED','CANCELLED')) then
      raise exception 'Address is linked to active service activity and cannot be hard-deleted';
    end if;
    update public.auth_profiles set default_service_address_id=null where user_id=v_user and default_service_address_id=v_row.target_id;
    delete from public.user_service_addresses where id=v_row.target_id and auth_user_id=v_user;
  end if;

  update public.user_deletion_requests set status='COMPLETED',completed_at=now() where id=v_row.id;
  insert into public.user_deletion_audit(deletion_request_id,user_id,event_type,target_type,target_id)
  values(v_row.id,v_user,'COMPLETED',v_row.target_type,v_row.target_id);
  return jsonb_build_object('ok',true,'target_type',v_row.target_type,'completed',true);
end
$function$;

drop trigger if exists trg_auth_profiles_derive_phone_verified on public.auth_profiles;
drop function if exists public.derive_legacy_phone_verified_flag();
alter table public.auth_profiles drop column is_phone_verified;
