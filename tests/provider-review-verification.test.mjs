import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin provider documents expose the full review workflow', async () => {
  const source = await read('app/admin/providers/[userId]/documents/page.tsx');
  assert.match(source, /REQUEST_INFO/);
  assert.match(source, /Request More Information/);
  assert.match(source, /review_provider_document/);
  assert.match(source, /Provider approval requires an approved ID Card/);
  assert.doesNotMatch(source, /OPTIONAL SUPPORTING DOCUMENTS/);
});

test('database blocks provider approval without approved required documents', async () => {
  const migration = await read('migrations/0102_enforce_provider_verification_before_approval.sql');
  assert.match(migration, /document_type = 'ID_CARD'/);
  assert.match(migration, /document_type = 'BUSINESS_LICENSE'/);
  assert.match(migration, /review_status = 'APPROVED'/);
  assert.match(migration, /before update of onboarding_status/);
});
