import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('customer request flow never persists or restores a second phone prompt',async()=>{
  const source=await read('app/CustomerPortal.tsx');
  assert.doesNotMatch(source,/fixit:create-draft/);
  assert.doesNotMatch(source,/setOnSiteContactPhone\(d\./);
  assert.doesNotMatch(source,/setIsOnSiteSameAsCustomer\(d\./);
});

test('own-contact path reuses verified account phone and alternate phone is explicit only',async()=>{
  const source=await read('app/CustomerPortal.tsx');
  assert.match(source,/function resetContact\(\)\{setIsOnSiteSameAsCustomer\(true\);setOnSiteContactName\(''\);setOnSiteContactPhone\(''\);\}/);
  assert.match(source,/onClick=\{resetContact\}/);
  assert.match(source,/Your OTP-verified account contact is reused automatically\./);
  assert.match(source,/I will be there/);
  assert.match(source,/Someone else/);
  assert.match(source,/onSiteContactPhone:isOnSiteSameAsCustomer\?null:onSiteContactPhone\.trim\(\)/);
});
