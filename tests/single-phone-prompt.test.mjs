import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('customer request draft never persists or restores a second phone prompt',async()=>{
  const source=await read('app/CustomerPortal.tsx');
  const draftType=source.match(/type Draft=\{([^}]*)\}/)?.[1]||'';
  const saveDraft=source.match(/function saveDraft\(\)\{([^\n]*)\}/)?.[1]||'';
  assert.doesNotMatch(draftType,/onSiteContactPhone|onSiteContactName|isOnSiteSameAsCustomer/);
  assert.doesNotMatch(source,/setOnSiteContactPhone\(d\.onSiteContactPhone/);
  assert.doesNotMatch(source,/setIsOnSiteSameAsCustomer\(d\.isOnSiteSameAsCustomer/);
  assert.doesNotMatch(saveDraft,/onSiteContactPhone|onSiteContactName|isOnSiteSameAsCustomer/);
});

test('own-contact path reuses verified account phone and alternate phone is explicit only',async()=>{
  const source=await read('app/CustomerPortal.tsx');
  assert.match(source,/function resetOnSiteContact\(\)\{setIsOnSiteSameAsCustomer\(true\);setOnSiteContactName\(''\);setOnSiteContactPhone\(''\);\}/);
  assert.match(source,/onClick=\{resetOnSiteContact\}/);
  assert.match(source,/OTP-verified login phone is used automatically/);
  assert.match(source,/No phone entry is needed\. Your verified login number will be used/);
  assert.match(source,/onSiteContactPhone:isOnSiteSameAsCustomer\?null:onSiteContactPhone\.trim\(\)/);
});
