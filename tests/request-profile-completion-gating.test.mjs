import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

// Current contract: request-specific address selection must not silently replace the user's profile default.
test('Service Address send is gated by verified contact and an explicit selected address',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/phone_confirmed_at/);
 assert.match(source,/disabled=\{saving\|\|!validContact\|\|!selectedAddress\}/);
 assert.match(source,/Choose a Service Address before continuing/);
 assert.match(source,/>Proceed</);
});

test('saved Service Addresses use canonical location ids and authenticated location catalogue',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/\/api\/user\/service-addresses/);
 assert.match(source,/service_atoll_id/);
 assert.match(source,/service_island_id/);
 assert.match(source,/service_location_unit_id/);
 assert.match(source,/payload\.wards\|\|\[\]/);
 assert.match(source,/\/api\/locations\/catalogue/);
 assert.doesNotMatch(source,/normalize\('NFKD'\)/);
 assert.doesNotMatch(source,/supabase\.from\('user_service_addresses'\)/);
 assert.doesNotMatch(source,/supabase\.from\('auth_profiles'\)/);
});

test('Service Address remediation is inline and supports multiple saved addresses',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/\+ Add a New Service Address/);
 assert.match(source,/House \/ Apartment Name/);
 assert.match(source,/Road \/ Street/);
 assert.match(source,/Atoll \/ Region/);
 assert.match(source,/Island \/ City/);
 assert.match(source,/>Ward /);
 assert.match(source,/Select Ward/);
 assert.doesNotMatch(source,/<label>Name<input/);
 assert.match(source,/Access Instructions/);
 assert.doesNotMatch(source,/Postal code <span/);
 assert.doesNotMatch(source,/href="\/profile#service-addresses"/);
});

test('Service Address entry uses a progressive two-step mobile wizard',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/formStep,setFormStep/);
 assert.match(source,/Step \$\{formStep\} of 2/);
 assert.match(source,/Next Step →/);
 assert.match(source,/Specifics & Access/);
 assert.match(source,/Save and Proceed/);
});

test('Service Address Ward selection is dependent on Island and persists canonical location unit id',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/wards\.filter\(w=>w\.island_id===islandId\)/);
 assert.match(source,/setIslandId\(e\.target\.value\);setWardId\(''\)/);
 assert.match(source,/service_location_unit_id:selectedWard\?\.id\|\|null/);
 assert.match(source,/No ward required for this island/);
});

test('Service Address browser mutations are routed through authenticated server API',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 const route=await read('app/api/user/service-addresses/route.ts');
 assert.match(source,/addressApi\('GET'\)/);
 assert.match(source,/addressApi\(editingId\?'PATCH':'POST'/);
 assert.match(source,/addressApi\('DELETE',\{id:address\.id\}\)/);
 assert.match(source,/action:'set_default'/);
 assert.match(source,/setSelectedId\(address\.id\)/);
 assert.match(source,/Your profile default has not changed/);
 assert.match(source,/onSaveAndSend\(\)/);
 assert.match(route,/resolveServerAuth\(request\)/);
 assert.match(route,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(route,/eq\('user_id',user\.id\)/);
 assert.match(route,/sameOrigin\(request\)/);
});

test('deleting a default Service Address promotes the next address or clears canonical profile state',async()=>{
 const route=await read('app/api/user/service-addresses/route.ts');
 assert.match(route,/if\(existing\.data\.is_default\)/);
 assert.match(route,/if\(next\.data\)await setDefault\(client,user\.id,next\.data\.id\);else await syncDefault\(client,user\.id,null\)/);
 assert.match(route,/default_service_address_id:null/);
 assert.match(route,/primary_atoll_id:null/);
 assert.match(route,/primary_island_id:null/);
 assert.doesNotMatch(route,/default_island_id:null/);
 assert.doesNotMatch(route,/from\('users'\)/);
 assert.match(route,/is_active:false,is_default:false/);
});
