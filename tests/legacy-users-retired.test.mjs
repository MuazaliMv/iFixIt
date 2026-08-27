import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('legacy public users and user_roles are archived without deleting role history',async()=>{
  const migration=await read('supabase/migrations/20260827_retire_legacy_users_and_user_roles.sql');
  assert.match(migration,/alter table public\.user_roles set schema legacy_archive/i);
  assert.match(migration,/rename to user_roles_pre_additive/i);
  assert.match(migration,/alter table public\.users set schema legacy_archive/i);
  assert.match(migration,/rename to users_pre_auth/i);
  assert.doesNotMatch(migration,/drop table if exists public\.(?:users|user_roles)/i);
  assert.match(migration,/from public\.auth_profiles ap/i);
  assert.doesNotMatch(migration,/join public\.user_roles/i);
});

test('runtime code does not query legacy public users table',async()=>{
  const files=['app/api/user/service-addresses/route.ts','app/profile/ServiceAddressManager.tsx'];
  for(const file of files){
    const source=await read(file);
    assert.doesNotMatch(source,/from\(['\"]users['\"]\)/);
  }
});
