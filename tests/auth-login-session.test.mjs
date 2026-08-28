import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('phone OTP login creates the authoritative secure application session',async()=>{
 const login=await read('app/login/page.tsx');
 const route=await read('app/api/auth/login/route.ts');
 const proxy=await read('proxy.ts');
 const serverAuth=await read('lib/serverAuth.ts');
 const browserClient=await read('lib/supabaseClient.ts');

 assert.match(login,/Testing code: 9999/);
 assert.match(route,/body:JSON\.stringify\(\{action:'login',phone,otp\}\)/);
 assert.match(route,/phone_verified_at/);
 assert.match(route,/persistVerifiedPhone\(payload\.session\.access_token,userId,phone,phoneVerifiedAt\)/);
 assert.match(route,/auth_profiles\?user_id=eq\./);
 assert.match(route,/body:JSON\.stringify\(\{phone_number:phone,phone_verified_at:phoneVerifiedAt\}\)/);
 assert.match(route,/Authorization:`Bearer \$\{accessToken\}`/);
 assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/,'OTP login must persist the verified phone through the authenticated user session and RLS, not a service-role secret');
 assert.match(route,/next\.cookies\.set\(ACCESS_COOKIE/);
 assert.match(route,/next\.cookies\.set\(REFRESH_COOKIE/);
 assert.match(login,/supabase\.auth\.setSession\(\{access_token:accessToken,refresh_token:refreshToken\}\)/);
 assert.match(login,/invalidateProfileCache\(\)/);
 assert.match(login,/confirmServerSession\(\)/);
 assert.match(browserClient,/autoRefreshToken: false/,'legacy browser auth must not rotate the server-owned refresh token');
 assert.match(browserClient,/detectSessionInUrl: false/);
 assert.match(proxy,/const auth=await resolveServerAuth\(request\)/);
 assert.match(serverAuth,/auth\/v1\/user/);
 assert.doesNotMatch(serverAuth,/hasOtpAuthenticationMethod/,'server auth must trust only OTP-issued application cookies and validate the Supabase session without a duplicate AMR gate');
 assert.doesNotMatch(serverAuth,/request\.headers\.get\('authorization'\)/,'arbitrary bearer tokens must not become FixIt application sessions');

 const confirmIndex=login.indexOf('const confirmedProfile=await confirmServerSession');
 const syncIndex=login.indexOf('await syncBrowserSession',confirmIndex);
 const routeIndex=login.indexOf('await routeUser',syncIndex);
 assert.ok(confirmIndex>=0,'secure server session confirmation is missing');
 assert.ok(syncIndex>confirmIndex,'legacy browser session handoff must happen only after server confirmation');
 assert.ok(routeIndex>syncIndex,'navigation must happen only after server confirmation and browser handoff');
});

test('server refresh is single-flight so parallel protected requests cannot rotate the same refresh token twice',async()=>{
 const serverAuth=await read('lib/serverAuth.ts');
 assert.match(serverAuth,/const refreshInFlight=new Map/);
 assert.match(serverAuth,/const refreshCache=new Map/);
 assert.match(serverAuth,/const existing=refreshInFlight\.get\(refreshToken\)/);
 assert.match(serverAuth,/if\(existing\)return existing/);
 assert.match(serverAuth,/refreshInFlight\.set\(refreshToken,promise\)/);
 assert.match(serverAuth,/refreshCache\.set\(refreshToken/);
 assert.match(serverAuth,/REFRESH_CACHE_MS=10_000/);
});

test('legacy browser sessions cannot be promoted into secure application cookies',async()=>{
 const syncRoute=await read('app/api/auth/session/sync/route.ts');
 const apiClient=await read('lib/apiClient.ts');

 assert.match(syncRoute,/OTP_LOGIN_REQUIRED/);
 assert.match(syncRoute,/status:410/);
 assert.doesNotMatch(syncRoute,/cookies\.set/);
 assert.doesNotMatch(apiClient,/syncLegacyBrowserSession/);
 assert.doesNotMatch(apiClient,/supabase\.auth\.getSession\(\)/);
});

test('global proxy protects all application routes and APIs except explicit login and health surfaces',async()=>{
 const proxy=await read('proxy.ts');

 assert.match(proxy,/OTP-verified authentication required\./);
 assert.match(proxy,/OTP_LOGIN_REQUIRED/);
 assert.match(proxy,/api\/health/);
 assert.match(proxy,/api\/auth/);
 assert.match(proxy,/login/);
 assert.match(proxy,/Everything else is authenticated globally/);
});

test('login restore and post-OTP navigation use the authoritative server session',async()=>{
 const login=await read('app/login/page.tsx');
 const effectStart=login.indexOf('useEffect(()=>');
 const submitOtpStart=login.indexOf('async function submitOtp');
 const restoreFlow=login.slice(effectStart,submitOtpStart);

 assert.match(restoreFlow,/fetchWithTimeout\('\/api\/auth\/session'/);
 assert.doesNotMatch(restoreFlow,/fetchWithTimeout\('\/api\/user\/profile'/);
 assert.match(login,/async function confirmServerSession/);
 assert.match(login,/Your secure login session was not saved/);
});
