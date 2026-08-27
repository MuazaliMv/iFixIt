import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loginRoute = new URL('../app/api/auth/login/route.ts', import.meta.url);

test('phone verification uses phone_verified_at as source of truth', async () => {
  const source = await readFile(loginRoute, 'utf8');
  assert.match(source, /phone_verified_at/);
  assert.doesNotMatch(source, /is_phone_verified/);
  assert.match(source, /Boolean\(phoneVerifiedAt\)/);
});
