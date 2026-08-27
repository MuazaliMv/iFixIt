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
 assert.match(access,/portal==='provider'\)return role==='ADMIN'\|\|providerApproved/);
 assert.doesNotMatch(access,/portal==='provider'\)return role==='PROVIDER'/);
 assert.match(proxy,/providerApproved:Boolean\(payload\?\.profile\?\.provider_approved\)/);
 assert.match(guard,/canAccessPortal\(role,'provider',providerApproved\)/);
 assert.match(switcher,/canAccessPortal\(accountRole,'provider',providerApproved\)/);
 assert.match(proxy,/Service Provider permission required/);
 assert.match(proxy,/NextResponse\.redirect\(new URL\('\/home'/);
});

test('approved Provider entitlement controls login landing and provider profile data',async()=>{
 const login=await read('app/login/page.tsx');
 const profile=await read('app/profile/ProfileClient.tsx');
 assert.match(login,/providerApproved=Boolean\(profile\?\.provider_approved\)/);
 assert.match(login,/defaultWorkspace\(role,providerApproved\)/);
 assert.match(profile,/if\(normalized\.provider_approved\)void refreshProviderData\(\)/);
 assert.match(profile,/profile\?\.provider_approved\?<><section/);
});

test('role-protected routes fail closed and all matched APIs reject missing OTP-backed sessions',async()=>{
 const proxy=await read('proxy.ts');
 assert.match(proxy,/const apiRoute=path==='\/api'\|\|path\.startsWith\('\/api\/'\)/);
 assert.match(proxy,/if\(apiRoute\)return apiError\('OTP-verified authentication required\.',401,'OTP_LOGIN_REQUIRED'\)/);
 assert.match(proxy,/Unable to verify account permissions\.',503/);
 assert.match(proxy,/NextResponse\.redirect\(new URL\('\/home',request\.url\)\)/);
 assert.match(proxy,/api\/auth/);
 assert.match(proxy,/api\/health/);
});

test('admin and provider APIs return explicit 403 permission errors',async()=>{
 const proxy=await read('proxy.ts');
 assert.match(proxy,/Admin permission required\.',403/);
 assert.match(proxy,/Service Provider permission required\.',403/);
 assert.match(proxy,/canAccessPortal\(access\.role,'admin',access\.providerApproved\)/);
 assert.match(proxy,/canAccessPortal\(access\.role,'provider',access\.providerApproved\)/);
});
