import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('service address history remediation restores ownership and removes the unapproved trigger',async()=>{
  const migration=await read('migrations/20260826220000_restore_service_address_history_ownership.sql');
  assert.match(migration,/drop trigger if exists trg_service_address_history\s+on public\.user_service_addresses/i);
  assert.match(migration,/add constraint service_address_history_user_id_fkey/i);
  assert.match(migration,/foreign key \(user_id\)\s+references auth\.users\(id\)\s+on delete cascade/is);
  assert.doesNotMatch(migration,/create\s+(?:or replace\s+)?trigger\s+trg_service_address_history/i);
});

test('the regression migration remains paired with a forward-only repair',async()=>{
  const regression=await read('migrations/20260826213000_preserve_service_address_history_after_deletion.sql');
  const repair=await read('migrations/20260826220000_restore_service_address_history_ownership.sql');
  assert.match(regression,/drop constraint if exists service_address_history_user_id_fkey/i);
  assert.match(regression,/create trigger trg_service_address_history/i);
  assert.match(repair,/drop trigger if exists trg_service_address_history/i);
  assert.match(repair,/add constraint service_address_history_user_id_fkey/i);
});
