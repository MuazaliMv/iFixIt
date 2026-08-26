import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('phone OTP login synchronizes secure and browser sessions without redundant probes',async()=>{
 const login=await read('app/login/page.tsx');
 const route=await read('app/api/auth/login/route.ts');
 const requests=await read('app/requests/page.tsx');
 const proxy=await read('proxy.ts');

 assert.match(login,/Testing code: 9999/);
 assert.match(route,/next\.cookies\.set\(ACCESS_COOKIE/);
 assert.match(route,/next\.cookies\.set\(REFRESH_COOKIE/);
 assert.match(login,/supabase\.auth\.setSession\(\{access_token:accessToken,refresh_token:refreshToken\}\)/);
 assert.match(login,/invalidateProfileCache\(\)/);
 assert.match(requests,/supabase\.auth\.getSession\(\)/);
 assert.match(proxy,/const auth=await resolveServerAuth\(request\)/);

 const syncIndex=login.indexOf('await syncBrowserSession');
 const routeIndex=login.indexOf('await routeUser',syncIndex);
 const redundantVerifyIndex=login.indexOf("fetchWithTimeout('/api/auth/session'",syncIndex);
 assert.ok(syncIndex>=0,'browser session handoff is missing');
 assert.ok(routeIndex>syncIndex,'navigation must occur after browser session handoff');
 assert.equal(redundantVerifyIndex,-1,'login must not perform a redundant post-login server-session probe');
});

test('login restore uses profile request as the single session proof',async()=>{
 const login=await read('app/login/page.tsx');
 const effectStart=login.indexOf('useEffect(()=>');
 const submitOtpStart=login.indexOf('async function submitOtp');
 const restoreFlow=login.slice(effectStart,submitOtpStart);

 assert.match(restoreFlow,/fetchWithTimeout\('\/api\/user\/profile'/);
 assert.doesNotMatch(restoreFlow,/fetchWithTimeout\('\/api\/auth\/session'/);
});
