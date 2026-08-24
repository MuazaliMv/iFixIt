import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('provider profile resolves to the shared account profile',async()=>{
 const source=await read('app/provider/profile/page.tsx');
 assert.match(source,/redirect\('\/profile'\)/);
});

test('provider verification remains available separately',async()=>{
 const verification=await read('app/provider/verification/page.tsx');
 const profile=await read('app/profile/ProfileClient.tsx');
 assert.match(verification,/Verification Documents/);
 assert.match(profile,/\/provider\/verification/);
});

test('client sign-out events clear the server session too',async()=>{
 const source=await read('app/ServerSessionSignOutSync.tsx');
 assert.match(source,/SIGNED_OUT/);
 assert.match(source,/\/api\/auth\/logout/);
 assert.match(source,/credentials:'same-origin'/);
});
