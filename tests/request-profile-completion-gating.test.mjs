import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

// Current contract: request-specific address selection must not silently replace the user's profile default.
test('Service Address send requires profile name and an explicit selected address, not phone OTP verification',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.doesNotMatch(source,/phone_confirmed_at/);
 assert.match(source,/const validContact=name\.trim\(\)\.length>=2/);
 assert.match(source,/disabled=\{saving\|\|!validContact\|\|!selectedAddress\}/);
 assert.match(source,/Choose a Service Address before continuing/);
 assert.match(source,/Add your full name in Profile before sending the request/);
 assert.match(source,/'Proceed'/);
});

test('saved Service Addresses use canonical atoll/island ids and optional Ward text',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/\/api\/user\/service-addresses/);
 assert.match(source,/service_atoll_id/);
 assert.match(source,/service_island_id/);
 assert.match(source,/ward:ward\.trim\(\)\|\|null/);
 assert.doesNotMatch(source,/service_location_unit_id/);
 assert.doesNotMatch(source,/payload\.wards/);
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
 assert.match(source,/Ward \/ Locality/);
 assert.match(source,/optional/);
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
 assert.ok(source.indexOf('<label>Ward')<source.indexOf('Next Step →'),'Ward must be shown on Step 1 before Next Step');
 assert.ok(source.indexOf('Access Instructions')>source.indexOf('Next Step →'),'Access Instructions must remain on Step 2');
});

test('Service Address Ward is optional text and never gates progression',async()=>{
 const source=await read('app/components/customer/RequestProfileCompletion.tsx');
 assert.match(source,/Ward \/ Locality/);
 assert.match(source,/setWard\(e\.target\.value\.slice\(0,120\)\)/);
 assert.match(source,/ward:ward\.trim\(\)\|\|null/);
 assert.doesNotMatch(source,/missing\.push\('Ward'\)/);
 assert.doesNotMatch(source,/service_location_unit_id|LocationUnit|wardRequired|selectedWard/);
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
 assert.match(route,/SUPABASE_ANON_KEY/);
 assert.match(route,/Authorization:`Bearer \$\{token\}`/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(route,/eq\('user_id',user\.id\)/);
 assert.match(route,/sameOrigin\(request\)/);
 assert.match(route,/city,ward,state_region/);
 assert.match(route,/ward:clean\(body\.ward\)\|\|null/);
 assert.doesNotMatch(route,/service_location_unit_id|primary_location_unit_id|location_units/);
});

test('deleting a default Service Address promotes the next address or clears canonical profile state',async()=>{
 const route=await read('app/api/user/service-addresses/route.ts');
 assert.match(route,/if\(existing\.data\.is_default\)/);
 assert.match(route,/if\(next\.data\)await setDefault\(client,user\.id,next\.data\.id\);else await syncDefault\(client,user\.id,null\)/);
 assert.match(route,/default_service_address_id:null/);
 assert.match(route,/primary_atoll_id:null/);
 assert.match(route,/primary_island_id:null/);
 assert.match(route,/ward:null/);
 assert.doesNotMatch(route,/primary_location_unit_id/);
 assert.doesNotMatch(route,/default_island_id:null/);
 assert.doesNotMatch(route,/from\('users'\)/);
 assert.match(route,/is_active:false,is_default:false/);
});
