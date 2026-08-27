import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('provider approval migration never rewrites the scalar account role',async()=>{
 const migration=await read('migrations/20260827_sync_user_role_with_provider_approval.sql');
 assert.doesNotMatch(migration,/new\.role\s*:=|set\s+role\s*=\s*'PROVIDER'/i);
 assert.match(migration,/additive capability/i);
});

test('canonical user_roles is additive, auth-owned, and self-readable only',async()=>{
 const migration=await read('migrations/20260827190000_restore_additive_user_roles.sql');
 assert.match(migration,/create table if not exists public\.user_roles/i);
 assert.match(migration,/user_id uuid not null references auth\.users\(id\) on delete cascade/i);
 assert.match(migration,/primary key \(user_id, role\)/i);
 assert.match(migration,/role in \('CUSTOMER', 'PROVIDER', 'ADMIN'\)/i);
 assert.match(migration,/alter table public\.user_roles enable row level security/i);
 assert.match(migration,/using \(\(select auth\.uid\(\)\) = user_id\)/i);
 assert.match(migration,/revoke insert, update, delete, truncate on table public\.user_roles from authenticated/i);
});

test('approval trigger changes Provider only and preserves Customer and Admin',async()=>{
 const migration=await read('migrations/20260827190000_restore_additive_user_roles.sql');
 assert.match(migration,/values \(new\.user_id, 'CUSTOMER', true\)/i);
 assert.match(migration,/values \(new\.user_id, 'ADMIN', true\)/i);
 assert.match(migration,/values \(new\.user_id, 'PROVIDER', true\)/i);
 assert.match(migration,/where user_id = new\.user_id\s+and role = 'PROVIDER'/i);
 assert.doesNotMatch(migration,/delete from public\.user_roles/i);
 assert.doesNotMatch(migration,/role = 'CUSTOMER'\s+and is_active = false/i);
 assert.doesNotMatch(migration,/role = 'ADMIN'\s+and is_active = false/i);
});

test('forward migration supersedes the scalar trigger without weakening Admin',async()=>{
 const migration=await read('migrations/20260827190000_restore_additive_user_roles.sql');
 assert.match(migration,/drop trigger if exists trg_sync_user_role_with_provider_approval/i);
 assert.match(migration,/drop function if exists public\.sync_user_role_with_provider_approval\(\)/i);
 assert.match(migration,/update public\.auth_profiles\s+set role = 'CUSTOMER'\s+where role = 'PROVIDER'/i);
 assert.doesNotMatch(migration,/set role = 'CUSTOMER'\s+where role = 'ADMIN'/i);
});
