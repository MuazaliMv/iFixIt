import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = new URL('../supabase/migrations/20260827_consolidate_notifications_into_user_notifications.sql', import.meta.url);

test('user_notifications is the only physical notification store', async () => {
  const source = await readFile(migration, 'utf8');
  assert.match(source, /drop table public\.customer_notifications/);
  assert.match(source, /create view public\.customer_notifications/);
  assert.match(source, /from public\.user_notifications/);
  assert.match(source, /insert into public\.user_notifications/);
  assert.match(source, /from public\.request_intake/);
  assert.doesNotMatch(source, /repair_requests/);
  assert.match(source, /security_invoker\s*=\s*true/);
});
