import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
test('service request submission cannot remain stuck forever',async()=>{
  const portal=await read('app/CustomerPortal.tsx');
  assert.match(portal,/async function fetchWithTimeout/);
  assert.match(portal,/fetchWithTimeout\(SUBMIT_REQUEST_URL/);
  assert.match(portal,/fetchWithTimeout\(MEDIA_URL/);
  assert.match(portal,/if\(submitting\)return/);
  assert.match(portal,/finally\{setSubmitting\(false\);\}/);
  assert.match(portal,/login session has expired/i);
  assert.match(portal,/response\.json\(\)\.catch/);
});

test('request wizard no longer mounts the legacy service-selection observer',async()=>{
  const layout=await read('app/layout.tsx');
  const portal=await read('app/CustomerPortal.tsx');
  assert.doesNotMatch(layout,/ACCustomIssueRuntime/);
  assert.doesNotMatch(portal,/MutationObserver/);
});
