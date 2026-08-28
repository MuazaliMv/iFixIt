import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('service request submission cannot remain stuck forever',async()=>{
  const portal=await read('app/CustomerPortal.tsx');
  assert.match(portal,/async function jsonFetch/);
  assert.match(portal,/new AbortController\(\)/);
  assert.match(portal,/window\.setTimeout\(\(\)=>controller\.abort\(\),timeoutMs\)/);
  assert.match(portal,/jsonFetch\(SUBMIT_REQUEST_URL/);
  assert.match(portal,/fetch\(MEDIA_URL/);
  assert.match(portal,/AbortSignal\.timeout\(25000\)/);
  assert.match(portal,/if\(submitting\)return/);
  assert.match(portal,/finally\s*\{[\s\S]*?setSubmitting\(false\);[\s\S]*?\}/);
  assert.match(portal,/window\.location\.replace\('\/login\?next=%2Fhome'\)/);
  assert.match(portal,/response\.json\(\)\.catch/);
});

test('request wizard no longer mounts the legacy service-selection observer',async()=>{
  const layout=await read('app/layout.tsx');
  const portal=await read('app/CustomerPortal.tsx');
  assert.doesNotMatch(layout,/ACCustomIssueRuntime/);
  assert.doesNotMatch(portal,/MutationObserver/);
});
