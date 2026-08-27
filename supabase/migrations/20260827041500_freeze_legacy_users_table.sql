begin;

revoke insert, update, delete, truncate on table public.users from anon, authenticated;

comment on table public.users is
  'LEGACY TEST USER MODEL: runtime identity/profile source is public.auth_profiles. Do not use for new application code.';

commit;
