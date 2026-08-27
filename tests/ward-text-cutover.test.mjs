import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

const RUNTIME_FILES=[
 'app/CustomerPortal.tsx',
 'app/components/customer/RequestProfileCompletion.tsx',
 'app/profile/ProfileClient.tsx',
 'app/profile/ServiceAddressManager.tsx',
 'app/api/user/profile/route.ts',
 'app/api/user/service-addresses/route.ts',
 'app/api/locations/catalogue/route.ts',
];

test('customer and profile runtime contracts contain no Ward FK dependency',async()=>{
 const sources=await Promise.all(RUNTIME_FILES.map(async path=>`${path}\n${await read(path)}`));
 for(const source of sources){
  assert.doesNotMatch(source,/location_units|service_location_unit_id|primary_location_unit_id|locationUnitId|LocationUnit/);
 }
});

test('profile updates cannot proxy saved-address payloads around the canonical API',async()=>{
 const source=await read('app/api/user/profile/route.ts');
 assert.match(source,/form\.delete\('serviceAddresses'\)/);
 assert.match(source,/delete body\.serviceAddresses/);
});

test('saved-address writes use the caller JWT and own-row RLS',async()=>{
 const[route,rls,privileges]=await Promise.all([
  read('app/api/user/service-addresses/route.ts'),
  read('migrations/20260827184000_service_address_authenticated_rls.sql'),
  read('migrations/20260828000000_lock_service_address_to_ward_text_contract.sql'),
 ]);
 assert.match(route,/Authorization:`Bearer \$\{token\}`/);
 assert.match(route,/SUPABASE_ANON_KEY/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY|adminClient/);
 assert.match(rls,/USING \(user_id = auth\.uid\(\)\)/);
 assert.match(rls,/WITH CHECK \(user_id = auth\.uid\(\)\)/);
 assert.match(privileges,/revoke select, insert, update on public\.user_service_addresses from authenticated/i);
 assert.match(privileges,/revoke update \(primary_location_unit_id\) on public\.auth_profiles from authenticated/i);
 assert.match(privileges,/grant update \(ward\) on public\.auth_profiles to authenticated/i);
 assert.doesNotMatch(privileges,/grant (?:select|insert|update) \([^;]*(?:service_location_unit_id|primary_location_unit_id)/i);
});

test('there is one canonical location catalogue route backed by atolls and islands',async()=>{
 const source=await read('app/api/locations/catalogue/route.ts');
 assert.match(source,/from\('atolls'\)/);
 assert.match(source,/from\('islands'\)/);
 assert.doesNotMatch(source,/location-catalog|location_units|wards/);
 await assert.rejects(access(new URL('../app/api/locations/catalog/route.ts',import.meta.url)));
});

test('Ward text migration preserves labels before any legacy column retirement',async()=>{
 const migration=await read('migrations/20260827170000_cutover_ward_to_optional_text.sql');
 assert.match(migration,/add column if not exists ward text/i);
 assert.match(migration,/set ward = nullif\(btrim\(u\.display_name\), ''\)/i);
 assert.match(migration,/Ward text backfill is incomplete/i);
 assert.match(migration,/v_address\.ward/i);
 assert.match(migration,/ward = v_next\.ward/i);
 assert.match(migration,/Deprecated compatibility column/i);
 assert.doesNotMatch(migration,/drop\s+column/i);
 assert.doesNotMatch(migration,/drop\s+table/i);
});

test('customer UI keeps Ward optional and removes payment and 3A screen copy',async()=>{
 const source=await read('app/CustomerPortal.tsx');
 assert.match(source,/Ward \/ Locality <span>Optional<\/span>/);
 assert.match(source,/ward:newAddress\.ward\.trim\(\)\|\|null/);
 assert.doesNotMatch(source,/Select a Ward|NEW SERVICE ADDRESS · 3A|payment/i);
});
