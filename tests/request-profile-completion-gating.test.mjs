import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Service Address send is gated by verified contact and an explicit selected address',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/phone_confirmed_at/);
 assert.match(source,/disabled=\{saving\|\|!validContact\|\|!selectedAddress\}/);
 assert.match(source,/Choose a Service Address before continuing/);
 assert.match(source,/Use This Service Address & Send Request/);
});

test('saved Service Addresses use canonical location ids instead of hidden profile-name matching',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/from\('user_service_addresses'\)/);
 assert.match(source,/service_atoll_id/);
 assert.match(source,/service_island_id/);
 assert.match(source,/default_service_address_id/);
 assert.doesNotMatch(source,/normalize\('NFKD'\)/);
});

test('Service Address remediation is inline and supports multiple saved addresses',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/\+ Add New Service Address/);
 assert.match(source,/Atoll \/ Region/);
 assert.match(source,/Island \/ City/);
 assert.match(source,/Full name/);
 assert.match(source,/Name for this Service Address/);
 assert.match(source,/Address label/);
 assert.match(source,/Access instructions/);
 assert.doesNotMatch(source,/href="\/profile#service-addresses"/);
});

test('Service Address manager supports create edit soft-remove and default selection',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/insert\(\{\.\.\.payload,user_id:userId,is_default:false\}\)/);
 assert.match(source,/update\(payload\)\.eq\('id',editingId\)/);
 assert.match(source,/update\(\{is_active:false,is_default:false\}\)/);
 assert.match(source,/update\(\{is_default:false\}\)/);
 assert.match(source,/update\(\{is_default:true\}\)/);
 assert.match(source,/await makeDefault\(selectedAddress\)/);
 assert.match(source,/update\(\{full_name:name\.trim\(\)\}\)\.eq\('user_id',userId\)/);
 assert.match(source,/<span>Name<\/span><strong>\{name\|\|'Missing'\}<\/strong>/);
 assert.match(source,/onSaveAndSend\(\)/);
});
