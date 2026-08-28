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

test('provider portal access requires approved provider entitlement and rejects suspended providers',async()=>{
 const access=await read('lib/roleAccess.ts');
 const routing=await read('lib/authRouting.ts');
 const proxy=await read('proxy.ts');
 const guard=await read('app/RoleAccessGuard.tsx');
 const session=await read('app/api/auth/session/route.ts');
 assert.match(access,/portal==='provider'\)return providerApproved&&!providerSuspended/);
 assert.doesNotMatch(access,/role==='PROVIDER'\|\|providerApproved/);
 assert.match(routing,/canAccessPortal\(role,portal,providerApproved\(profile\),providerSuspended\(profile\)\)/);
 assert.match(proxy,/providerApproved:Boolean\(payload\?\.profile\?\.provider_approved\)/);
 assert.match(proxy,/provider_onboarding_profiles\?select=onboarding_status/);
 assert.match(proxy,/status==='SUSPENDED'/);
 assert.match(proxy,/canAccessPortal\(access\.role,'provider',access\.providerApproved,providerSuspended\)/);
 assert.match(session,/provider_onboarding_profiles\?select=onboarding_status/);
 assert.match(session,/provider_suspended:providerPermission\.suspended/);
 assert.match(session,/provider_permission_verified:providerPermission\.verified/);
 assert.match(guard,/apiFetch\('\/api\/auth\/session'/);
 assert.match(guard,/canProfileAccessPortal\(profile,workspace\)/);
 assert.match(proxy,/Service Provider permission required/);
 assert.match(proxy,/Service Provider account is suspended/);
 assert.match(proxy,/NextResponse\.redirect\(new URL\('\/home'/);
});

test('role-protected routes fail closed and all matched APIs reject missing OTP-backed sessions',async()=>{
 const proxy=await read('proxy.ts');
 assert.match(proxy,/const apiRoute=path==='\/api'\|\|path\.startsWith\('\/api\/'\)/);
 assert.match(proxy,/if\(apiRoute\)return apiError\('OTP-verified authentication required\.',401,'OTP_LOGIN_REQUIRED'\)/);
 assert.match(proxy,/Unable to verify account permissions\.',503/);
 assert.match(proxy,/Unable to verify Service Provider permission\.',503/);
 assert.match(proxy,/NextResponse\.redirect\(new URL\('\/home',request\.url\)\)/);
 assert.match(proxy,/api\/auth/);
 assert.match(proxy,/api\/health/);
});

test('admin and provider APIs return explicit 403 permission errors',async()=>{
 const proxy=await read('proxy.ts');
 assert.match(proxy,/Admin permission required\.',403/);
 assert.match(proxy,/Service Provider permission required\.',403/);
 assert.match(proxy,/canAccessPortal\(access\.role,'admin',access\.providerApproved/);
 assert.match(proxy,/canAccessPortal\(access\.role,'provider',access\.providerApproved,providerSuspended\)/);
});
