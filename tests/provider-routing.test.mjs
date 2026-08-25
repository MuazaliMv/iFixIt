import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('provider workspace never redirects an authorised provider to the public landing page',async()=>{
 const source=await read('app/provider/useProviderMode.ts');
 assert.doesNotMatch(source,/window\.location\.href\s*=\s*['\"]\/['\"]/);
 assert.match(source,/status:'SETUP_REQUIRED'/);
 assert.match(source,/ready:true/);
});

test('provider portal access honors both provider role and approved provider entitlement',async()=>{
 const access=await read('lib/roleAccess.ts');
 const proxy=await read('proxy.ts');
 const guard=await read('app/RoleAccessGuard.tsx');
 const switcher=await read('app/GlobalModeSwitch.tsx');
 assert.match(access,/portal==='provider'\)return role==='PROVIDER'\|\|role==='ADMIN'\|\|providerApproved/);
 assert.match(proxy,/providerApproved:Boolean\(payload\?\.profile\?\.provider_approved\)/);
 assert.match(guard,/canAccessPortal\(role,'provider',providerApproved\)/);
 assert.match(switcher,/canAccessPortal\(accountRole,'provider',providerApproved\)/);
 assert.match(proxy,/Service Provider permission required/);
 assert.match(proxy,/NextResponse\.redirect\(new URL\('\/home'/);
});
