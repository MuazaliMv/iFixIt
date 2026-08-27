import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = new URL('../supabase/migrations/20260827_retire_legacy_phone_verified_flag.sql', import.meta.url);

test('legacy phone verification boolean is retired from auth_profiles', async () => {
  const sql = await readFile(migration, 'utf8');
  assert.match(sql, /alter table public\.auth_profiles drop column is_phone_verified;/i);
  assert.match(sql, /drop trigger if exists trg_auth_profiles_derive_phone_verified/i);
  assert.match(sql, /drop function if exists public\.derive_legacy_phone_verified_flag\(\);/i);
});

test('phone deletion clears canonical phone_verified_at', async () => {
  const sql = await readFile(migration, 'utf8');
  assert.match(sql, /phone_number=null, phone_verified_at=null/i);
  assert.doesNotMatch(sql, /set phone_number=null,is_phone_verified=false/i);
});
