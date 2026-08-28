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
 assert.match(route,/next\.cookies\.set\(ACCESS_COOKIE/);
 assert.match(route,/next\.cookies\.set\(REFRESH_COOKIE/);
 assert.match(login,/confirmServerSession\(\)/);
 assert.match(browserClient,/autoRefreshToken: false/);
 assert.match(browserClient,/detectSessionInUrl: false/);
 assert.match(proxy,/const auth=await resolveServerAuth\(request\)/);
 assert.match(serverAuth,/auth\/v1\/user/);
 assert.doesNotMatch(serverAuth,/request\.headers\.get\('authorization'\)/,'arbitrary bearer tokens must not become FixIt application sessions');
});

test('customer home and request actions use the authoritative server session',async()=>{
 const customer=await read('app/CustomerPortal.tsx');
 assert.match(customer,/jsonFetch\('\/api\/auth\/session'\)/);
 assert.match(customer,/session\?\.authenticated!==true/);
 assert.doesNotMatch(customer,/supabase\.auth\.getSession\(\)/,'customer portal must not use browser Supabase as auth authority');
 assert.doesNotMatch(customer,/access_token/,'customer request actions must not require a browser access token');
 assert.match(customer,/SUBMIT_REQUEST_URL='\/api\/legacy-edge\?service=submit-request'/);
 assert.match(customer,/MEDIA_URL='\/api\/legacy-edge\?service=request-media'/);
 assert.match(customer,/\.slice\(0,3\)/,'request creation must cap customer photos at three');
});

test('core provider workspaces use same-origin server-session APIs rather than browser auth',async()=>{
 for(const file of ['app/provider/useProviderMode.ts','app/provider/jobs/page.tsx','app/provider/jobs/[ticket]/page.tsx','app/provider/messages/page.tsx','app/provider/calendar/page.tsx','app/provider/subscription/page.tsx','app/provider/services/page.tsx','app/provider/onboarding/page.tsx']){
  const source=await read(file);
  assert.doesNotMatch(source,/supabase\.auth\.getSession\(\)/,`${file} still depends on browser auth`);
  assert.match(source,/credentials:'same-origin'|\/api\/legacy-edge/,`${file} is not using same-origin authenticated APIs`);
 }
});

test('legacy edge proxy authenticates with server cookies and preserves multipart content type',async()=>{
 const route=await read('app/api/legacy-edge/route.ts');
 assert.match(route,/resolveServerAuth\(request\)/);
 assert.match(route,/request\.arrayBuffer\(\)/);
 assert.match(route,/request\.headers\.get\('content-type'\)/);
 assert.match(route,/Authorization:auth\.authorization/);
 assert.match(route,/applyAuthCookies/);
});

test('browser auth events cannot destroy an authoritative server session',async()=>{
 const layout=await read('app/layout.tsx');
 const sync=await read('app/ServerSessionSignOutSync.tsx');
 assert.doesNotMatch(layout,/ServerSessionSignOutSync/,'legacy browser SIGNED_OUT events must not be mounted as a global logout authority');
 assert.match(sync,/SIGNED_OUT/);
});

test('provider permission outages do not turn valid authentication into a logout',async()=>{
 const sessionRoute=await read('app/api/auth/session/route.ts');
 assert.match(sessionRoute,/Authentication is already proven by resolveServerAuth/);
 assert.match(sessionRoute,/authenticated:true/);
 assert.match(sessionRoute,/profile_degraded:true/);
 assert.match(sessionRoute,/provider_suspended:true/);
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
});

test('post-login routing and role guard share one permission-aware resolver',async()=>{
 const login=await read('app/login/page.tsx');
 const guard=await read('app/RoleAccessGuard.tsx');
 const routing=await read('lib/authRouting.ts');
 const roles=await read('lib/roleAccess.ts');
 assert.match(login,/resolvePostLoginDestination\(profile\|\|\{\},requested,rememberedWorkspace\(\)\)/);
 assert.match(guard,/resolvePostLoginDestination\(profile\)/);
 assert.match(guard,/if\(!response\.ok\)return/);
 assert.match(routing,/isSafeInternalPath/);
 assert.match(roles,/if\(portal==='provider'\)return providerApproved&&!providerSuspended/);
});
