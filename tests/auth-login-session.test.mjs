import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('phone OTP login synchronizes secure and browser sessions before redirect',async()=>{
 const login=await read('app/login/page.tsx');
 const route=await read('app/api/auth/login/route.ts');
 const requests=await read('app/requests/page.tsx');

 assert.match(login,/Testing code: 9999/);
 assert.match(route,/next\.cookies\.set\(ACCESS_COOKIE/);
 assert.match(route,/next\.cookies\.set\(REFRESH_COOKIE/);
 assert.match(login,/supabase\.auth\.setSession\(\{access_token:accessToken,refresh_token:refreshToken\}\)/);
 assert.match(login,/invalidateProfileCache\(\)/);
 assert.match(login,/\/api\/auth\/session/);
 assert.match(requests,/supabase\.auth\.getSession\(\)/);

 const syncIndex=login.indexOf('await syncBrowserSession');
 const verifyIndex=login.indexOf("fetchWithTimeout('/api/auth/session'",syncIndex);
 const routeIndex=login.indexOf('await routeUser',syncIndex);
 assert.ok(syncIndex>=0,'browser session handoff is missing');
 assert.ok(verifyIndex>syncIndex,'server session must be verified after browser session handoff');
 assert.ok(routeIndex>verifyIndex,'navigation must occur only after both sessions are ready');
});
