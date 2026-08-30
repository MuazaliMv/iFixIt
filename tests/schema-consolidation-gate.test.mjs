import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preflight = fs.readFileSync('scripts/schema_archive_preflight.sql', 'utf8');
const plan = fs.readFileSync('docs/architecture/SAFE_14_TABLE_CONSOLIDATION.md', 'utf8');

const approved = [
  'auth_profiles',
  'user_roles',
  'atolls',
  'islands',
  'service_categories',
  'provider_profiles',
  'provider_service_categories',
  'provider_service_areas',
  'user_service_addresses',
  'request_intake',
  'request_media',
  'request_status_history',
  'request_messages',
  'security_events',
];

test('frozen MVP schema contains exactly 14 approved public tables', () => {
  assert.equal(approved.length, 14);
  assert.equal(new Set(approved).size, 14);
  for (const table of approved) {
    assert.match(preflight, new RegExp(`\\('${table}'\\)`));
  }
});

test('archive preflight is non-destructive', () => {
  assert.doesNotMatch(preflight, /\bdrop\s+table\b/i);
  assert.doesNotMatch(preflight, /\btruncate\b/i);
  assert.doesNotMatch(preflight, /\bdelete\s+from\b/i);
  assert.doesNotMatch(preflight, /\balter\s+table\b/i);
  assert.doesNotMatch(preflight, /\bupdate\s+\w+/i);
  assert.doesNotMatch(preflight, /\binsert\s+into\b/i);
});

test('archive plan forbids direct production drops and requires validation first', () => {
  assert.match(plan, /No production table may be dropped/i);
  assert.match(plan, /row-count and ownership checks pass/i);
  assert.match(plan, /NEW → ACCEPTED → PROCESSING → COMPLETED/i);
  assert.match(plan, /zero blocking dependencies/i);
  assert.match(plan, /later cleanup migration/i);
});
